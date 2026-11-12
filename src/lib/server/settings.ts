import { store } from './store.js';

export type Settings = {
	/** Lets the assistants browse and use any video in the connected Lumiere workspace. Off: only project videos. */
	libraryAccess: boolean;
};

const DEFAULTS: Settings = { libraryAccess: false };
/** The Lumiere library is switched off for now: whatever was saved, the assistants only know project videos. */
const LOCKED: Partial<Settings> = { libraryAccess: false };
/** App-wide settings are one document. */
const ID = 'app';

export const settings = {
	get: async (): Promise<Settings> => ({
		...DEFAULTS,
		...(await store.get<Partial<Settings>>('settings', ID)),
		...LOCKED
	}),
	update: async (patch: Partial<Settings>): Promise<Settings> =>
		(await store.update<Settings>(
			'settings',
			ID,
			(s) => Object.assign(s, patch, LOCKED),
			() => ({ ...DEFAULTS })
		))!
};
