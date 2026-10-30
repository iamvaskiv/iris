<script lang="ts">
	import { Card, Stat } from '@latitudelabs/design-system';
	import { along, ratingCurve, sceneSegments, sentimentCurves } from './curve';
	import { timecode } from './format';
	import CurveChart from './timeline/CurveChart.svelte';
	import SceneBlocks from './timeline/SceneBlocks.svelte';
	import SceneLines from './timeline/SceneLines.svelte';
	import { TONE_DOT, toneOf } from './viewer';
	import { projectCards, viewerSources, type ViewerSource } from './viewer-sources';
	import type { Card as CardData, SourcesData } from './types';

	/**
	 * One video's viewer data compared across its sources: Lumiere (real viewers) and each of the project's studies that
	 * shows it and has sample results. A row per source, in its colour, with its key numbers; then along the
	 * video, under its scenes, every source's sentiment curve and rating curve laid over each other, and a lane of
	 * comments per source. `studies` is for Storybook (the page shares the project's cards otherwise).
	 */
	let { card, studies }: { card: CardData; studies?: CardData[] } = $props();
	const data = $derived((card.data ?? {}) as Partial<SourcesData>);
	const sharedCards = projectCards();

	/** Category colours, one per source in order: Lumiere first (blue), then the studies. */
	const COLOURS = [
		{ bg: 'bg-category-blue', stroke: 'stroke-category-blue' },
		{ bg: 'bg-category-orange', stroke: 'stroke-category-orange' },
		{ bg: 'bg-category-magenta', stroke: 'stroke-category-magenta' },
		{ bg: 'bg-category-green', stroke: 'stroke-category-green' }
	];
	const sources = $derived(
		viewerSources(data.viewers, studies ?? sharedCards?.() ?? [], data.videoId)
			.slice(0, COLOURS.length)
			.map((s, i) => ({ ...s, colour: COLOURS[i] }))
	);
	type Source = ViewerSource & { colour: (typeof COLOURS)[number] };

	// The key numbers, per source.
	const total = (s: Source) => {
		const c = s.viewers.sentiment;
		return c ? c.positive + c.neutral + c.negative : 0;
	};
	const share = (s: Source, k: 'positive' | 'negative') =>
		total(s) ? ((s.viewers.sentiment?.[k] ?? 0) / total(s)) * 100 : undefined;
	const commentCount = (s: Source) =>
		(s.viewers.comments?.length ?? 0) + (s.reactions?.length ?? 0);
	const shareText = (s: Source, k: 'positive' | 'negative') => {
		const v = share(s, k);
		return v === undefined ? '–' : `${Math.round(v)}%`;
	};
	const metrics: { label: string; text: (s: Source) => string }[] = [
		{ label: 'Viewers', text: (s) => s.viewers.responses.toLocaleString() },
		{
			label: 'Rating',
			text: (s) =>
				s.viewers.rating ? `${s.viewers.rating.average} / ${s.viewers.rating.max}` : '–'
		},
		{ label: 'Positive', text: (s) => shareText(s, 'positive') },
		{ label: 'Negative', text: (s) => shareText(s, 'negative') },
		{ label: 'Comments', text: (s) => commentCount(s).toLocaleString() }
	];

	// Along the video: each source's curves on one shared scale, so they compare. Sentiment is scaled together, so the
	// biggest swing of any source nearly fills the row; ratings run from the lowest mark to full marks.
	const duration = $derived(data.duration ?? 0);
	const percent = (t: number) => along(t, duration);
	const sentiment = $derived(
		sentimentCurves(
			sources.map((s) => s.viewers.comments ?? []),
			duration
		)
	);
	const ratings = $derived(sources.map((s) => ratingCurve(s.viewers.ratings ?? [], duration)));
	const segments = $derived(sceneSegments(data.scenes ?? [], duration));
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>{card.title}</Card.Title>
		<Card.Description>
			{[data.videoName, `${sources.length} ${sources.length === 1 ? 'source' : 'sources'}`]
				.filter(Boolean)
				.join(' · ')}
		</Card.Description>
	</Card.Header>
	<Card.Content class="flex flex-col gap-6">
		{#if card.body}<p class="text-body text-muted-foreground">{card.body}</p>{/if}

		{#if sources.length < 2}
			<p class="text-body text-muted-foreground">
				Only one source so far. Add a study with this video to the project and turn on its fake
				responses (Share), and it shows up here to compare.
			</p>
		{/if}

		<!-- A row per source (its colour, which is which below too), its key numbers lined up in columns. -->
		<ul class="flex flex-col gap-4" aria-label="Sources">
			{#each sources as s (s.id)}
				<li class="flex items-start gap-4">
					<span class="flex w-48 shrink-0 items-start gap-2 pt-0.5">
						<span class={['mt-1.5 size-2.5 shrink-0 rounded-full', s.colour.bg]} aria-hidden="true"
						></span>
						<span class="flex min-w-0 flex-col">
							<span class="truncate text-body">{s.name}</span>
							<span class="text-caption text-muted-foreground"
								>{s.kind === 'lumiere' ? 'Real viewers' : 'Sample data'}</span
							>
						</span>
					</span>
					<div class="grid flex-1 grid-cols-5 gap-4">
						{#each metrics as m (m.label)}
							<Stat variant="plain" value={m.text(s)} label={m.label} />
						{/each}
					</div>
				</li>
			{/each}
		</ul>

		{#if duration}
			<!-- Along the video: labels on the left (w-48), the video's length on the right, scene lines through it all. -->
			<div class="relative isolate flex flex-col gap-1" role="group" aria-label="Along the video">
				<SceneLines {segments} {duration} />

				<div class="flex h-10 items-center">
					<span class="w-48 shrink-0 text-caption text-muted-foreground">Scenes</span>
					<SceneBlocks {segments} {duration} />
				</div>

				<div class="flex h-24 items-center">
					<span class="flex w-48 shrink-0 flex-col">
						<span class="text-caption">Sentiment</span>
						<span class="text-caption text-muted-foreground">Above the line: positive</span>
					</span>
					<CurveChart
						curves={sentiment.map((paths, i) => ({ paths, stroke: sources[i].colour.stroke }))}
						label="Comment sentiment along the video, by source"
						{duration}
						midline
					/>
				</div>

				{#if ratings.some(Boolean)}
					<div class="flex h-24 items-center">
						<span class="flex w-48 shrink-0 flex-col">
							<span class="text-caption">Rating</span>
							<span class="text-caption text-muted-foreground">Lowest mark to full marks</span>
						</span>
						<CurveChart
							curves={ratings.map(
								(paths, i) => paths && { paths, stroke: sources[i].colour.stroke }
							)}
							label="Average rating along the video, by source"
							{duration}
						/>
					</div>
				{/if}

				<!-- Each source's comments, a dot at each in its sentiment's colour. -->
				{#each sources as s (s.id)}
					<div class="flex h-10 items-center">
						<span class="flex w-48 shrink-0 items-center gap-2">
							<span class={['size-2 shrink-0 rounded-full', s.colour.bg]} aria-hidden="true"></span>
							<span class="truncate text-caption">{s.name}</span>
							<span class="shrink-0 text-caption text-muted-foreground"
								>{s.viewers.comments?.length ?? 0}</span
							>
						</span>
						<div class="relative h-full flex-1">
							{#each s.viewers.comments ?? [] as c, i (i)}
								<span
									class={[
										'absolute top-1/2 size-2 -translate-1/2 rounded-full',
										TONE_DOT[toneOf(c.sentiment)]
									]}
									style:left="{percent(c.time)}%"
									title="{timecode(c.time)} · {c.text}"
								></span>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</Card.Content>
</Card.Root>
