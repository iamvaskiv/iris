<script lang="ts">
	import { Card, Tile } from '@latitudelabs/design-system';
	import { askable } from '#lib/ask-lumi.js';
	import { timecode } from '../format';
	import type { InsightComment, Insights } from '../types';

	type Question = Insights['questions'][number];
	type Tone = 'positive' | 'neutral' | 'negative';

	/**
	 * How a video landed, in colour: the comment sentiment split (a tinted tile per tone and a bright bar), Questions
	 * (tinted by type like a study's steps: multiple choice orange, sliders and ratings magenta, with bars in that colour),
	 * and What viewers liked (green) and didn't like (red). On the video card's Viewers tab and the (older) viewer data
	 * card. With `onplay`, a comment plays the video from its moment; `ask` gives each part its question for Lumi.
	 */
	let {
		sentiment,
		questions = [],
		liked = [],
		disliked = [],
		ask,
		onplay
	}: {
		sentiment?: Record<Tone, number>;
		questions?: Question[];
		liked?: InsightComment[];
		disliked?: InsightComment[];
		ask?: {
			sentiment?: string;
			question: (q: Question) => string | undefined;
			option: (q: Question, option: { label: string; count: number }, total: number) => string;
			comment: (c: InsightComment, liked: boolean) => string;
		};
		onplay?: (time: number) => void;
	} = $props();

	const percent = (n: number, of: number) => Math.round((n / (of || 1)) * 100);
	const sentimentTotal = $derived(
		sentiment ? sentiment.positive + sentiment.neutral + sentiment.negative : 0
	);

	/** Each tone's colours: a soft tint for its tile, the full colour for its bar and dot. */
	const TONES: { key: Tone; label: string; tint: string; solid: string }[] = [
		{
			key: 'positive',
			label: 'Positive',
			tint: 'bg-category-green/12',
			solid: 'bg-category-green'
		},
		{ key: 'neutral', label: 'Neutral', tint: 'bg-muted', solid: 'bg-control' },
		{ key: 'negative', label: 'Negative', tint: 'bg-chart-red/12', solid: 'bg-chart-red' }
	];

	/** A question's kind, in the colour a study gives that kind of step. */
	function kindOf(q: Question) {
		if (q.average !== undefined && q.max)
			return {
				label: q.type === 'rating' ? 'Rating' : 'Slider',
				tint: 'bg-category-magenta/10',
				track: 'bg-category-magenta/20',
				solid: 'bg-category-magenta'
			};
		return {
			label: 'Multiple choice',
			tint: 'bg-category-orange/10',
			track: 'bg-category-orange/20',
			solid: 'bg-category-orange'
		};
	}
</script>

<!-- A bar in a colour: its share of `max`, on a track tinted the same. -->
{#snippet bar(value: number, max: number, track: string, solid: string, label: string)}
	<div class={['h-2 w-full overflow-hidden rounded-full', track]} role="img" aria-label={label}>
		<div
			class={['h-full rounded-full transition-[width] duration-300', solid]}
			style:width="{percent(value, max)}%"
		></div>
	</div>
{/snippet}

{#snippet comment(c: InsightComment, isLiked: boolean)}
	<li class="w-60">
		<Tile
			class={['h-full w-full gap-2', isLiked ? 'bg-category-green/12' : 'bg-chart-red/12']}
			onclick={onplay && (() => onplay(c.time))}
			{@attach askable(ask?.comment(c, isLiked))}
		>
			<span class="flex gap-2">
				<span
					class={[
						'w-1 shrink-0 self-stretch rounded-full',
						isLiked ? 'bg-category-green' : 'bg-chart-red'
					]}
					aria-hidden="true"
				></span>
				<span class="line-clamp-3 text-caption">“{c.text}”</span>
			</span>
			<span class="mt-auto flex flex-wrap items-center gap-1 text-caption text-muted-foreground">
				{timecode(c.time)}
				{#each (c.emotions ?? []).slice(0, 2) as emotion (emotion)}
					<span class="rounded-full bg-card/70 px-2">{emotion}</span>
				{/each}
			</span>
		</Tile>
	</li>
{/snippet}

<!-- The sentiment split: a tile per tone with its share, then the bar. -->
{#if sentiment && sentimentTotal}
	<div class="flex flex-col gap-3" {@attach askable(ask?.sentiment)}>
		<ul class="grid grid-cols-3 gap-3" aria-label="Comment sentiment">
			{#each TONES as t (t.key)}
				<li class={['flex flex-col gap-1 rounded-md p-3', t.tint]}>
					<span class="flex items-center gap-1.5 text-caption text-muted-foreground">
						<span class={['size-2 rounded-full', t.solid]} aria-hidden="true"></span>{t.label}
					</span>
					<span class="text-title">{percent(sentiment[t.key], sentimentTotal)}%</span>
					<span class="text-caption text-muted-foreground"
						>{sentiment[t.key]} {sentiment[t.key] === 1 ? 'comment' : 'comments'}</span
					>
				</li>
			{/each}
		</ul>
		<div class="flex h-2.5 gap-1" aria-hidden="true">
			{#each TONES as t (t.key)}
				{#if sentiment[t.key]}
					<div class={['rounded-full', t.solid]} style:flex-grow={sentiment[t.key]}></div>
				{/if}
			{/each}
		</div>
	</div>
{/if}

{#if questions.length}
	<Card.Section title="Questions" count={questions.length}>
		{#each questions as q, i (i)}
			{@const kind = kindOf(q)}
			<li class="w-64">
				<Tile class={['h-full gap-3', kind.tint]} {@attach askable(ask?.question(q))}>
					<div class="flex flex-col gap-1">
						<span class="flex items-center gap-1.5 text-caption text-muted-foreground">
							<span class={['size-2 rounded-full', kind.solid]} aria-hidden="true"></span>
							{kind.label} · {q.responses} answers
						</span>
						<span class="text-caption">{q.question}</span>
					</div>
					{#if q.average !== undefined && q.max}
						<div class="mt-auto flex flex-col gap-2">
							<span class="text-heading"
								>{q.average}<span class="text-body text-muted-foreground">{` / ${q.max}`}</span></span
							>
							{@render bar(
								q.average,
								q.max,
								kind.track,
								kind.solid,
								`${q.question}: ${q.average} out of ${q.max} on average`
							)}
						</div>
					{:else if q.options}
						{@const total = q.options.reduce((sum, o) => sum + o.count, 0)}
						{@const top = Math.max(...q.options.map((o) => o.count))}
						<ul class="mt-auto flex flex-col gap-2">
							{#each q.options.slice(0, 4) as option (option.label)}
								<li class="flex flex-col gap-1" {@attach askable(ask?.option(q, option, total))}>
									<span
										class={[
											'flex justify-between gap-2 text-caption',
											option.count === top && 'font-medium'
										]}
									>
										{option.label}<span class="text-muted-foreground"
											>{percent(option.count, total)}%</span
										>
									</span>
									{@render bar(
										option.count,
										total,
										kind.track,
										option.count === top ? kind.solid : `${kind.solid} opacity-60`,
										`${option.label}: ${percent(option.count, total)}% of answers`
									)}
								</li>
							{/each}
						</ul>
					{/if}
				</Tile>
			</li>
		{/each}
	</Card.Section>
{/if}

{#if liked.length}
	<Card.Section title="What viewers liked" count={liked.length}>
		{#each liked as c, i (i)}{@render comment(c, true)}{/each}
	</Card.Section>
{/if}
{#if disliked.length}
	<Card.Section title="What viewers didn't like" count={disliked.length}>
		{#each disliked as c, i (i)}{@render comment(c, false)}{/each}
	</Card.Section>
{/if}
