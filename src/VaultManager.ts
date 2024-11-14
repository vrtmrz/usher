import { Notice, type App, type PluginManifest } from "obsidian";
import type UsherPlugin from "./main";
import type { CategoryType, FileInfo, ItemInfo } from "./types";
import { eventHub } from "./events";
import { setInfoMap, setNameMap } from "./runestore.svelte";
import { mergeObject } from "./fileUtil";

// Globally accessible, but updated by the main
export let vaultManager: VaultManager;
export function setVaultManager(manager: VaultManager) {
	vaultManager = manager;
}

export class VaultManager {
	app: App;
	plugin: UsherPlugin;
	ignoreRegExps: RegExp[] = [];
	nonMergeJsonPatterns: RegExp[] = [];

	constructor(app: App, plugin: UsherPlugin) {
		this.app = app;
		this.plugin = plugin;
	}

	onload() {
		eventHub.on("update-store", this.updateStore.bind(this));
		eventHub.on("setting-change", this.reloadSetting.bind(this));
		this.reloadSetting();
	}
	onUnload() {

	}
	reloadSetting() {
		this.ignoreRegExps = this.plugin.settings.ignoreFilePatterns.split("|[]|").map((e) => new RegExp(e, "ig"));
		this.nonMergeJsonPatterns = this.plugin.settings.nonMergeJsonPatterns.split("|[]|").map((e) => new RegExp(e, "ig"));
	}



	getFileGroup(folder: string): {
		category: CategoryType;
		key: string;
		hasManifest: boolean;
		basePath: string;
		filePath: string;
		fileCategory: string;
	} {
		const folderParts = folder.split("/");
		const base = folderParts[0];
		const key = folderParts[1];
		if (base === "plugins" && folderParts.length > 2) {
			const file = folderParts[2];
			let fileCategory = "etc";
			if (file == "main.js" || file == "manifest.json" || file == "styles.css") {
				fileCategory = "main";
			} else if (file == "data.json") {
				fileCategory = "data";
			} else {
				fileCategory = "etc";
			}
			return {
				category: "plugin", key: key, hasManifest: true, basePath: folderParts.slice(0, 2).join("/")
				, filePath: folderParts.slice(2).join("/"), fileCategory
			};
		}
		if (base === "themes" && folderParts.length > 2) {
			return {
				category: "theme", key: key, hasManifest: true, basePath: folderParts.slice(0, 2).join("/")
				, filePath: folderParts.slice(2).join("/"), fileCategory: "theme"

			};
		}
		if (base == "snippets" && folderParts.length === 2) {
			// Do not include snippets that are in subfolders
			return {
				category: "snippet", key: folderParts.slice(1).join("/"), hasManifest: false, basePath: folderParts.slice(0, 1).join("/")
				, filePath: folderParts.slice(1).join("/"), fileCategory: "snippet"

			};
		}
		if (folderParts.length === 1 && folder.endsWith(".json")) {
			return {
				category: "setting", key: folder, hasManifest: false, basePath: ""
				, filePath: folder, fileCategory: "setting"

			};
		}
		return {
			category: "unknown", key: folder, hasManifest: false, basePath: "", filePath: folder,
			fileCategory: "unknown"
		};
	}

	async getAllFiles(root: string): Promise<string[]> {
		const dirInfo = await this.app.vault.adapter.list(root);
		const files = dirInfo.files;
		const folders = dirInfo.folders;
		const allFiles = [];
		for (const folder of folders) {
			if (this.ignoreRegExps.some((regExp) => regExp.test(folder))) {
				continue;
			}
			const folderFiles = (await this.getAllFiles(folder)).filter((file) => {
				return this.ignoreRegExps.every((regExp) => !regExp.test(file));
			});
			allFiles.push(...folderFiles);
		}
		const filesToInclude = files.filter((file) => {
			return this.ignoreRegExps.every((regExp) => !regExp.test(file));
		});
		allFiles.push(...filesToInclude);
		return allFiles;
	}

	async getAllItems() {
		const devices = await this.getAllDevices();
		const allFiles = [];
		for (const device of devices) {
			const deviceFiles = await this.getAllFiles(device);
			allFiles.push(...deviceFiles);
		}
		return allFiles;
	}

	async loadTextFile(path: string) {
		try {
			const file = await this.app.vault.adapter.read(path);
			return file;
		} catch (ex) {
			console.error(ex);
			return false;
		}
	}

	async getItemsByDevice() {
		const items = await this.getAllItems();
		const nameMap = new Map<string, string>();
		const itemInfoMap = new Map<string, ItemInfo>();

		// const itemsByDevice = new Map<string, Map<string, Set<string>>>();
		for (const pathItem of items) {
			const [device, ...path] = pathItem.split("/");
			const info = this.getFileGroup(path.join("/"));
			const bastPath = [device, info.key].join("/"); // This is also the key.
			let item: ItemInfo;
			if (!itemInfoMap.has(bastPath)) {
				item = {
					category: info.category,
					basePath: [device, info.basePath].join("/"),
					key: info.key,
					name: info.key, // once.
					device: device,
					hasManifest: info.hasManifest,
					files: {}
				};
			} else {
				item = itemInfoMap.get(bastPath)!;
			}
			item.files[info.fileCategory] = item.files[info.fileCategory] || [];
			const fi = { name: info.filePath, fullPath: pathItem, mtime: 0, ctime: 0 };

			try {
				const stat = await this.app.vault.adapter.stat(pathItem);
				if (stat) {
					fi.mtime = stat.mtime;
					fi.ctime = stat.ctime;
				}
			} catch (ex) {
				console.error(ex);
			}
			item.files[info.fileCategory].push(fi);


			if (info.hasManifest && pathItem.endsWith("manifest.json")) {
				const manifestPath = pathItem;
				const manifest = await this.loadTextFile(manifestPath);
				if (manifest) {
					try {
						item.manifest = JSON.parse(manifest) as PluginManifest;
						item.name = item.manifest.name;
						// This is commonly used to list the plugins.
						nameMap.set(item.key, item.manifest.name);
					} catch (ex) {
						//TODO:Message
						console.error(ex);
					}
				}
			}
			itemInfoMap.set(bastPath, item);
		}
		return { itemInfoMap, nameMap };

	}

	async updateStore() {
		// const devicesList = await this.getAllDevices();
		this.plugin.showNotice(`Reloading...`, "updating-progress");
		try {
			const info = await this.getItemsByDevice();
			setInfoMap(info.itemInfoMap);
			setNameMap(info.nameMap);
			return info;
		} finally {
			this.plugin.showNotice(`Done!`, "updating-progress");
		}
	}

	async getAllDevices() {
		const folders = (await this.app.vault.adapter.list("/")).folders;
		const hiddenFolders = folders.filter((folder) => folder.startsWith(".")).filter(e => !e.startsWith(".trash"));
		return hiddenFolders;
	}

	async readFile(f: FileInfo) {
		try {
			return this.app.vault.adapter.readBinary(f.fullPath);
		} catch (ex) {
			console.error(ex);
			return false;
		}
	}

	async mkdirRecursive(path: string) {
		const parts = path.split("/");
		parts.pop(); // Remove the filename.
		let current = "";
		for (const part of parts) {
			current += "/" + part;
			try {
				if (!await this.app.vault.adapter.exists(current)) {
					await this.app.vault.adapter.mkdir(current);
				}
			} catch (ex) {
				console.error(ex);
				new Notice(`Failed to create directory ${current}`);
			}
		}
	}

	async mergeJsonFile(from: string, to: string) {
		const fromContent = await this.loadTextFile(from) || "{}";
		const toContent = await this.loadTextFile(to) || "{}";
		try {
			const fromJson = JSON.parse(fromContent);
			const toJson = JSON.parse(toContent);
			const merged = mergeObject(toJson, fromJson);
			await this.app.vault.adapter.write(to, JSON.stringify(merged));
			return true;
		} catch (ex) {
			console.error(ex);
			new Notice(`Failed to merge file ${from} to ${to}`);
			return false;
		}
	}

	async copyFile(from: string, to: string) {
		try {
			await this.mkdirRecursive(to);
			if (await this.app.vault.adapter.exists(to)) {
				await this.app.vault.adapter.trashLocal(to);
			}
			return this.app.vault.adapter.copy(from, to);
		} catch (ex) {
			new Notice(`Failed to copy file ${from} to ${to}`);
			console.error(ex);
			return false;
		}
	}
	async copyDir(from: string, to: string) {
		this.plugin.showNotice(`Copying ${from} to ${to}`, "config-duplicate-progress");
		const files = (await this.app.vault.adapter.list(from));
		try {
			if (!await this.app.vault.adapter.exists(to)) {
				await this.app.vault.adapter.mkdir(to);
			}
		} catch (ex) {
			new Notice(`Failed to create directory ${to}`);
			console.error(ex);
		}
		for (const fileSrc of files.files) {
			const file = fileSrc.slice(from.length + 1);
			if (this.ignoreRegExps.some((regExp) => regExp.test(from + "/" + file))) {
				continue;
			}
			try {
				if (await this.app.vault.adapter.exists(to + "/" + file)) {
					console.log("File exists", to + "/" + file);
					new Notice(`File already exists ${to + "/" + file}, moving to trash once`);
					await this.app.vault.adapter.trashLocal(to + "/" + file);
				}
			} catch (ex) {
				new Notice(`Failed to check and prepare ${to + "/" + file}`);
				console.error(ex);
			}
			try {
				await this.copyFile(from + "/" + file, to + "/" + file);
			} catch (ex) {
				console.error(ex);
				new Notice(`Failed to copy file ${from + "/" + file} to ${to + "/" + file}`);
			}
		}
		for (const folderSrc of files.folders) {
			const folder = folderSrc.slice(from.length + 1);
			try {
				if (this.ignoreRegExps.some((regExp) => regExp.test(from + "/" + folder))) {
					continue;
				}
				await this.copyDir(from + "/" + folder, to + "/" + folder);
			} catch (ex) {
				console.error(ex);
				new Notice(`Failed to copy folder ${from + "/" + folder} to ${to + "/" + folder}`);
			}
		}
	}
	deleteFolder(folder: string) {
		return this.app.vault.adapter.trashLocal(folder);
	}
}
