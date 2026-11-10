/**
 * "How Iris works": Lumi introduces herself and Iris through her own dock on the projects page, on someone's first
 * visit (and after restarting onboarding), before her welcome. Each step is one of her replies, with the person's
 * answers as her choices and a small looping scene below (IntroScene.svelte). Typing anything else ends it and goes to
 * Lumi as a normal question.
 */
export const SKIP = 'Skip the intro';

export const INTRO_STEPS = [
	{
		reply:
			"Hi, I'm **Lumi**. Ask me anything about your videos, or just drop one in. There are no menus to learn.",
		choices: ['Tell me more', SKIP]
	},
	{
		reply:
			"I answer with **cards**: a video's scenes, what viewers said, side-by-side comparisons. My replies stay short.",
		choices: ['Go on', SKIP]
	},
	{
		reply:
			"Ask a follow-up and I'll **update the card** you're looking at, instead of piling up another one.",
		choices: ['Got it']
	}
];

/** How long Lumi "thinks" before each next line, like a real reply. */
export const INTRO_PAUSE = 700;
