/**
 * "How Iris works": three steps scripted through Lumi's own dock on the projects page, on someone's first visit
 * (and after restarting onboarding), before her welcome. Each step is shown as one of her replies, with Next / Skip
 * as her choices and a small looping scene below (IntroScene.svelte). Typing anything else ends it and goes to
 * Lumi as a normal question.
 */
export const SKIP = 'Skip';

/** The title on the first line, what it means below it. */
export const INTRO_STEPS = [
	{
		reply:
			'**Ask Lumi anything**\n\nType a question about your videos, or drop a video in. There are no menus to learn.',
		choices: ['Next', SKIP]
	},
	{
		reply:
			"**Lumi answers in cards**\n\nEach answer lands as a card: a video's scenes, what viewers said, side-by-side comparisons. Her reply stays short.",
		choices: ['Next', SKIP]
	},
	{
		reply:
			"**Cards keep up with you**\n\nAsk a follow-up and Lumi updates the card you're looking at, instead of piling up another one.",
		choices: ['Get started']
	}
];

/** How long Lumi "thinks" before each next line, like a real reply. */
export const INTRO_PAUSE = 700;
