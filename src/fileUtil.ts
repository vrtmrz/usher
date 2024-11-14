import { unique } from "octagonal-wheels/collection";
import type { FileInfo } from "./types";

export function timeDiffToHumanReadable(timeDiffX: number) {
	const timeDiff = Math.abs(timeDiffX);
	const oldNew = timeDiffX < 0 ? "+" : "-";
	let diff = timeDiff;
	const days = Math.floor(diff / (1000 * 60 * 60 * 24));
	diff -= days * (1000 * 60 * 60 * 24);
	const hours = Math.floor(diff / (1000 * 60 * 60));
	diff -= hours * (1000 * 60 * 60);
	const minutes = Math.floor(diff / (1000 * 60));
	diff -= minutes * (1000 * 60);
	const seconds = Math.floor(diff / 1000);

	if (days > 0) return `${oldNew}${days}d${hours}h`;
	if (hours > 0) return `${oldNew}${hours}h${minutes}m`;
	if (minutes > 0) return `${oldNew}${minutes}m${seconds}s`;
	if (seconds == 0) return "±0";
	return `${oldNew}${seconds}s`;

}


import { vaultManager } from "./VaultManager";
import { isObjectDifferent } from "octagonal-wheels/object";

export type CompareResult = {
	fileCountStatus: "same" | "more" | "less";
	modifiedStatus: "same" | "allOlder" | "allNewer" | "mixed";
	contentStatus: "same" | "different";
	largestModifiedDifference: number;
	averageModifiedDifference: number;
	canMerge: boolean;
	JsonMergeResult: "not-json" | "same" | "different";
};
export function subtractTimeInLimitedResolution(time1: number, time2: number) {
	const time1x = (~~(time1 / 2000)) * 2000;
	const time2x = (~~(time2 / 2000)) * 2000;
	return time1x - time2x;
}


export function mergeObject(
	objA: object | Record<string | number | symbol, unknown> | [],
	objB: object | Record<string | number | symbol, unknown> | []
) {
	const newEntries = Object.entries(objB);
	const ret = { ...objA } as Record<string | number | symbol, unknown>;
	if (typeof objA !== typeof objB || Array.isArray(objA) !== Array.isArray(objB)) {
		return objB;
	}

	for (const [key, v] of newEntries) {
		if (key in ret) {
			const value = ret[key];
			if (typeof v !== typeof value || Array.isArray(v) !== Array.isArray(value)) {
				//if type is not match, replace completely.
				ret[key] = v;
			} else if (v === null || value === null) {
				ret[key] = v;
			} else {
				if (typeof v == "object" && typeof value == "object" && !Array.isArray(v) && !Array.isArray(value)) {
					ret[key] = mergeObject(v, value);
				} else if (
					typeof v == "object" &&
					typeof value == "object" &&
					Array.isArray(v) &&
					Array.isArray(value)
				) {
					ret[key] = [...new Set([...v, ...value])];
				} else {
					ret[key] = v;
				}
			}
		} else {
			ret[key] = v;
		}
	}
	const retSorted = Object.fromEntries(Object.entries(ret).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)));
	if (Array.isArray(objA) && Array.isArray(objB)) {
		return Object.values(retSorted);
	}
	return retSorted;
}
export async function compareFilesModified(file1: FileInfo[], file2: FileInfo[]) {
	const allBaseNames = unique([...file1.map(f => f.name), ...file2.map(f => f.name)]);
	const result: CompareResult = {
		fileCountStatus: "same",
		modifiedStatus: "same",
		contentStatus: "same",
		largestModifiedDifference: 0,
		averageModifiedDifference: 0,
		canMerge: false,
		JsonMergeResult: "not-json",
	};
	const modifiedDiffs: number[] = [];
	if (file1.length !== file2.length) {
		result.fileCountStatus = file1.length > file2.length ? "more" : "less";
	}
	const comparable = allBaseNames.length == 1 && allBaseNames[0].endsWith(".json");
	for (const baseName of allBaseNames) {
		console.log(`Checking ${baseName}`);
		const f1 = file1.find(f => f.name === baseName);
		const f2 = file2.find(f => f.name === baseName);
		if (f1 && f2) {

			const diff = subtractTimeInLimitedResolution(f1.mtime, f2.mtime);
			modifiedDiffs.push(diff);
			const content1 = await vaultManager.readFile(f1);
			const content2 = await vaultManager.readFile(f2);
			if (content1 === false || content2 === false) {
				console.log("Some file is not readable.");
				result.contentStatus = "different";
			} else {
				if (content1.byteLength !== content2.byteLength) {
					result.contentStatus = "different";
					result.canMerge = comparable;
				} else {
					// Very fast comparison.
					if (indexedDB.cmp(content1, content2) != 0) {
						result.contentStatus = "different";
						result.canMerge = comparable;
					}
				}
				if (f1.name.endsWith(".json")) {
					if (vaultManager.nonMergeJsonPatterns.some(p => p.test(f1.name)) || vaultManager.nonMergeJsonPatterns.some(p => p.test(f2.name))) {
						result.JsonMergeResult = "not-json";
					} else {
						try {
							const json1 = JSON.parse(new TextDecoder().decode(content1));
							const json2 = JSON.parse(new TextDecoder().decode(content2));
							if (isObjectDifferent(json1, json2)) {
								result.contentStatus = "different";
								result.canMerge = comparable;
							}
							const mergedObject = mergeObject(json1, json2);
							if (!isObjectDifferent(json1, mergedObject)) {
								result.JsonMergeResult = "same";
							} else {
								result.JsonMergeResult = "different";
							}
						} catch (ex) {
							console.error(ex);
							result.contentStatus = "different";
							result.JsonMergeResult = "different";
							result.canMerge = false;
						}
					}
				}
			}
		}
	}
	if (modifiedDiffs.every(d => d === 0)) {
		result.modifiedStatus = "same";
	} else {
		result.modifiedStatus = modifiedDiffs.every(d => d > 0) ? "allNewer" : modifiedDiffs.every(d => d < 0) ? "allOlder" : "mixed";
	}
	const k = Object.fromEntries(modifiedDiffs.map(d => [Math.abs(d), d]));
	const maxDiff = Math.max(...modifiedDiffs.map(d => Math.abs(d)));
	result.largestModifiedDifference = k[maxDiff];
	result.averageModifiedDifference = modifiedDiffs.reduce((a, b) => a + b, 0) / modifiedDiffs.length;
	return result;
}
