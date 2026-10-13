import { json } from '@sveltejs/kit';
import { projects } from '#lib/server/projects.js';
import type { RequestHandler } from './$types';

/** Saves a project. Called when a draft gets its first content (message or upload). */
export const POST: RequestHandler = async ({ request }) => {
	const { name } = await request.json().catch(() => ({}));
	return json({ id: projects.create(name || undefined).id });
};
