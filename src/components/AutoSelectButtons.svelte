<script lang="ts">
	import {
		onlyNew,
		nonAutomatic,
		setNonAutomatic,
		unsetNonAutomatic,
	} from "../runestore.svelte";
	import { eventHub } from "../events";

	interface Props {
		key?: string;
		category: string;
		hasManifest: boolean;
		isJson: boolean;
	}
	const { category, hasManifest, isJson, key }: Props = $props();
	let prev = key !== undefined ? $nonAutomatic.has(key) : false;
	let shouldIgnore = $state(prev);

	$effect(() => {
		if (key !== undefined && prev !== shouldIgnore) {
			prev = shouldIgnore;
			if (shouldIgnore) {
				setNonAutomatic(key);
			} else {
				unsetNonAutomatic(key);
			}
		}
	});
</script>

<button onclick={() => eventHub.emitEvent("clear-selected-device", category)}
	>❌</button
>

{#if $onlyNew}
	<button onclick={() => eventHub.emitEvent("select-latest-mtime", category)}
		>📅</button
	>

	{#if hasManifest}
		<button
			onclick={() =>
				eventHub.emitEvent("select-latest-version", category)}
			>🏷️</button
		>
	{/if}
	{#if isJson}
		<button
			onclick={() => eventHub.emitEvent("select-latest-config", category)}
			>⚙</button
		>
	{/if}
	<button
		onclick={() =>
			eventHub.emitEvent("select-latest-not-matched", category)}
		>⚡</button
	>
	✨
{:else}
	<button
		onclick={() =>
			eventHub.emitEvent("select-latest-mtime-including-old", category)}
		>📅</button
	>
	{#if hasManifest}
		<button
			onclick={() =>
				eventHub.emitEvent(
					"select-latest-version-including-old",
					category,
				)}>🏷️</button
		>
	{/if}
	{#if isJson}
		<button
			onclick={() =>
				eventHub.emitEvent(
					"select-latest-config-including-old",
					category,
				)}>⚙</button
		>
	{/if}
	<button
		onclick={() =>
			eventHub.emitEvent(
				"select-latest-not-matched-including-old",
				category,
			)}>⚡</button
	>
{/if}
{#if key !== undefined}
	<label>
		<span data-tooltip="Locked for Automatic">🔒</span>
		<input type="checkbox" bind:checked={shouldIgnore} />
	</label>
{/if}

<style>
	label {
		margin-left: auto;
		display: inline-flex;
		align-items: center;
		font-weight: initial;
	}
	label span {
		margin-right: 0.25em;
	}
	button {
		margin-right: 0.5em;
	}
</style>
