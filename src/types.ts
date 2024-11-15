import type { PluginManifest } from "obsidian";

export interface UsherSettings {
	ignoreFilePatterns: string;
	nonMergeJsonPatterns: string;
	nonAutomatic: string[];
}

export const DEFAULT_SETTINGS: UsherSettings = {
	ignoreFilePatterns: "/node_modules$|[]|/.git$",
	nonMergeJsonPatterns: "bookmark.json$",
	nonAutomatic: [],
};

export type FileInfo = {
	name: string;
	fullPath: string;
	mtime: number;
	ctime: number;
};

export type ManifestInfo = {
	name: string;
	description: string;
	version: string;
};

export type CategoryType = "plugin" | "theme" | "snippet" | "setting" | "unknown";
export type ItemInfo = {
	category: CategoryType;
	basePath: string;
	key: string;
	name: string;
	device: string;
	hasManifest: boolean;
	manifest?: PluginManifest;
	files: {
		[group: string]: FileInfo[];
	};
};

export const VIEW_TYPE = "usher-view";

export type EachSummaryInfo = {
	maxMTime: number;
	version: string;
	maxMTimeIfNotMatched: number;
	maxMTimeConfig: number;
};
export type SummaryInfo = {
	total: EachSummaryInfo;
	newer: EachSummaryInfo;
};
