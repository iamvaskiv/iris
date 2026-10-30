import type { Card, ComparisonData } from '#lib/cards/types.js';
import { comparisonData } from './comparison.js';
import { insights } from './insights.js';
import { sourcesData } from './sources.js';
import { videoCardData } from './video-card.js';

/**
 * Brings saved cards' data up to date before they're shown, in place. Signed media URLs expire after a couple of
 * hours, so video, sources and comparison cards are rebuilt on every visit; insights come from their cache and are refreshed
 * when it expires.
 */
export async function refreshCardData(cards: Card[]) {
	await Promise.all(
		cards.map(async (c) => {
			const id = c.data?.videoId as string | undefined;
			if (c.type === 'video' && id) c.data = await videoCardData(id);
			if (c.type === 'sources' && id) c.data = await sourcesData(id);
			if (c.type === 'insights' && id)
				c.data = (await insights.get(id).catch(() => null)) ?? c.data;
			if (c.type === 'comparison' && c.data?.videoIds)
				c.data = await comparisonData(
					c.data.videoIds as string[],
					c.data.focus as ComparisonData['focus']
				);
		})
	);
}
