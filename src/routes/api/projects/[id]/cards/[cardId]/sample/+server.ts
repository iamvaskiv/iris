import { error, json } from '@sveltejs/kit';
import { projects } from '#lib/server/projects.js';
import { RESULTS_VERSION, basisOf, sampleResults } from '#lib/server/study.js';
import type { StudyData } from '#lib/cards/types.js';
import type { RequestHandler } from './$types';

/**
 * Share → Fake responses on a study card (sharing isn't built yet). Turning it on has Lumi write made-up results for
 * the current questions, unless the saved ones still match them (`refresh` writes them again anyway); turning it off
 * keeps them for next time.
 */
export const POST: RequestHandler = async ({ params, request }) => {
	const { enabled, refresh } = await request.json().catch(() => ({}));
	const project = await projects.get(params.id);
	const card = project?.cards.find((c) => c.id === params.cardId && c.type === 'study');
	if (!card) error(404, 'Study not found');
	const data = (card.data ?? { questions: [] }) as StudyData;

	let results = data.sample?.results;
	// Write them when there are none, the questions changed, last time Lumi couldn't (generic filler), they're in an
	// older shape, or someone asked for fresh ones (Refresh).
	if (
		enabled &&
		(refresh ||
			results?.basis !== basisOf(data.questions) ||
			results.by === 'filler' ||
			results.version !== RESULTS_VERSION)
	)
		results = await sampleResults(card.title, data.questions, data.intent);
	const sample = { enabled: !!enabled, results };

	await projects.update(params.id, (p) => {
		const c = p.cards.find((c) => c.id === params.cardId);
		if (c) c.data = { ...c.data, sample };
	});
	return json({ sample });
};
