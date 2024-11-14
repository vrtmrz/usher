import { PluginSettingTab, type App, Setting, Notice } from "obsidian";
import type UsherPlugin from "./main";
import { vaultManager } from "./VaultManager";
import MultipleRegExpControl from "./components/MultipleRegExpControl.svelte";
import { mount } from "svelte";


export class UsherSettingTab extends PluginSettingTab {
	plugin: UsherPlugin;

	constructor(app: App, plugin: UsherPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	async display(): Promise<void> {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl('h2', { text: 'Compare Control' });
		const ignoreEl = new Setting(containerEl)
			.setName('Ignore files');

		mount(
			MultipleRegExpControl,
			{
				target: ignoreEl.controlEl,
				props: {
					patterns: this.plugin.settings.ignoreFilePatterns.split("|[]|"),
					originals: [...this.plugin.settings.ignoreFilePatterns.split("|[]|")],
					apply: async (newPatterns: string[]) => {
						this.plugin.settings.ignoreFilePatterns = newPatterns
							.map((e) => e.trim())
							.filter((e) => e != "")
							.join("|[]|");
						await this.plugin.saveSettings();
						this.display();
					},
				},
			});

		const nonMerge = new Setting(containerEl)
			.setName('Non-mergeable files');

		mount(
			MultipleRegExpControl,
			{
				target: nonMerge.controlEl,
				props: {
					patterns: this.plugin.settings.nonMergeJsonPatterns.split("|[]|"),
					originals: [...this.plugin.settings.nonMergeJsonPatterns.split("|[]|")],
					apply: async (newPatterns: string[]) => {
						this.plugin.settings.nonMergeJsonPatterns = newPatterns
							.map((e) => e.trim())
							.filter((e) => e != "")
							.join("|[]|");
						await this.plugin.saveSettings();
						this.display();
					},
				},
			});
		containerEl.createEl('h2', { text: 'Utility' });

		let configFolder = "";
		new Setting(containerEl)
			.setName('Duplicate Config folder')
			.setDesc('Duplicate the config folder to another folder')
			.addText(text => text
				.setPlaceholder('.obsidian-test')
				.setValue(configFolder)
				.onChange((value) => {
					configFolder = value;
				}))
			.addButton(button =>
				button
					.setButtonText('Duplicate')
					.setWarning()
					.onClick(async () => {
						await vaultManager.copyDir(this.app.vault.configDir, configFolder);
						this.plugin.showNotice("Duplicated", "config-duplicate-progress");
						this.display();
					})

			);
		const configFolders = (await vaultManager.getAllDevices()).filter(e => e != this.app.vault.configDir);
		let deleteFolder = "";
		new Setting(containerEl)
			.setName('Delete Other devices\' config folder')
			.setDesc('Quite dangerous. Be careful (In the meantime, it will be moved in `.trash`. Probably).')
			.addDropdown(dropdown =>
				dropdown
					.addOptions(
						configFolders.reduce((acc, cur) => {
							acc[cur] = cur;
							return acc;
						}, {} as Record<string, string>)
					)
					.onChange(async (value) => {
						deleteFolder = value;
					})
			).addButton(
				button =>
					button
						.setButtonText('Delete')
						.setWarning()
						.onClick(async () => {
							if (deleteFolder == "") {
								new Notice("Select a folder to delete");
								return;
							}
							await vaultManager.deleteFolder(deleteFolder);
							this.plugin.showNotice("Deleted", "config-delete-progress");
							this.display();
						})
			);
	}
}
