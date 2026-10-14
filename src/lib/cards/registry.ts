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
