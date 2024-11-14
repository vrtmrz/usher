import { writable } from "svelte/store";
import type { ItemInfo } from "./types";

export const selectedItems = writable(new Set<string>());

export function selectItem(item: string) {
	selectedItems.update((items) => {
		items.add(item);
		return items;
	});
}

export function unselectItem(item: string) {
	selectedItems.update((items) => {
		items.delete(item);
		return items;
	});
}

export let thisDeviceDir = $state<string>("");

export function setThisDeviceDir(dir: string) {
	thisDeviceDir = dir;
}

export const nameMap = writable(new Map<string, string>());
export const infoMap = writable(new Map<string, ItemInfo>());


export function setInfoMap(map: Map<string, ItemInfo>) {
	infoMap.set(map);
}

export function setNameMap(map: Map<string, string>) {
	nameMap.set(map);
}

export const onlyNew = writable<boolean>(true);
