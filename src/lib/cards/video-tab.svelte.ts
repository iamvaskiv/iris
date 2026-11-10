import { readLocal, writeLocal } from '#lib/local.js';
import type { Card, VideoCardData } from './types';

const KEY = 'iris.video.tab';
/** The earlier on/off Timeline view, read once so it carries over. */
const LEGACY_KEY = 'iris.video.timeline-view';

/**
 * A video card's tabs: Overview (what's in it: scenes, characters, themes, brands), Timeline (all of it as lanes
 * along the video) and Viewers (how it landed: questions, liked and disliked, every comment).
 */
export type VideoTab = 'overview' | 'timeline' | 'viewers';
const TABS: VideoTab[] = ['overview', 'timeline', 'viewers'];

/**
 * Which tab video cards show, for all of them at once and remembered on this device. A card without what a tab needs
 * falls back to Overview. Lumi can switch it too, when she points to a video card's viewers.
 */
export const videoTab = $state<{ current: VideoTab }>({ current: 'overview' });

/** Call after mount (not during SSR/hydration) to pick up the saved choice. */
export function loadVideoTab() {
	const saved = readLocal(KEY) as VideoTab | null;
	videoTab.current =
		saved && TABS.includes(saved)
			? saved
			: readLocal(LEGACY_KEY) === 'true'
				? 'timeline'
				: 'overview';
}

export function setVideoTab(tab: VideoTab) {
	videoTab.current = tab;
	writeLocal(KEY, tab);
}

export const isVideoTab = (tab: unknown): tab is VideoTab => TABS.includes(tab as VideoTab);

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
