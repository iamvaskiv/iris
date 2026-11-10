import { error, json } from '@sveltejs/kit';
import { projects } from '#lib/server/projects.js';
import { cleanQuestions } from '#lib/server/study.js';
import type { RequestHandler } from './$types';

/** Saves edits made on a card itself (so far a study's questions and intent); the assistant's edits go through chat. */
export const PUT: RequestHandler = async ({ params, request }) => {
	const { questions, intent } = await request.json().catch(() => ({}));
	if (!Array.isArray(questions) && typeof intent !== 'string')
		error(400, 'Expected questions or intent');
	let found = false;
	await projects.update(params.id, (project) => {
		const card = project.cards.find((c) => c.id === params.cardId && c.type === 'study');
		if (!card) return;
		found = true;
		card.data = {
			...card.data,
			...(Array.isArray(questions) ? { questions: cleanQuestions(questions) } : {}),
			...(typeof intent === 'string' ? { intent: intent.trim().slice(0, 300) } : {})
		};
	});
	if (!found) error(404, 'Study not found');
	return json({ saved: true });
};

/** Deletes a card (from its × on the project page, after a confirmation there). The card next to it takes focus. */
export const DELETE: RequestHandler = async ({ params }) => {
	let found = false;
	await projects.update(params.id, (project) => {
		const at = project.cards.findIndex((c) => c.id === params.cardId);
		if (at < 0) return;
		found = true;
		project.cards.splice(at, 1);
		if (project.focusedId === params.cardId)
			project.focusedId = (project.cards[at] ?? project.cards[at - 1])?.id;
	});
	if (!found) error(404, 'Card not found');
	return json({ deleted: true });
};
