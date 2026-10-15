<script lang="ts">
	import { Card, Progress, SentimentBar, Stat, Tile } from '@latitudelabs/design-system';
	import CardShell from './CardShell.svelte';
	import { timecode } from './format';
	import type { Card as CardData, InsightComment, Insights } from './types';

	let { card }: { card: CardData } = $props();
	const data = $derived(card.data as Insights | undefined);
	const sentimentTotal = $derived(
		data?.sentiment ? data.sentiment.positive + data.sentiment.neutral + data.sentiment.negative : 0
	);
	const percent = (n: number, of: number) => Math.round((n / of) * 100);
	const number = (n: number) => n.toLocaleString('en-US');

	const stats = $derived(
		[
			data?.views !== undefined && { value: number(data.views), label: 'Views, last 12 months' },
			data?.responses && { value: number(data.responses), label: 'Responses' },
			data?.rating && {
				value: `${data.rating.average} / ${data.rating.max}`,
				label: `Rating, ${data.rating.count} votes`
			},
			data?.sentiment &&
				sentimentTotal && {
					value: `${percent(data.sentiment.positive, sentimentTotal)}%`,
					label: 'Positive comments'
				}
		].filter((s) => !!s)
	);
</script>

{#snippet comment(c: InsightComment)}
	<li class="w-56">
		<Tile class="h-full">
			<span class="text-caption">“{c.text}”</span>
			<span class="text-caption text-muted-foreground">
				{[timecode(c.time), ...(c.emotions ?? [])].join(' · ')}
			</span>
		</Tile>
	</li>
{/snippet}

<CardShell {card}>
	{#if card.body}<p class="text-body text-muted-foreground">{card.body}</p>{/if}
	{#if data}
		<ul class="grid grid-cols-2 gap-3 sm:grid-cols-4">
			{#each stats as stat (stat.label)}
				<li><Stat class="h-full" value={stat.value} label={stat.label} /></li>
			{/each}
		</ul>

		{#if data.sentiment && sentimentTotal}
			<SentimentBar {...data.sentiment} label="Comment sentiment:" />
		{/if}

		{#if data.questions.length}
			<Card.Section title="Questions" count={data.questions.length}>
				{#each data.questions as q, i (i)}
					<li class="w-64">
						<Tile class="h-full gap-3">
							<div class="flex flex-col gap-1">
								<span class="text-caption">{q.question}</span>
								<span class="text-caption text-muted-foreground">{q.responses} answers</span>
							</div>
							{#if q.average !== undefined && q.max}
								<div class="flex flex-col gap-2">
									<span class="text-title">{q.average} / {q.max}</span>
									<Progress
										class="bg-control"
										value={q.average}
										max={q.max}
										aria-label="{q.question}: average answer"
									/>
								</div>
							{:else if q.options}
								{@const total = q.options.reduce((sum, o) => sum + o.count, 0)}
								<ul class="flex flex-col gap-2">
									{#each q.options.slice(0, 4) as option (option.label)}
										<li class="flex flex-col gap-1">
											<span class="flex justify-between gap-2 text-caption">
												{option.label}<span class="text-muted-foreground"
													>{percent(option.count, total)}%</span
												>
											</span>
											<Progress
												class="bg-control"
												value={option.count}
												max={total}
												aria-label="{option.label}: share of answers"
											/>
										</li>
									{/each}
								</ul>
							{/if}
						</Tile>
					</li>
				{/each}
			</Card.Section>
		{/if}

		{#if data.liked.length}
			<Card.Section title="What viewers liked" count={data.liked.length}>
				{#each data.liked as c, i (i)}{@render comment(c)}{/each}
			</Card.Section>
		{/if}
		{#if data.disliked.length}
			<Card.Section title="What viewers didn't like" count={data.disliked.length}>
				{#each data.disliked as c, i (i)}{@render comment(c)}{/each}
			</Card.Section>
		{/if}
	{/if}
</CardShell>
