<script lang="ts">
	import type { ItemInfo } from "./types";
	import EntryView from "./EntryView.svelte";
	import AutoSelectButtons from "./components/AutoSelectButtons.svelte";
	interface Props {
		name: string;
		category: string;
		items: Map<string, ItemInfo[]>;
	}
	const { name, category, items }: Props = $props();
	const nameList = $derived(Array.from(items.keys()).sort());
	const hasManifest = $derived.by(() => {
		return [...items.values()].some((e) => e.some((e) => e.hasManifest));
	});
	const isJson = $derived(category === "setting" || category === "plugin");
</script>

<div class="wrapCategory">
	<header class="item-head">
		<div class="category-buttons">
			<label for="">{name}</label>
			<AutoSelectButtons {category} {hasManifest} {isJson} />
		</div>
	</header>
	<div class="list">
		<table>
			<thead> </thead>
			<tbody>
				{#each nameList as name}
					<!-- {item} -->
					<EntryView
						{name}
						{category}
						items={items.get(name) as ItemInfo[]}
					/>
				{/each}
			</tbody>
		</table>
	</div>
</div>

<style>
	.wrapCategory {
		margin: 0.25em;
	}
	.item-head {
		border-bottom: var(--hr-thickness) solid;
		border-color: var(--hr-color);
	}
	.list {
		margin-left: 0.5em;
	}
	table {
		box-sizing: border-box;
		width: 100%;
	}
	.category-buttons {
		position: sticky;
		top: 0;
		display: flex;
		justify-content: flex-start;
		align-items: center;
		flex-wrap: wrap;
	}
	.category-buttons label {
		display: inline-block;
		min-width: 4em;
		font-weight: bold;
	}
</style>
