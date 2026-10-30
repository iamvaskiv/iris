<script lang="ts">
	import { Card, Stat } from '@latitudelabs/design-system';
	import { curvePaths, smoothCurve } from './curve';
	import { timecode } from './format';
	import { projectCards, studySources, type ViewerSource } from './viewer-sources';
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
		[
			...(data.viewers
				? [{ id: 'lumiere', name: 'Lumiere', kind: 'lumiere' as const, viewers: data.viewers }]
				: []),
			...(data.videoId ? studySources(studies ?? sharedCards?.() ?? [], data.videoId) : [])
		]
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
	const percent = (t: number) => (duration ? Math.min(100, Math.max(0, (t / duration) * 100)) : 0);
	const sentimentCurves = $derived.by(() => {
		const curves = sources.map((s) =>
			smoothCurve(
				(s.viewers.comments ?? []).map((c) => ({ time: c.time, value: (c.sentiment + 1) / 2 })),
				duration,
				{ baseline: 0.5 }
			)
		);
		const swing = Math.max(0, ...curves.flat().map((y) => Math.abs(y - 0.5)));
		return curves.map((ys) =>
			curvePaths(swing ? ys.map((y) => 0.5 + ((y - 0.5) / swing) * 0.45) : ys)
		);
	});
	const ratingCurves = $derived(
		sources.map((s) =>
			(s.viewers.ratings ?? []).length
				? curvePaths(
						smoothCurve(
							(s.viewers.ratings ?? []).map((r) => {
								const min = r.min ?? 1;
								return { time: r.time, value: (r.value - min) / (r.max - min || 1) };
							}),
							duration
						)
					)
				: null
		)
	);
	const segments = $derived(
		(data.scenes ?? []).map((s, i, all) => ({ ...s, end: s.end ?? all[i + 1]?.start ?? duration }))
	);
	const toneDot = (sentiment: number) =>
		sentiment > 0.2 ? 'bg-success' : sentiment < -0.2 ? 'bg-destructive' : 'bg-muted-foreground';
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
				<div class="pointer-events-none absolute inset-y-0 right-0 left-48 z-10" aria-hidden="true">
					{#each segments.slice(1) as s, i (i)}
						<div class="absolute inset-y-0 w-px bg-border" style:left="{percent(s.start)}%"></div>
					{/each}
				</div>

				<div class="flex h-10 items-center">
					<span class="w-48 shrink-0 text-caption text-muted-foreground">Scenes</span>
					<div class="relative h-8 flex-1">
						{#each segments as s, i (i)}
							<div
								class="absolute inset-y-0 truncate rounded-sm bg-muted px-2 text-caption leading-8"
								style:left="calc({percent(s.start)}% + 1px)"
								style:width="calc({percent(s.end) - percent(s.start)}% - 2px)"
								title="{s.title} · {timecode(s.start)}"
							>
								{s.title}
							</div>
						{/each}
					</div>
				</div>

				<div class="flex h-24 items-center">
					<span class="flex w-48 shrink-0 flex-col">
						<span class="text-caption">Sentiment</span>
						<span class="text-caption text-muted-foreground">Above the line: positive</span>
					</span>
					{@render overlay(sentimentCurves, true, 'Comment sentiment along the video, by source')}
				</div>

				{#if ratingCurves.some(Boolean)}
					<div class="flex h-24 items-center">
						<span class="flex w-48 shrink-0 flex-col">
							<span class="text-caption">Rating</span>
							<span class="text-caption text-muted-foreground">Lowest mark to full marks</span>
						</span>
						{@render overlay(ratingCurves, false, 'Average rating along the video, by source')}
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
										toneDot(c.sentiment)
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

<!-- Every source's curve along the video, laid over each other in their colours (with `midline`, a neutral line). -->
{#snippet overlay(curves: ({ line: string } | null)[], midline: boolean, label: string)}
	<div class="h-full flex-1 py-2">
		<svg
			viewBox="0 0 1000 100"
			preserveAspectRatio="none"
			class="size-full overflow-visible"
			role="img"
			aria-label={label}
		>
			{#if midline}
				<line
					x1="0"
					y1="50"
					x2="1000"
					y2="50"
					class="stroke-border"
					vector-effect="non-scaling-stroke"
				/>
			{/if}
			{#each curves as c, i (i)}
				{#if c}
					<path
						d={c.line}
						fill="none"
						class={sources[i].colour.stroke}
						stroke-width="2"
						vector-effect="non-scaling-stroke"
					/>
				{/if}
			{/each}
		</svg>
	</div>
{/snippet}
