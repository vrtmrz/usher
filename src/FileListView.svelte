<script lang="ts">
	import type { ItemInfo } from "./types";
	import { unique } from "octagonal-wheels/collection";

	import DeviceListView from "./DeviceListView.svelte";
	import { selectedItems, thisDeviceDir } from "./runestore.svelte";

	interface Props {
		key: string;
		items: ItemInfo[];
		fileCategory: string;
		category: string;
		caption?: string;
	}
	const { key, items, category, fileCategory, caption }: Props = $props();

	const filteredItems = $derived.by(() => {
		return items
			.filter((item) => fileCategory in item.files)
			.map((e) => {
				const w = JSON.parse(JSON.stringify(e)) as typeof e;
				w.files = { [fileCategory]: e.files[fileCategory] };
				return w;
			});
	});

	const files = $derived.by(() => {
		return unique(
			filteredItems
				.map((e) => Object.values(e.files))
				.flat()
				.map((e) => e.map((e) => e.name))
				.flat(),
		);
	});

	const thisDevice = $derived(thisDeviceDir);

	const itemLength = $derived.by(
		() =>
			unique(
				items
					.filter((e) => e.device != thisDevice)
					.map((e) => e.files[fileCategory]?.map((e) => e && e.name))
					.flat(),
			).filter((e) => e != null).length,
	);
	const canSummarize = $derived.by(
		() => category === "plugin" || category === "theme",
	);

	// svelte-ignore state_referenced_locally
	let showVerbose = $state(!canSummarize);

	const isSelected = $derived($selectedItems.has(key) ? "selected" : "");
</script>

{#if itemLength == 0 && caption}
	<tr class="empty">
		<th colspan="1" class="th-item-file-name">
			{caption}
		</th>
		<td></td>
		<td colspan="2">
			<span class="usher-chip same"> No candidates </span></td
		>
	</tr>
{:else}
	{#if caption}
		<tr class={`${isSelected}`}>
			<th colspan="1" class="th-item-file-name">
				{caption}
			</th>
			<td colspan="4">
				{#if canSummarize}
					<label
						><input type="checkbox" bind:checked={showVerbose} />
						{#if !showVerbose}
							(show each {itemLength} file)
						{:else}
							(Show summary files)
						{/if}
					</label>
				{/if}
			</td>
		</tr>
	{/if}

	<!-- <div class="fileItemRow"> -->

	{#if !showVerbose}
		<DeviceListView
			{key}
			{items}
			{category}
			{fileCategory}
			hideHeader={true}
			verboseMode={false}
		/>
	{:else}
		{#each files as file}
			<DeviceListView
				{key}
				{items}
				{file}
				{fileCategory}
				{category}
				hideHeader={!canSummarize}
				verboseMode={true}
			/>
		{/each}
	{/if}
	<!-- </div> -->
	<!-- </div> -->
{/if}

<style>
	th.th-item-file-name {
		text-align: left;
	}
	label {
		display: inline-flex;
		justify-content: center;
		align-items: center;
	}
	.fileItemWrap {
		margin-left: 1em;
	}
	.fileItemRow {
		margin-left: 0.5em;
		display: flex;
		flex-direction: row;
		align-items: center;
	}
	.files {
		margin-left: 0.5em;
		display: flex;
		flex-direction: column;
		flex-grow: 1;
		justify-content: flex-start;
	}
	.file-row {
		display: flex;
		flex-direction: row;
	}
</style>
