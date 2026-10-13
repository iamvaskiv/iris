import { error } from '@sveltejs/kit';
import { lumiere } from '#lib/server/lumiere.js';
import { projects } from '#lib/server/projects.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const project = projects.get(params.id);
	if (!project) error(404, 'Project not found');
	const { history: _, ...rest } = project;

	// Signed stream URLs expire after a couple of hours, so refresh them on every visit.
	await Promise.all(
		rest.cards
			.filter((c) => c.type === 'video' && c.data?.videoId)
			.map(async (c) => {
				const asset = await lumiere
					.assetUrl(c.data!.videoId as string, { assetType: 'download', fileName: 'low.mp4' })
					.catch(() => null);
				c.data = { ...c.data, streamUrl: asset?.url };
			})
	);
	return { project: rest };
};
