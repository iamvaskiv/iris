/**
 * Two scripted moments in Lumi's own dock: her orb and reply animation say each line, and a small looping scene with
 * Back / Next / Skip takes the place of her input (the dock's `below`). Each step's title is on the first line, what it
 * means below it. Both play once per browser; restarting onboarding replays them.
 *
 * - The tour (TOUR_STEPS, TourScene.svelte): on someone's first visit to the projects page, before Lumi's welcome:
 *   what Iris does for them.
 * - "How Iris works" (INTRO_STEPS, IntroScene.svelte): the first time they open a project: how working with Lumi
 *   goes. The dock sits centred with the cards out of sight meanwhile, then moves down as they appear.
 */
export const TOUR_STEPS = [
	{
		reply:
			"**Video analysis**\n\nDrop in a video and Lumi breaks it down: its scenes, characters, themes, brands and what's said."
	},
	{
		reply:
			'**Viewer studies**\n\nLumi drafts the questions, timed to moments in your video, ready to share with real viewers.'
	},
	{
		reply:
			'**Insights**\n\nSee how viewers felt, moment by moment: ratings, sentiment and the comments that stand out.'
	},
	{
		reply:
			'**Comparison**\n\nPut videos side by side and see which one lands with viewers, and why.'
	}
];

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
