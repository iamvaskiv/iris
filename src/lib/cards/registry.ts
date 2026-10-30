import type { Component } from 'svelte';
import type { Card } from './types';
import type { Part } from './lanes';
import { videoCardSize } from './timeline-view.svelte';
import ComparisonCard from './ComparisonCard.svelte';
import InsightsCard from './InsightsCard.svelte';
import ListCard from './ListCard.svelte';
import QuotesCard from './QuotesCard.svelte';
import SourcesCard from './SourcesCard.svelte';
import StudyCard from './StudyCard.svelte';
import TableCard from './TableCard.svelte';
import TextCard from './TextCard.svelte';
import UploadCard from './UploadCard.svelte';
import VideoCard from './VideoCard.svelte';

/** Card type → component. Unknown types render as TextCard. In lanes a study also gets which side it shows (`part`). */
const registry: Record<string, Component<{ card: Card; part?: Part }>> = {
	video: VideoCard,
	insights: InsightsCard,
	comparison: ComparisonCard,
	list: ListCard,
	quotes: QuotesCard,
	sources: SourcesCard,
	study: StudyCard,
	table: TableCard,
	text: TextCard,
	upload: UploadCard
};

export const cardComponent = (type: string) => registry[type] ?? TextCard;

/**
 * How much room a card takes: the reading width (max-w-3xl); `wide` (max-w-5xl) for video and sources cards,
 * comparisons of three or more videos and tables with many columns; `full` (the page's width, from below the header to
 * behind Lumi's input) for studies (a question list beside a preview) and video cards in Timeline view (the video
 * beside its title, its lanes scrolling below). A study's insights, shown on their own in lanes, are wide.
 */
export function cardSize(card: Card, part?: Part): 'normal' | 'wide' | 'full' {
	if (card.type === 'study') return part === 'insights' ? 'wide' : 'full';
	// Its own module knows: full size in Timeline view, wide otherwise.
	if (card.type === 'video') return videoCardSize(card);
	const videos = (card.data?.videoIds as string[] | undefined)?.length ?? 0;
	if (
		card.type === 'sources' ||
		(card.type === 'comparison' && videos >= 3) ||
		(card.type === 'table' && (card.columns?.length ?? 0) >= 5)
	)
		return 'wide';
	return 'normal';
}
