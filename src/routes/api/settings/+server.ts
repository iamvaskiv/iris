import { json } from '@sveltejs/kit';
import { settings } from '#lib/server/settings.js';
import type { RequestHandler } from './$types';

export const PATCH: RequestHandler = async ({ request }) => {
	const { libraryAccess } = await request.json();
	return json(await settings.update({ libraryAccess: Boolean(libraryAccess) }));
};
