import { readLocal, writeLocal } from '#lib/local.js';

const KEY = 'iris.experimental.lanes';

/**
 * Experimental features, on by default and remembered on this device. `lanes`: the project page groups cards by topic
 * into horizontal lanes stacked down the page; off, cards stack in one column.
 */
export const experimental = $state({ lanes: true });

/** Call after mount (not during SSR/hydration) to pick up the saved choice. */
export function loadExperimental() {
	experimental.lanes = readLocal(KEY) !== 'false';
}

export function setLanes(on: boolean) {
	experimental.lanes = on;
	writeLocal(KEY, String(on));
}
