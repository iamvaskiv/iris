import type { Card } from './types';

/**
 * Experimental lanes: the project page groups cards by topic, one horizontal lane per topic, lanes stacked down the
 * page in the order their first card arrived. A study takes two places in its lane: its setup, then its insights to the
 * right of it.
 */
export type Part = 'setup' | 'insights';
export type Slot = { key: string; card: Card; part?: Part };
export type Lane = { key: string; title: string; slots: Slot[] };

/** A study's insights slot; every other slot is keyed by its card's id. */
const INSIGHTS = '~insights';
export const slotCardId = (key: string) =>
	key.endsWith(INSIGHTS) ? key.slice(0, -INSIGHTS.length) : key;

/**
 * The card's topic: Lumi's, or else by rules: videos (and uploads, comparisons and viewer comparisons) go together under "Videos", a card
 * about one video goes with that video's card, and anything else (a study, a list…) starts a lane of its own.
 */
export function topicOf(card: Card, cards: Card[]): string {
	if (card.topic?.trim()) return card.topic.trim();
	if (['video', 'upload', 'comparison', 'viewers'].includes(card.type)) return 'Videos';
	const videoId = card.data?.videoId;
	const video = videoId
		? cards.find((c) => c.type === 'video' && c.data?.videoId === videoId)
		: undefined;
	return video ? topicOf(video, cards) : card.title;
}

export function lanes(cards: Card[]): Lane[] {
	const byKey = new Map<string, Lane>();
	for (const card of cards) {
		const title = topicOf(card, cards);
		const key = title.toLowerCase();
		let lane = byKey.get(key);
		if (!lane) byKey.set(key, (lane = { key, title, slots: [] }));
		if (card.type === 'study')
			lane.slots.push(
				{ key: card.id, card, part: 'setup' },
				{ key: card.id + INSIGHTS, card, part: 'insights' }
			);
		else lane.slots.push({ key: card.id, card });
	}
	return [...byKey.values()];
}
