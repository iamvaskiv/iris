/**
 * "How Iris works": three steps scripted through Lumi's own dock on the projects page, on someone's first visit
 * (and after restarting onboarding), before her welcome. Fully scripted: each step is shown as one of her replies,
 * with a small looping scene (IntroScene.svelte) and Back / Next / Skip in place of her input.
 */
/** The title on the first line, what it means below it. */
export const INTRO_STEPS = [
	{
		reply:
			'**Ask Lumi anything**\n\nType a question about your videos, or drop a video in. There are no menus to learn.'
	},
	{
		reply:
			"**Lumi answers in cards**\n\nEach answer lands as a card: a video's scenes, what viewers said, side-by-side comparisons. Her reply stays short."
	},
	{
		reply:
			"**Cards keep up with you**\n\nAsk a follow-up and Lumi updates the card you're looking at, instead of piling up another one."
	}
];
