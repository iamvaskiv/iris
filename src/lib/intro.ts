/**
 * Two scripted moments in Lumi's own dock: her orb and reply animation say each line, and a small looping scene with
 * Back / Next takes the place of her input (the dock's `below`), with Skip in the top-right corner and the rest of
 * the page's chrome (logo, nav, breadcrumb) out of the way. Written for someone who has never seen Iris. Each step's title is on the first line, what it
 * means below it. Both play once per browser; restarting onboarding replays them.
 *
 * - The tour (TOUR_STEPS, TourScene.svelte): on someone's first visit to the projects page, before Lumi's welcome:
 *   Lumi says hello, then what she does for them, in her own voice.
 * - "How Iris works" (INTRO_STEPS, IntroScene.svelte): the first time they open a project: how working with Lumi
 *   goes. The dock sits centred with the cards out of sight meanwhile, then moves down as they appear.
 */
/** The tour's main button: on Lumi's hello, between steps, and on the last step. */
export const TOUR_BUTTONS = { first: "Let's begin!", next: 'Continue', last: "Let's go" };
/** The project intro's main button: between steps, and on the last step. */
export const INTRO_BUTTONS = { next: 'Continue', last: 'Got it' };

export const TOUR_STEPS = [
	{
		reply:
			"**Hey, I'm Lumi**\n\nYour video intelligence. I'll help you uncover insights about your videos, and so much more."
	},
	{
		reply:
			"**See what's in your video**\n\nAdd a video and I'll watch it for you: its scenes, who's in it, the themes and everything that's said."
	},
	{
		reply:
			"**Ask real viewers**\n\nCurious what people think? I'll write the questions and pin each one to the right moment in your video."
	},
	{
		reply:
			'**Learn how it landed**\n\nSee how viewers felt as they watched: their ratings, the moments they loved, and the comments worth reading.'
	},
	{
		reply:
			'**Compare your videos**\n\nPut two cuts side by side and find out which one people prefer, and why.'
	}
];

export const INTRO_STEPS = [
	{
		reply:
			"**Just ask**\n\nType a question the way you'd ask a colleague, or drop in a video. There are no menus to learn."
	},
	{
		reply:
			'**Answers come as cards**\n\nLumi keeps her replies short and puts the details on cards, like scenes, viewer reactions and comparisons.'
	},
	{
		reply:
			"**Your cards stay up to date**\n\nAsk a follow-up and Lumi updates the card you're looking at, so your project stays tidy."
	}
];
