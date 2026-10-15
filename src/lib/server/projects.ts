import { store } from './store.js';
import type { Project } from '#lib/projects.js';

export const projects = {
	list: async () =>
		(await store.all<Project>('projects')).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
	get: (id: string) => store.get<Project>('projects', id),
	async create(name = 'New project'): Promise<Project> {
		const now = new Date().toISOString();
		const project: Project = {
			id: crypto.randomUUID().slice(0, 8),
			name,
			videoIds: [],
			cards: [],
			history: [],
			createdAt: now,
			updatedAt: now
		};
		await store.set('projects', project.id, project);
		return project;
	},
	/**
	 * Applies `change` to the latest saved copy and saves it. If another request saved the project in between,
	 * `change` runs again on that newer copy, so concurrent requests (a chat turn and an upload poll) keep each other's
	 * edits. Do any awaiting before calling this, never inside `change`.
	 */
	update: (id: string, change: (project: Project) => void) =>
		store.update<Project>('projects', id, (project) => {
			change(project);
			project.updatedAt = new Date().toISOString();
		}),
	remove: (id: string) => store.delete('projects', id)
};
