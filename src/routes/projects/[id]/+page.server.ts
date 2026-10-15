import { error } from '@sveltejs/kit';
import { comparisonData } from '#lib/server/comparison.js';
import { insights } from '#lib/server/insights.js';
import { videoCardData } from '#lib/server/video-card.js';
import { projects } from '#lib/server/projects.js';
import type { ComparisonData } from '#lib/cards/types.js';
import type { Project } from '#lib/projects.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url }) => {
	// /projects/new is an unsaved draft: the page saves it on the first message or upload.
	if (params.id === 'new') {
		const now = new Date().toISOString();
		const draft: Omit<Project, 'history'> = {
			id: '',
			name: url.searchParams.get('name') || 'New project',
			videoIds: [],
			cards: [],
			createdAt: now,
			updatedAt: now
		};
		return { project: draft };
	}
	const project = await projects.get(params.id);
	if (!project) error(404, 'Project not found');
	const { history: _, ...rest } = project;

	// Signed media URLs expire after a couple of hours, so refresh video cards on every visit; insights come from
	// their cache and are refreshed when it expires.
	await Promise.all(
		rest.cards.map(async (c) => {
			const id = c.data?.videoId as string | undefined;
			if (c.type === 'video' && id) c.data = await videoCardData(id);
			if (c.type === 'insights' && id) c.data = (await insights.get(id).catch(() => null)) ?? c.data;
			if (c.type === 'comparison' && c.data?.videoIds) c.data = await comparisonData(c.data.videoIds as string[], c.data.focus as ComparisonData['focus']);
		})
	);
	return { project: rest };
};
