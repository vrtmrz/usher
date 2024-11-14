import { Notice, Plugin, type WorkspaceLeaf } from 'obsidian';
import { UsherView } from './UsherPaneView';
import { setVaultManager, VaultManager } from './VaultManager';
import { DEFAULT_SETTINGS, VIEW_TYPE, type UsherSettings } from './types';
import { setThisDeviceDir } from './runestore.svelte';
import { UsherSettingTab } from './UsherSettingTab';
import { eventHub } from './events';


export default class UsherPlugin extends Plugin {
	settings: UsherSettings;
	manager = new VaultManager(this.app, this);
	async onload() {
		await this.loadSettings();
		this.manager.onload();
		setVaultManager(this.manager);

		this.addCommand({
			id: 'show-view',
			name: 'Show Usher',
			callback: async () => {
				await this.showView();
			}
		});
		this.addCommand({
			id: 'update-list',
			name: 'Rescan and update List',
			callback: async () => {
				await this.manager.updateStore();
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new UsherSettingTab(this.app, this));
		this.registerView(
			VIEW_TYPE,
			(leaf) => new UsherView(leaf, this)
		);
		setThisDeviceDir(this.app.vault.configDir);
	}


	async showView() {
		const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE);
		if (leaves.length == 0) {
			await this.app.workspace.getLeaf(true).setViewState({
				type: VIEW_TYPE,
				active: true,
			});
		} else {
			await leaves[0].setViewState({
				type: VIEW_TYPE,
				active: true,
			});
		}
		if (leaves.length > 0) {
			this.app.workspace.revealLeaf(
				leaves[0]
			);
		}
	}
	async activateView() {

		let theLeaf: WorkspaceLeaf | undefined = undefined;
		for (const leaf of this.app.workspace.getLeavesOfType(
			VIEW_TYPE
		)) {
			const state = leaf.getViewState();
			if (state.pinned) {
				// NO OP. keep the pinned one.
			} else {
				theLeaf = leaf;
			}
		}
		if (!theLeaf) {
			// Create a new leaf
			theLeaf = this.app.workspace.getLeaf();

		}
		// And activate it
		await this.app.workspace.revealLeaf(
			theLeaf
		);
	}
	onunload() {

	}

	onExternalSettingsChange() {
		this.loadSettings();
		setThisDeviceDir(this.app.vault.configDir);
	}
	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		setThisDeviceDir(this.app.vault.configDir);
		eventHub.emitEvent("setting-change");
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	notices: Record<string, {
		notice: Notice,
		timer: ReturnType<typeof setTimeout>;
	}> = {};
	setNoticeTimer(key: string) {
		if (this.notices[key]) {
			clearTimeout(this.notices[key].timer);
			this.notices[key].timer = setTimeout(() => {
				this.notices[key].notice.hide();
				delete this.notices[key];
			}, 5000);
		}
	}
	showNotice(message: string, key?: string) {
		if (!key) {
			new Notice(message);
		} else {

			if (!this.notices[key]) {
				this.notices[key] = {
					notice: new Notice(message, 0),
					timer: setTimeout(() => {
						this.notices[key].notice.hide();
						delete this.notices[key];
					}, 5000)
				};
			} else {
				this.notices[key].notice.setMessage(message);
				this.setNoticeTimer(key);
			}
		}
	}
}



