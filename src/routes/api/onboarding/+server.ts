import { json } from '@sveltejs/kit';
import { EXAMPLE_ID } from '#lib/server/example.js';
import { projects } from '#lib/server/projects.js';
import type { RequestHandler } from './$types';

/** Restarting onboarding: the example project goes back to how it starts (it's made again on its next visit). */
export const DELETE: RequestHandler = async () => {
	await projects.remove(EXAMPLE_ID);
	return json({ ok: true });
};
