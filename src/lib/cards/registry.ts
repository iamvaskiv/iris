import type { Component } from 'svelte';
import type { Card } from './types';
import ComparisonCard from './ComparisonCard.svelte';
import InsightsCard from './InsightsCard.svelte';
import ListCard from './ListCard.svelte';
import QuotesCard from './QuotesCard.svelte';
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
	table: TableCard,
	text: TextCard,
	upload: UploadCard
};

export const cardComponent = (type: string) => registry[type] ?? TextCard;

/** Cards that need more room than the reading width: comparisons of three or more videos, tables with many columns. */
export const isWide = (card: Card) =>
	(card.type === 'comparison' && ((card.data?.videoIds as string[] | undefined)?.length ?? 0) >= 3) ||
	(card.type === 'table' && (card.columns?.length ?? 0) >= 5);
