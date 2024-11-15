import { ItemView, type WorkspaceLeaf } from "obsidian";
import { mount, unmount } from "svelte";
import PluginViewComponent from "./UsherPaneView.svelte";
import type UsherPlugin from "./main";
import { VIEW_TYPE } from "./types";
export class UsherView extends ItemView {
	getViewType(): string {
		return VIEW_TYPE;
	}
	getDisplayText(): string {
		return "Usher";
	}
	getIcon(): string {
		return "wrench-screwdriver-glyph";
	}

	constructor(leaf: WorkspaceLeaf, plugin: UsherPlugin) {
		super(leaf);
	}
	component?: ReturnType<typeof mount>;

	async onOpen() {
		const app = mount(PluginViewComponent, {
			target: this.contentEl,
			props: {},
		});
		this.component = app;
		return await Promise.resolve();
	}

	async onClose() {
		if (this.component) {
			unmount(this.component);
			this.component = undefined;
		}
		return await Promise.resolve();
	}
}
