import { error } from '@sveltejs/kit';
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
		return { project: draft, transcript: [] };
	}
	const project = await projects.get(params.id);
	if (!project) error(404, 'Project not found');
	const { history: _, ...rest } = project;

	await refreshCardData(rest.cards);
	return { project: rest, transcript: transcript(project.history) };
};
