<script lang="ts">
	import { Progress } from '@latitudelabs/design-system';
	import CardSection from './CardSection.svelte';
	import CardShell from './CardShell.svelte';
	import { timecode } from './format';
	import type { Card, InsightComment, Insights } from './types';

	let { card }: { card: Card } = $props();
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
	<li class="flex w-56 shrink-0 snap-start flex-col gap-1 rounded-sm bg-muted p-3">
		<span class="text-caption">“{c.text}”</span>
		<span class="text-caption text-muted-foreground">
			{[timecode(c.time), ...(c.emotions ?? [])].join(' · ')}
		</span>
	</li>
{/snippet}

<CardShell {card}>
	{#if card.body}<p class="text-body text-muted-foreground">{card.body}</p>{/if}
	{#if data}
		<ul class="grid grid-cols-2 gap-3 sm:grid-cols-4">
			{#each stats as stat (stat.label)}
				<li class="flex flex-col gap-1 rounded-sm bg-muted p-3">
					<span class="text-heading">{stat.value}</span>
					<span class="text-caption text-muted-foreground">{stat.label}</span>
				</li>
			{/each}
		</ul>

		{#if data.sentiment && sentimentTotal}
			<div class="flex flex-col gap-2">
				<div class="flex h-2 gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
					<div class="bg-success" style:flex-grow={data.sentiment.positive}></div>
					<div class="bg-control" style:flex-grow={data.sentiment.neutral}></div>
					<div class="bg-destructive" style:flex-grow={data.sentiment.negative}></div>
				</div>
				<p class="text-caption text-muted-foreground">
					Comment sentiment: {data.sentiment.positive} positive · {data.sentiment.neutral} neutral · {data
						.sentiment.negative} negative
				</p>
			</div>
		{/if}

		{#if data.questions.length}
			<CardSection title="Questions" count={data.questions.length}>
				{#each data.questions as q, i (i)}
					<li class="flex w-64 shrink-0 snap-start flex-col gap-3 rounded-sm bg-muted p-3">
						<div class="flex flex-col gap-1">
							<span class="text-caption">{q.question}</span>
							<span class="text-caption text-muted-foreground">{q.responses} answers</span>
						</div>
						{#if q.average !== undefined && q.max}
							<div class="flex flex-col gap-2">
								<span class="text-title">{q.average} / {q.max}</span>
								<Progress class="bg-control" value={q.average} max={q.max} aria-label="{q.question}: average answer" />
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
					</li>
				{/each}
			</CardSection>
		{/if}

		{#if data.liked.length}
			<CardSection title="What viewers liked" count={data.liked.length}>
				{#each data.liked as c, i (i)}{@render comment(c)}{/each}
			</CardSection>
		{/if}
		{#if data.disliked.length}
			<CardSection title="What viewers didn't like" count={data.disliked.length}>
				{#each data.disliked as c, i (i)}{@render comment(c)}{/each}
			</CardSection>
		{/if}
	{/if}
</CardShell>
