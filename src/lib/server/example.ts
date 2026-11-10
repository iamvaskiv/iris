import type { Card } from '#lib/cards/types.js';
import type { Project } from '#lib/projects.js';
import { fixtures } from '../../stories/fixtures/index.js';
import { assets } from './assets.js';
import { projects } from './projects.js';
import { store } from './store.js';

/**
 * The example project new people open from Lumi's welcome: the Inside Out 2 trailer (a video with real viewer data),
 * already holding a video card, its viewer insights and a study, so they see what Lumi's cards look like before
 * uploading anything. It's one shared project with a fixed id, made on first visit (from the cards captured for the
 * Storybook) and made again if someone deletes it. Video and insights cards refresh from the analysis on every visit,
 * like any card.
 */
export const EXAMPLE_ID = 'example';
const VIDEO_ID = 'vuvIanfCkI8R';

const CARDS = [
	'Inside Out 2 Reception · Inside Out 2 trailer',
	'Inside Out 2 Reception · Inside Out 2 trailer: viewer data',
	'Inside Out 2 Reception · Inside Out 2 trailer study'
];

/** Lumi's first reply in the example, shown in the dock when it opens: what the cards are and what to try. */
export const EXAMPLE_REPLY = `This is an example project on the **Inside Out 2** trailer, and each card is one of my answers: the video's scenes and characters, what **174 viewers** said about it, and a study to ask them more.

Ask me anything about it, or pick a question to try.`;

export const EXAMPLE_CHOICES = [
	'Which scene landed best?',
	'What did viewers dislike?',
	'Compare the new emotions'
];

function build(): Project {
	const now = new Date().toISOString();
	const cards = CARDS.map((key) => structuredClone(fixtures[key])).filter((c): c is Card => !!c);
	return {
		id: EXAMPLE_ID,
		name: 'Example: Inside Out 2',
		summary: 'Viewers loved the trailer (4.7/5); a study asks which new emotion they want more of.',
		example: true,
		videoIds: [VIDEO_ID],
		cards,
		focusedId: cards[0]?.id,
		reply: EXAMPLE_REPLY,
		choices: EXAMPLE_CHOICES,
		// The conversation so far, so Lumi knows she already introduced the project.
		history: [
			{ role: 'user', content: 'Show me an example project.' },
			{ role: 'assistant', content: EXAMPLE_REPLY }
		],
		createdAt: now,
		updatedAt: now
	};
}

/** The example project, made first if it isn't there. */
export async function ensureExample(): Promise<Project> {
	const existing = await projects.get(EXAMPLE_ID);
	if (existing) return existing;
	await assets.ensure(VIDEO_ID).catch(() => {});
	return (await store.update<Project>('projects', EXAMPLE_ID, () => {}, build))!;
}
