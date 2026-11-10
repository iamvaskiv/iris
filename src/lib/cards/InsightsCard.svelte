<script lang="ts">
	import { Stat } from '@latitudelabs/design-system';
	import { askable } from '#lib/ask-lumi.js';
	import CardShell from './CardShell.svelte';
	import type { Card as CardData, Insights } from './types';
	import { share } from './format';
	import ViewerSections from './viewers/ViewerSections.svelte';
	import { insightsQuestions } from './viewer-questions';

	let { card }: { card: CardData } = $props();
	const data = $derived(card.data as Insights | undefined);
	const sentimentTotal = $derived(
		data?.sentiment ? data.sentiment.positive + data.sentiment.neutral + data.sentiment.negative : 0
	);
	const number = (n: number) => n.toLocaleString('en-US');
	const ask = $derived(data && insightsQuestions(card.title, data));

	const stats = $derived(
		[
			data?.views !== undefined && {
				value: number(data.views),
				label: 'Views, last 12 months',
				question: ask?.views
			},
			data?.responses && {
				value: number(data.responses),
				label: 'Responses',
				question: ask?.responses
			},
			data?.rating && {
				value: `${data.rating.average} / ${data.rating.max}`,
				label: `Rating, ${data.rating.count} votes`,
				question: ask?.rating
			},
			data?.sentiment &&
				sentimentTotal && {
					value: `${share(data.sentiment.positive, sentimentTotal)}%`,
					label: 'Positive comments',
					question: ask?.positive
				}
		].filter((s) => !!s)
	);
</script>

<CardShell {card}>
	{#if card.body}<p class="text-body text-muted-foreground">{card.body}</p>{/if}
	{#if data}
		<ul class="grid grid-cols-2 gap-3 sm:grid-cols-4">
			{#each stats as stat (stat.label)}
				<li>
					<Stat
						class="h-full"
						value={stat.value}
						label={stat.label}
						{@attach askable(stat.question)}
					/>
				</li>
			{/each}
		</ul>

		<ViewerSections questions={data.questions} liked={data.liked} disliked={data.disliked} {ask} />
	{/if}
</CardShell>
