import { error } from '@sveltejs/kit';
import type { ProjectAsset } from '#lib/assets.js';
import { assets, thumbnail } from '#lib/server/assets.js';
import { refreshCardData } from '#lib/server/card-data.js';
import { projects } from '#lib/server/projects.js';
import type { Project } from '#lib/projects.js';
import { transcript } from '#lib/transcript.js';
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
		return { project: draft, transcript: [], assets: [] as ProjectAsset[] };
	}
	const project = await projects.get(params.id);
	if (!project) error(404, 'Project not found');
	const { history: _, ...rest } = project;

	// The project's videos, for the right safe zone: what Iris knows about each, and a thumbnail.
	const [, projectAssets] = await Promise.all([
		refreshCardData(rest.cards),
		Promise.all(
			project.videoIds.map(async (id): Promise<ProjectAsset> => {
				const stored = await assets.get(id);
				return {
					id,
					name: stored?.name ?? id,
					duration: stored?.duration,
					status: stored?.status ?? 'not-analysed',
					thumbnail: await thumbnail(id)
				};
			})
		)
	]);
	return { project: rest, transcript: transcript(project.history), assets: projectAssets };
};
