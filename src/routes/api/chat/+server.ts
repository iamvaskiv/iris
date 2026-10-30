import { error, json } from '@sveltejs/kit';
import { chat } from '#lib/server/agent.js';
import { projects } from '#lib/server/projects.js';
import { nextSuggestions } from '#lib/server/suggestions.js';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const { projectId, message } = await request.json();
	const project = await projects.get(projectId);
	if (!project) error(404, 'Project not found');

	try {
		// The agent works on the copy loaded above; the turn can take a while, so its results are merged into
		// the latest saved copy rather than overwriting it (an upload may have changed cards in the meantime).
		const res = await chat({ message, project });
		const suggestions = await nextSuggestions(project, res.ops, res.history);
		const saved = await projects.update(project.id, (latest) => {
			for (const op of res.ops) {
				if (op.op === 'add') latest.cards.push(op.card);
				if (op.op === 'update') latest.cards = latest.cards.map((c) => (c.id === op.card.id ? op.card : c));
				latest.focusedId = op.op === 'focus' ? op.id : op.card.id;
			}
			latest.name = project.name;
			latest.summary = project.summary;
			latest.videoIds = [...new Set([...latest.videoIds, ...project.videoIds])];
			latest.history = res.history;
			latest.reply = res.text;
			latest.choices = res.choices;
			latest.suggestions = suggestions;
		});
		return json({
			...res,
			suggestions: saved!.suggestions,
			project: { name: saved!.name, summary: saved!.summary }
		});
	} catch (e) {
		console.error(e);
		return json({
			text: 'Something went wrong on my side.',
			ops: [],
			history: project.history,
			error: String(e)
		});
	}
};
