<script lang="ts">
	import type { ItemInfo } from "./types";
	import FileListView from "./FileListView.svelte";
	import { selectedItems, nameMap, thisDeviceDir } from "./runestore.svelte";
	import AutoSelectButtons from "./components/AutoSelectButtons.svelte";

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
	const hasManifest = $derived.by(() => {
		return category === "theme" || category === "plugin"
			? items.some((e) => e.hasManifest)
			: false;
	});
	const isJson = $derived(category === "setting" || category === "plugin");
	const otherItems = $derived.by(() =>
		items.filter((e) => e.device !== thisDeviceDir),
	);
	const noCandidate = $derived(
		otherItems.length === 0 ||
			otherItems.every((e) => Object.entries(e.files).length === 0),
	);
</script>

{#if noCandidate}
	<tr class="empty">
		<th colspan="5" class="th-item-name">
			<header>
				<span class="label">{displayName}</span>
				<span class="usher-chip same"> no candidates </span>
			</header>
		</th>
	</tr>
{:else}
	<tr class={`${isSelected}`}>
		<th colspan="5" class="th-item-name">
			<header>
				<span class="label">{displayName}</span>
				{#if !noCandidate}
					<div class="buttons">
						<AutoSelectButtons
							{category}
							{hasManifest}
							{isJson}
							{key}
						/>
					</div>
				{/if}
			</header>
		</th>
	</tr>
	{#if !isPlugin}
	<FileListView {key} {items} {category} fileCategory={category} />
	{/if}
	{#if isPlugin}
		<FileListView
			{key}
			{items}
			{category}
			caption="Main"
			fileCategory="main"
		/>

		<FileListView
			{key}
			{items}
			{category}
			caption="Data"
			fileCategory="data"
		/>
		<FileListView
			{key}
			{items}
			{category}
			caption="Etc"
			fileCategory="etc"
		/>
	{/if}
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
	header {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: flex-start;
		flex-wrap: wrap;
	}
	header span.label {
		min-width: 5em;
		margin-right: 0.5em;
	}
	.buttons {
		flex-grow: 1;
		margin-right: auto;
		display: flex;
		flex-direction: row;
		align-items: center;
		flex-wrap: wrap;
	}
</style>
