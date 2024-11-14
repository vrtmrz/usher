<script lang="ts">
	import { onlyNew } from "../runestore.svelte";
	import { eventHub } from "../events";

	interface Props {
		category: string;
		hasManifest: boolean;
		isJson: boolean;
	}
	const { category, hasManifest, isJson }: Props = $props();
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

<style>
	button {
		margin-right: 0.5em;
	}
</style>
