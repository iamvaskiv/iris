import { error, json } from '@sveltejs/kit';
import { chat } from '#lib/server/agent.js';
import { projects } from '#lib/server/projects.js';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const { projectId, message } = await request.json();
	const project = projects.get(projectId);
	if (!project) error(404, 'Project not found');

	try {
		const res = await chat({ message, project });
		const last = res.ops.at(-1);
		if (last) project.focusedId = last.op === 'focus' ? last.id : last.card.id;
		project.history = res.history;
		project.reply = res.text;
		projects.save(project);
		return json({ ...res, project: { name: project.name, summary: project.summary } });
	} catch (e) {
		console.error(e);
		return json({ text: 'Something went wrong on my side.', ops: [], history: project.history, error: String(e) });
	}
};
