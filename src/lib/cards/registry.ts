import type { Component } from 'svelte';
import type { Card } from './types';
import { hasLanes, timelineView } from './timeline-view.svelte';
import ComparisonCard from './ComparisonCard.svelte';
import InsightsCard from './InsightsCard.svelte';
import ListCard from './ListCard.svelte';
import QuotesCard from './QuotesCard.svelte';
import StudyCard from './StudyCard.svelte';
import TableCard from './TableCard.svelte';
import TextCard from './TextCard.svelte';
import UploadCard from './UploadCard.svelte';
import VideoCard from './VideoCard.svelte';

/** Card type → component. Unknown types render as TextCard. */
const registry: Record<string, Component<{ card: Card }>> = {
	video: VideoCard,
	insights: InsightsCard,
	comparison: ComparisonCard,
	list: ListCard,
	quotes: QuotesCard,
	study: StudyCard,
	table: TableCard,
	text: TextCard,
	upload: UploadCard
};

export const cardComponent = (type: string) => registry[type] ?? TextCard;

/**
 * How much room a card takes: the reading width (max-w-3xl); `wide` (max-w-5xl) for video cards, comparisons of
 * three or more videos and tables with many columns; `full` (the page's width, from below the header to behind Lumi's
 * input) for studies (a question list beside a preview) and video cards in Timeline view (the video beside its title,
 * its lanes scrolling below).
 */
export function cardSize(card: Card): 'normal' | 'wide' | 'full' {
	if (card.type === 'study' || (card.type === 'video' && timelineView.on && hasLanes(card)))
		return 'full';
	const videos = (card.data?.videoIds as string[] | undefined)?.length ?? 0;
	if (
		card.type === 'video' ||
		(card.type === 'comparison' && videos >= 3) ||
		(card.type === 'table' && (card.columns?.length ?? 0) >= 5)
	)
		return 'wide';
	return 'normal';
}
