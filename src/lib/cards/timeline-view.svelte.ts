import { readLocal, writeLocal } from '#lib/local.js';
import type { Card, VideoCardData } from './types';

const KEY = 'iris.video.timeline-view';

/**
 * Video cards' Timeline view, on or off for all of them at once and remembered on this device.
 */
export const timelineView = $state({ on: false });

/** Call after mount (not during SSR/hydration) to pick up the saved choice. */
export function loadTimelineView() {
	timelineView.on = readLocal(KEY) === 'true';
}

export function setTimelineView(on: boolean) {
	timelineView.on = on;
	writeLocal(KEY, String(on));
}

/** Whether a video card has anything to show as lanes: a length, and something placed in the video or comments. */
export function hasLanes(card: Card) {
	const data = card.data as Partial<VideoCardData> | undefined;
	return (
		card.type === 'video' &&
		!!data?.duration &&
		(!!data.viewers?.comments?.length ||
			[data.characters, data.themes, data.brands].some((list) =>
				list?.some((item) => item.appearances?.length)
			))
	);
}

/** How wide a video card is: full size while it shows Timeline view's lanes, wide otherwise. */
export const videoCardSize = (card: Card) => (timelineView.on && hasLanes(card) ? 'full' : 'wide');
