import { error, json } from '@sveltejs/kit';
import { projects } from '#lib/server/projects.js';
import { cleanQuestions } from '#lib/server/study.js';
import type { RequestHandler } from './$types';

/** Saves edits made on a card itself (so far only a study's questions); the assistant's edits go through chat. */
export const PUT: RequestHandler = async ({ params, request }) => {
	const { questions } = await request.json().catch(() => ({}));
	if (!Array.isArray(questions)) error(400, 'Expected questions');
	let found = false;
	await projects.update(params.id, (project) => {
		const card = project.cards.find((c) => c.id === params.cardId && c.type === 'study');
		if (!card) return;
		found = true;
		card.data = { ...card.data, questions: cleanQuestions(questions) };
	});
	if (!found) error(404, 'Study not found');
	return json({ saved: true });
};
