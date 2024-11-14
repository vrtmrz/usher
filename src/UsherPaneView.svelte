<script lang="ts">
	import { infoMap, onlyNew } from "./runestore.svelte";
	import { eventHub } from "./events";
	import type { CategoryType, ItemInfo } from "./types";
	import AutoSelectButtons from "./components/AutoSelectButtons.svelte";
	import { onMount } from "svelte";
	import CategoryView from "./CategoryView.svelte";

	function updateList() {
		eventHub.emitEvent("update-store");
	}

	const categories = {
		setting: "Config",
		snippet: "Snippets",
		theme: "Themes",
		plugin: "Plugins",
		unknown: "Et cetera",
	} as Record<CategoryType, string>;
	const groupedItems = $derived.by(() => {
		const grouped = new Map<string, Map<string, ItemInfo[]>>();
		for (const [key, value] of $infoMap) {
			const cat = value.category;
			if (!grouped.has(cat)) {
				grouped.set(cat, new Map<string, ItemInfo[]>());
			}
			const items = grouped.get(cat) ?? new Map<string, ItemInfo[]>();
			const subKey = `${value.key}`;
			if (!items.has(subKey)) {
				items.set(subKey, []);
			}
			items.get(subKey)?.push(value);
			grouped.set(cat, items);
		}
		return grouped;
	});
	onMount(() => {
		eventHub.emitEvent("update-store");
	});

	let hideEmpty = $state(true);
	let onlySelected = $state(true);
</script>

<div
	class={`${hideEmpty ? "hide-empty" : ""} ${onlySelected ? "only-selected" : ""}`}
>
	<div class="main-buttons">
		<div class="row">
			<button onclick={updateList}>Update List</button>
			<label
				><input type="checkbox" bind:checked={hideEmpty} />Hide empty</label
			>
			<label
				><input type="checkbox" bind:checked={onlySelected} />Only
				Selected</label
			>
			<label>
				<input type="checkbox" bind:checked={$onlyNew} /> ✨Only New
			</label>
			<span class="spacer"></span>
			<button onclick={() => eventHub.emitEvent("apply-selected")}
				>Apply</button
			>
		</div>
		<div class="row">
			<AutoSelectButtons
				category="all"
				hasManifest={true}
				isJson={true}
			/>
		</div>
	</div>
	{#each Object.entries(categories) as [category, name]}
		{#if groupedItems.has(category)}
			<CategoryView
				{category}
				{name}
				items={groupedItems.get(category) as Map<string, ItemInfo[]>}
			/>
		{/if}
	{/each}
</div>

<style>
	.main-buttons {
		z-index: var(--layer-cover);
		position: sticky;
		top: 0;
		display: flex;
		flex-direction: column;
		background-color: var(--background-primary);
	}
	.main-buttons .row {
		margin-bottom: 4px;
		display: flex;
		justify-content: flex-start;
		align-items: center;
		flex-wrap: wrap;
	}
	.main-buttons .row label {
		display: inline-flex;
		justify-content: center;
		align-items: center;
	}
	span.spacer {
		flex-grow: 1;
		display: inline-flex;
	}
	.main-buttons .row > * {
		margin-right: 0.5em;
	}

	:global(.hide-empty .empty) {
		display: none;
	}

	:global(.only-selected tr:not(.selected)) {
		display: none;
	}
</style>
