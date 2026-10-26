import { json } from '@sveltejs/kit';
import { assets } from '#lib/server/assets.js';
import type { RequestHandler } from './$types';

/** The user's videos, for pickers (a study's video step): id, name, length and a thumbnail. */
export const GET: RequestHandler = async () =>
	json(
		(await assets.list({ withThumbnails: true })).map(
			({ id, name, duration, status, thumbnail }) => ({
				id,
				name,
				duration,
				status,
				thumbnail
			})
		)
	);
