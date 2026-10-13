import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import type { Project } from '#lib/projects.js';

// Prototype storage: one JSON file, read and written whole.
const FILE = 'data/projects.json';
const SEED_VIDEO_ID = 'vcnghIEcxyqz';

function read(): Project[] {
	if (!existsSync(FILE)) {
		const now = new Date().toISOString();
		write([
			{
				id: crypto.randomUUID().slice(0, 8),
				name: 'Inside Out 2 clip',
				summary: 'Envy arrives and the core emotions react with shock.',
				videoIds: [SEED_VIDEO_ID],
				cards: [],
				history: [],
				createdAt: now,
				updatedAt: now
			}
		]);
	}
	return JSON.parse(readFileSync(FILE, 'utf8'));
}

function write(projects: Project[]) {
	mkdirSync('data', { recursive: true });
	writeFileSync(FILE, JSON.stringify(projects, null, '\t'));
}

export const projects = {
	list: () => read().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
	get: (id: string) => read().find((p) => p.id === id),
	create(name = 'New project'): Project {
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
		write([...read(), project]);
		return project;
	},
	save(project: Project) {
		project.updatedAt = new Date().toISOString();
		write(read().map((p) => (p.id === project.id ? project : p)));
	}
};
