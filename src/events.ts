import { EventHub } from "octagonal-wheels/events";

declare global {
	interface Events {
		"update-store": undefined;
		"clear-selected-device": string;
		"select-latest-mtime": string;
		"select-latest-mtime-including-old": string;
		"select-latest-version": string;
		"select-latest-version-including-old": string;
		"select-latest-not-matched": string;
		"select-latest-not-matched-including-old": string;
		"select-latest-config": string;
		"select-latest-config-including-old": string;
		"setting-change": undefined;
		"apply-selected": undefined;
	}
}

export const eventHub = new EventHub<Events>();
