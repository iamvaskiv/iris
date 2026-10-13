import { lumiere } from '#lib/server/lumiere.js';
import { projects } from '#lib/server/projects.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => ({
	projects: await Promise.all(
		projects.list().map(async (p) => ({
			id: p.id,
			name: p.name,
			summary: p.summary,
			status: p.status,
			// Up to two video thumbnails peek out of the bottom of the tile.
			thumbnails: await Promise.all(
				p.videoIds.slice(0, 2).map((id) =>
					lumiere
						.assetUrl(id, { assetType: 'thumbnail', width: 480 })
						.then((a) => a.url)
						.catch(() => null)
				)
			).then((urls) => urls.filter((u): u is string => !!u))
		}))
	)
});
