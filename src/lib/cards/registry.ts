import type { Component } from 'svelte';
import type { Card } from './types';
import ListCard from './ListCard.svelte';
import QuotesCard from './QuotesCard.svelte';
import TextCard from './TextCard.svelte';
import VideoCard from './VideoCard.svelte';

/** Card type → component. Unknown types render as TextCard. */
const registry: Record<string, Component<{ card: Card }>> = {
	video: VideoCard,
	list: ListCard,
	quotes: QuotesCard,
	text: TextCard
};

export const cardComponent = (type: string) => registry[type] ?? TextCard;
