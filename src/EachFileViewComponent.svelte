<script lang="ts">
	import type { FileInfo, ItemInfo, SummaryInfo } from "./types";
	import { unique } from "octagonal-wheels/collection";

	import {
		compareFilesModified,
		subtractTimeInLimitedResolution,
		timeDiffToHumanReadable,
		type CompareResult,
	} from "./fileUtil";
	import { getContext, onMount } from "svelte";
	import type { Writable } from "svelte/store";
	import { thisDeviceDir, selectedItems } from "./runestore.svelte";
	import { eventHub } from "./events";
	import { notice } from "octagonal-wheels/common/logger";
	import { Notice } from "obsidian";
	import { vaultManager } from "./VaultManager";
	import { normalize } from "path";

	interface Props {
		key: string;
		items: ItemInfo[];
		fileCategory: string;
		file?: string;
		hideHeader?: boolean;
		targetDevice?: string;
		devices: string[];
		deviceCompareInfo: Record<string, SummaryInfo>;
	}
	let {
		key,
		items,
		file,
		fileCategory,
		hideHeader,
		targetDevice: targetDevice,
		devices,
		deviceCompareInfo = $bindable({}),
	}: Props = $props();

	const thisDevice = $derived(thisDeviceDir);

	// let selectedDevice = getContext("selectedDevice");
	let selectedDevice = $state("");
	const selectedDeviceStore = (
		getContext("getSelectedDevice") as () => Writable<string>
	)();
	selectedDeviceStore.subscribe((val) => {
		if (val != selectedDevice) {
			selectedDevice = val;
		}
	});
	$effect(() => {
		selectedDeviceStore.set(selectedDevice);
	});

	const thisItem = $derived.by(() => {
		return items.find((e) => e.device == thisDevice);
	});
	const remoteItem = $derived.by(() => {
		return items.find((e) => e.device == targetDevice);
	});

	const thisFiles = $derived.by(() => {
		if (!thisItem) {
			return false;
		}
		const X = thisItem.files[fileCategory] ?? false;
		if (!X) {
			return false;
		}
		if (file) {
			const filtered = X.find((e) => e.name == file);
			if (filtered) {
				return [filtered];
			}
			return false;
		}
		return X;
	});
	const remoteFiles = $derived.by(() => {
		if (!remoteItem) {
			return false;
		}
		const X = remoteItem.files[fileCategory] ?? false;
		if (!X) {
			return false;
		}
		if (file) {
			const filtered = X.find((e) => e.name == file);
			if (filtered) {
				return [filtered];
			}
			return false;
		}
		return X;
	});
	const allFileNames = $derived.by(() => {
		return unique([
			...(thisFiles || []).map((e) => e.name),
			...(remoteFiles || []).map((e) => e.name),
		]);
	});
	const singleFileMode = $derived.by(() => {
		return file && allFileNames.length == 1 ? true : false;
	});

	const compareResultTask = $derived.by(() => {
		if (thisFiles === false || remoteFiles === false) {
			return false;
		}
		const result = compareFilesModified(thisFiles, remoteFiles);
		return result;
	});

	let compareResult = $state<CompareResult | false>(false);
	$effect(() => {
		if (compareResultTask === false) return;
		compareResultTask.then((result) => {
			compareResult = result;
		});
	});
	const MARK_CONTENT = "📄";
	const MARK_TIMESTAMP = "📅";
	const MARK_VERSION = "🏷️";
	const MARK_FILES = "📚";
	const MARK_JSON = "⚙️";
	const MARK_EXISTENCE_ONLY_LOCAL = "🌗";
	const MARK_EXISTENCE_ONLY_REMOTE = "🌓";

	const label_version = $derived.by(() => {
		if (file) {
			return "";
		}
		if (!thisItem || !remoteItem) {
			return "";
		}
		const versionStrThis = thisItem.manifest?.version || "";
		const versionStrRemote = remoteItem.manifest?.version || "";
		const symbol = obtainSymbol(versionStrThis, versionStrRemote);
		return `${symbol}${MARK_VERSION} ${versionStrThis} ${symbol} ${versionStrRemote}`;
	});
	const label_only_this_device = $derived.by(() => {
		if (devices.length == 0) {
			return `=${MARK_EXISTENCE_ONLY_LOCAL}Only in this device`;
		}
		return "";
	});
	const label_only_remote_device = $derived.by(() => {
		if (thisFiles === false && remoteFiles) {
			return `<${MARK_EXISTENCE_ONLY_REMOTE}Only in remote device`;
		}
		return "";
	});

	const label_content = $derived.by(() => {
		if (remoteFiles === false) return "";
		if (compareResult === false) return "";
		if (compareResult.contentStatus == "same")
			return `=${MARK_CONTENT} SAME`;
		if (compareResult.contentStatus == "different")
			return `<${MARK_CONTENT} NOT MATCHED`;
		return "";
	});

	const label_count = $derived.by(() => {
		if (thisFiles === false || remoteFiles === false) return "";
		if (thisFiles.length == 0 && remoteFiles.length == 0) return "";
		if (singleFileMode) {
			return "";
		}
		const symbol = obtainSymbol(thisFiles.length, remoteFiles.length);
		return `${symbol}${MARK_FILES} ${thisFiles.length} ${symbol} ${remoteFiles.length}`;
	});

	function obtainSymbolFromDiff(diff: number) {
		if (diff == 0) return "=";
		if (diff > 0) return ">";
		if (diff < 0) return "<";
	}

	function obtainSymbol<T extends number | string>(numberA: T, numberB: T) {
		if (typeof numberA == "string" && typeof numberB == "string") {
			return obtainSymbolFromDiff(
				numberA.localeCompare(numberB, undefined, { numeric: true }),
			);
		}
		return obtainSymbolFromDiff(Number(numberA) - Number(numberB));
	}

	function createTimestampLabel(timestampA: number, timestampB: number) {
		const timeStampHRA =
			timestampA == 0 ? "" : new Date(timestampA).toLocaleString();
		const timeStampHRB =
			timestampB == 0 ? "" : new Date(timestampB).toLocaleString();

		const symbol = obtainSymbol(timestampA, timestampB);
		if (timeStampHRA == "" || timeStampHRB == "") {
			return `${symbol}${MARK_TIMESTAMP} ${timeStampHRA} ${symbol} ${timeStampHRB}`;
		}
		const diff = subtractTimeInLimitedResolution(timestampA, timestampB);
		const hrDiff = timeDiffToHumanReadable(diff);

		return `${symbol}${MARK_TIMESTAMP} ${timeStampHRA} ${symbol} ${timeStampHRB} (${hrDiff})`;
	}

	const label_timestamp = $derived.by(() => {
		const remoteFilesToCompare = remoteFiles || [{ mtime: 0 }];
		const thisFilesToCompare = thisFiles || [{ mtime: 0 }];
		if (!targetDevice) {
			return {
				single: "",
				average: "",
				max: "",
				comment: "",
			};
		}
		if (singleFileMode) {
			return {
				single: createTimestampLabel(
					thisFilesToCompare[0].mtime,
					remoteFilesToCompare[0].mtime,
				),
				average: "",
				max: "",
				comment: "",
			};
		}
		const avgMtime =
			thisFilesToCompare.map((e) => e.mtime).reduce((a, b) => a + b, 0) /
			thisFilesToCompare.length;
		const avgMtimeRemote =
			remoteFilesToCompare
				.map((e) => e.mtime)
				.reduce((a, b) => a + b, 0) / remoteFilesToCompare.length;
		const maxMtime = Math.max(...thisFilesToCompare.map((e) => e.mtime));
		const maxMtimeRemote = Math.max(
			...remoteFilesToCompare.map((e) => e.mtime),
		);
		if (maxMtime == avgMtime) {
			return {
				single: "",
				average: `${createTimestampLabel(avgMtime, avgMtimeRemote)} in avg.`,
				comment: "",
				max: "",
			};
		}
		return {
			single: "",
			average: `${createTimestampLabel(avgMtime, avgMtimeRemote)} in avg.`,
			max: `${createTimestampLabel(maxMtime, maxMtimeRemote)} in max.`,
			comment: "",
		};
	});
	const label_json = $derived.by(() => {
		if (thisFiles === false || remoteFiles === false) return "";
		if (!singleFileMode && fileCategory != "data") {
			return "";
		}
		if (compareResult == false) return "";
		if (compareResult.JsonMergeResult == "not-json") {
			return ``;
		}
		if (compareResult.JsonMergeResult == "same") {
			return `=${MARK_JSON} Merged JSON is the same`;
		}
		if (compareResult.JsonMergeResult == "different") {
			return `<${MARK_JSON} Merged JSON is different`;
		}
		return "";
	});

	$effect(() => {
		const maxMtimeRemote =
			remoteFiles === false
				? 0
				: Math.max(...(remoteFiles?.map((e) => e.mtime) || [0]));
		const remoteVersion = remoteItem?.manifest?.version || "";
		const maxMTimeLocal =
			thisFiles === false
				? 0
				: Math.max(...(thisFiles?.map((e) => e.mtime) || [0]));
		const thisVersion = thisItem?.manifest?.version || "";
		const isJson = fileCategory == "data" || fileCategory == "config";
		const contentStatus =
			compareResult == false ? "" : compareResult.contentStatus;
		if (targetDevice) {
			if (!deviceCompareInfo[targetDevice]) {
				deviceCompareInfo[targetDevice] = {
					total: {
						maxMTime: maxMtimeRemote,
						version: remoteVersion,
						maxMTimeIfNotMatched:
							contentStatus != "same" ? maxMtimeRemote : 0,
						maxMTimeConfig: isJson ? maxMtimeRemote : 0,
					},
					newer: {
						maxMTime: 0,
						maxMTimeIfNotMatched: 0,
						version: "",
						maxMTimeConfig: 0,
					},
				};
			}
			if (obtainSymbol(maxMTimeLocal, maxMtimeRemote) == "<") {
				deviceCompareInfo[targetDevice].newer.maxMTime = maxMtimeRemote;
			} else {
				deviceCompareInfo[targetDevice].newer.maxMTime = 0;
			}
			if (obtainSymbol(thisVersion, remoteVersion) == "<") {
				deviceCompareInfo[targetDevice].newer.version = remoteVersion;
			} else {
				deviceCompareInfo[targetDevice].newer.version = "";
			}
			if (contentStatus != "same") {
				deviceCompareInfo[targetDevice].newer.maxMTimeIfNotMatched =
					maxMtimeRemote;
			} else {
				deviceCompareInfo[targetDevice].newer.maxMTimeIfNotMatched = 0;
			}
			if (
				isJson &&
				compareResult &&
				compareResult.JsonMergeResult == "different"
			) {
				deviceCompareInfo[targetDevice].newer.maxMTimeConfig =
					maxMtimeRemote;
			} else {
				deviceCompareInfo[targetDevice].newer.maxMTimeConfig = 0;
			}
		}
	});
	const isSelected = $derived($selectedItems.has(key) ? "selected" : "");

	onMount(() => {
		const off = eventHub.onEvent("apply-selected", async () => {
			if (selectedDevice == targetDevice) {
				if (!remoteFiles || !remoteItem) {
					return;
				}
				const remoteBase = remoteItem.device;
				const line1 = `Applying ${remoteItem.name} (${remoteFiles.length} files)`;
				const notify = new Notice(`${line1}`, 0);
				try {
					let copied = 0;
					for (const item of remoteFiles) {
						const copyFrom = item.fullPath;
						const copyTo =
							thisDeviceDir +
							copyFrom.substring(remoteBase.length);
						try {
							if (
								compareResult &&
								compareResult.JsonMergeResult == "different"
							) {
								if (
									!(await vaultManager.mergeJsonFile(
										copyFrom,
										copyTo,
									))
								) {
									await vaultManager.copyFile(
										copyFrom,
										copyTo,
									);
								}
								// Normal files or merge-failed JSON file will be simply copied.
							} else {
								await vaultManager.copyFile(copyFrom, copyTo);
							}
							copied++;
							notify.setMessage(
								`${line1}\n${item.name}\nProcessed ${copied}/${remoteFiles.length}`,
							);
						} catch (e) {
							new Notice(`Failed to copy ${item.name}`);
						}
					}
				} finally {
					notify.setMessage(`${line1} Done.`);
					setTimeout(() => notify.hide(), 5000);
				}
			} else {
			}
		});
		return () => {
			off();
		};
	});
</script>

<!-- <span class="file-row"> -->
{#snippet renderChip(chip: string)}
	{@const symbol = chip[0]}
	{@const symbolStyle =
		symbol == "=" ? "same" : symbol == "<" ? "new" : "old"}
	{@const content = chip.slice(1)}
	<span class="chip {symbolStyle}">{content}</span>
{/snippet}
{#snippet result()}
	<span class="result">
		{@render renderChip(label_only_this_device)}
		{@render renderChip(label_only_remote_device)}
		{@render renderChip(label_version)}
		{@render renderChip(label_timestamp.comment)}
		{@render renderChip(label_timestamp.single)}
		{@render renderChip(label_timestamp.average)}
		{@render renderChip(label_timestamp.max)}
		{@render renderChip(label_count)}
		{@render renderChip(label_content)}
		{@render renderChip(label_json)}
	</span>
{/snippet}

<tr class={`tr-each-file ${isSelected}`}>
	<th class="col-name">
		<div class="filename">
			{#if !hideHeader && file}
				{file}
			{/if}
		</div>
	</th>

	<td class="col-selector">
		<label class="device">
			<input
				type="radio"
				bind:group={selectedDevice}
				value={targetDevice}
			/>
			{targetDevice}
		</label>
	</td>
	<td class="col-result">
		{@render result()}
	</td>

	<td class="col-buttons"> </td>
	<td class="col-spacer">&nbsp;</td>
</tr>

<style>
	th {
		text-align: left;
	}
	.file-row {
		display: flex;
		flex-direction: row;
		justify-content: flex-start;
		align-items: center;
	}

	.result {
		display: inline-flex;
		flex-direction: column;
		justify-content: center;
		align-items: flex-start;
		margin-right: auto;
	}
	.spacer {
		flex-grow: 1;
		display: inline-flex;
	}

	.chip {
		display: inline-block;
		border-radius: 2px;
		font-size: 0.8em;
		padding: 0 4px;
		margin: 0 2px;
		border: 1px solid var(--tag-color);
		border-radius: var(--radius-m);
	}
	.chip.new {
		background-color: var(--tag-background);
		color: var(--text-muted);
	}
	.chip.old {
		color: var(--tag-color);
	}
	.chip.same {
		color: var(--tag-color);
	}
	.chip:empty {
		display: none;
	}
	.chip:not(:empty)::before {
		min-width: 1.8em;
		display: inline-block;
	}
	.filename {
		max-width: 10em;
		word-break: break-all;
		overflow: auto;
	}

	.buttons {
		display: flex;
		flex-direction: row;
	}
	.buttons button {
		margin-left: 8px;
		min-width: 3em;
	}
	.col-name {
		width: fit-content;
	}
	.col-result {
		width: fit-content;
	}
	.col-selector {
		width: fit-content;
	}
	.col-buttons {
		width: fit-content;
	}
	.col-spacer {
		width: auto;
	}

	input:disabled {
		background-color: var(--background-secondary);
		color: var(--text-muted);
	}
</style>
