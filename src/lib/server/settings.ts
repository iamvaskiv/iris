import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

export type Settings = {
	/** Lets the assistants browse and use any video in the connected Lumiere workspace. Off: only project videos. */
	libraryAccess: boolean;
};

const FILE = 'data/settings.json';
const DEFAULTS: Settings = { libraryAccess: false };

export const settings = {
	get: (): Settings => ({ ...DEFAULTS, ...(existsSync(FILE) ? JSON.parse(readFileSync(FILE, 'utf8')) : {}) }),
	update(patch: Partial<Settings>): Settings {
		const next = { ...settings.get(), ...patch };
		mkdirSync('data', { recursive: true });
		writeFileSync(FILE, JSON.stringify(next, null, '\t'));
		return next;
	}
};
