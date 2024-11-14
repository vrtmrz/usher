<script lang="ts">
	import type { ItemInfo } from "./types";
	import FileListView from "./FileListView.svelte";
	import { selectedItems, nameMap } from "./runestore.svelte";

	interface Props {
		name: string;
		category: string;
		items: ItemInfo[];
	}

	const { name, category, items }: Props = $props();

	const displayName = $derived($nameMap.get(name) ?? name);
	const isPlugin = $derived(category === "plugin");
	const key = $derived(`${name}-${category}`);
	const isSelected = $derived.by(() =>
		$selectedItems.has(key) ? "selected" : "",
	);
</script>

<tr class={`${isSelected}`}>
	<th colspan="5" class="th-item-name">{displayName}</th>
</tr>
{#if !isPlugin}
	<FileListView {key} {items} {category} fileCategory={category} />
{/if}
{#if isPlugin}
	<FileListView {key} {items} {category} caption="Main" fileCategory="main" />

	<FileListView {key} {items} {category} caption="Data" fileCategory="data" />
	<FileListView {key} {items} {category} caption="Etc" fileCategory="etc" />
{/if}

<style>
	th.th-item-name {
		text-align: left;
		border-bottom: var(--hr-thickness) solid;
		border-color: var(--hr-color);
	}
	.wrapFile {
		margin-left: 0.5em;
		display: grid;
	}
</style>
