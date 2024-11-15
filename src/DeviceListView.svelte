<script lang="ts">
	import EachFileView from "./EachFileViewComponent.svelte";
	import { unique } from "octagonal-wheels/collection";

	import type { EachSummaryInfo, ItemInfo, SummaryInfo } from "./types";
	import { onMount, setContext } from "svelte";
	import { writable } from "svelte/store";
	import { eventHub } from "./events";
	import AutoSelectButtons from "./components/AutoSelectButtons.svelte";
	import {
		nonAutomatic,
		selectItem,
		thisDeviceDir,
		unselectItem,
	} from "./runestore.svelte";

	interface Props {
		key: string;
		items: ItemInfo[];
		category: string;
		fileCategory: string;
		file?: string;
		hideHeader?: boolean;
		verboseMode?: boolean;
	}
	const {
		key,
		items,
		file,
		category,
		fileCategory,
		hideHeader,
		verboseMode,
	}: Props = $props();

	const thisDevice = $derived(thisDeviceDir);
	const devices = $derived.by(() => {
		return unique(items.map((e) => e.device)).filter(
			(e) => e !== thisDevice,
		);
	});
	let selectedDevice = writable("");

	setContext("getSelectedDevice", () => selectedDevice);
	let currentSelectedDevice = $state("");
	selectedDevice.subscribe((val) => {
		currentSelectedDevice = val;
	});
	$effect(() => {
		if (currentSelectedDevice !== "") {
			selectItem(key);
		} else {
			unselectItem(key);
		}
		selectedDevice.set(currentSelectedDevice);
	});
	const hasManifest = $derived.by(() => {
		return items.some((e) => e.hasManifest);
	});
	function selectMostLatest(onlyNewer: boolean) {
		selectedDevice.set("");
		const items = Object.entries(deviceCompareInfo)
			.map(
				(e) =>
					[e[0], onlyNewer ? e[1].newer : e[1].total] as [
						string,
						EachSummaryInfo,
					],
			)
			.sort((a, b) => {
				return a[1].maxMTime - b[1].maxMTime;
			})
			.reverse();
		if (items.length > 0) {
			if (items[0][1].maxMTime === 0) {
				return;
			}
			selectedDevice.set(items[0][0]);
		}
	}
	function selectMostLatestVersion(onlyNewer: boolean) {
		selectedDevice.set("");
		const items = Object.entries(deviceCompareInfo)
			.map(
				(e) =>
					[e[0], onlyNewer ? e[1].newer : e[1].total] as [
						string,
						EachSummaryInfo,
					],
			)
			.sort((a, b) => {
				return a[1].version.localeCompare(b[1].version, undefined, {
					numeric: true,
				});
			})
			.reverse();
		if (items.length > 0) {
			if (items[0][1].version === "") {
				return;
			}
			selectedDevice.set(items[0][0]);
		}
	}
	function selectMostLatestChangedItem(onlyNewer: boolean) {
		selectedDevice.set("");
		const items = Object.entries(deviceCompareInfo)
			.map(
				(e) =>
					[e[0], onlyNewer ? e[1].newer : e[1].total] as [
						string,
						EachSummaryInfo,
					],
			)
			.sort((a, b) => {
				return a[1].maxMTimeIfNotMatched - b[1].maxMTimeIfNotMatched;
			})
			.reverse();
		if (items.length > 0) {
			if (items[0][1].maxMTimeIfNotMatched === 0) {
				return;
			}
			selectedDevice.set(items[0][0]);
		}
	}
	function selectMostLatestConfig(onlyNewer: boolean) {
		selectedDevice.set("");
		const items = Object.entries(deviceCompareInfo)
			.map(
				(e) =>
					[e[0], onlyNewer ? e[1].newer : e[1].total] as [
						string,
						EachSummaryInfo,
					],
			)
			.sort((a, b) => {
				return a[1].maxMTimeConfig - b[1].maxMTimeConfig;
			})
			.reverse();
		if (items.length > 0) {
			if (items[0][1].maxMTimeConfig === 0) {
				return;
			}
			selectedDevice.set(items[0][0]);
		}
	}

	let deviceCompareInfo = $state({} as Record<string, SummaryInfo>);

	const ephemeralCategory = Math.random().toString(36);
	const nonAutomaticKeys = $derived($nonAutomatic);
	function categoryShouldHandle(targetCategory: string) {
		return (
			(targetCategory === "all" ||
				targetCategory === category ||
				targetCategory === ephemeralCategory) &&
			!nonAutomaticKeys.has(key)
		);
	}
	const isJson = $derived.by(() => {
		return category === "setting" || fileCategory === "data";
	});

	onMount(() => {
		eventHub.onEvent("clear-selected-device", (targetCategory) => {
			if (!categoryShouldHandle(targetCategory)) return;
			selectedDevice.set("");
		});
		eventHub.onEvent("select-latest-mtime", (targetCategory) => {
			if (!categoryShouldHandle(targetCategory)) return;
			selectMostLatest(true);
		});
		eventHub.onEvent(
			"select-latest-mtime-including-old",
			(targetCategory) => {
				if (!categoryShouldHandle(targetCategory)) return;
				selectMostLatest(false);
			},
		);
		eventHub.onEvent("select-latest-version", (targetCategory) => {
			if (!categoryShouldHandle(targetCategory)) return;
			selectMostLatestVersion(true);
		});
		eventHub.onEvent(
			"select-latest-version-including-old",
			(targetCategory) => {
				if (!categoryShouldHandle(targetCategory)) return;
				selectMostLatestVersion(false);
			},
		);
		eventHub.onEvent("select-latest-not-matched", (targetCategory) => {
			if (!categoryShouldHandle(targetCategory)) return;
			selectMostLatestChangedItem(true);
		});
		eventHub.onEvent(
			"select-latest-not-matched-including-old",
			(targetCategory) => {
				if (!categoryShouldHandle(targetCategory)) return;
				selectMostLatestChangedItem(false);
			},
		);
		eventHub.onEvent("select-latest-config", (targetCategory) => {
			if (!categoryShouldHandle(targetCategory)) return;
			selectMostLatestConfig(true);
		});
		eventHub.onEvent(
			"select-latest-config-including-old",
			(targetCategory) => {
				if (!categoryShouldHandle(targetCategory)) return;
				selectMostLatestConfig(false);
			},
		);
		return () => {};
	});
</script>

{#if devices.length > 0}
	<tr class={`${currentSelectedDevice != "" ? "selected" : ""}`}>
		<td colspan="2"></td>
		<td colspan="3">
			{#if !hideHeader || category === "plugin"}
				<div class="buttons">
					<AutoSelectButtons
						category={ephemeralCategory}
						{hasManifest}
						{isJson}
						key={verboseMode ? undefined : key}
					/>
				</div>
			{/if}
		</td>
	</tr>
	{#each devices as device}
		<EachFileView
			{key}
			{items}
			{fileCategory}
			{file}
			{hideHeader}
			targetDevice={device}
			{devices}
			{deviceCompareInfo}
		/>
	{/each}
{:else}
	<tr class="empty">
		<td colspan="3"><span class="usher-chip same"> no candidates </span></td
		>
	</tr>
{/if}

<style>
	.buttons {
		display: flex;
		align-items: center;
	}
</style>
