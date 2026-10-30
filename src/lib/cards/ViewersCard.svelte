<script lang="ts">
	import { Button, Card, Label, Select, Stat } from '@latitudelabs/design-system';
	import { Play, X } from '@latitudelabs/design-system/icons';
	import { untrack } from 'svelte';
	import { along, ratingCurve, sentimentCurves } from './curve';
	import { timecode } from './format';
	import CurveChart from './timeline/CurveChart.svelte';
	import SceneLines from './timeline/SceneLines.svelte';
	import { TONE_DOT, toneOf } from './viewer';
	import { projectCards, viewerSources } from './viewer-sources';
	import type { Card as CardData, ViewerData, ViewersData } from './types';

	/**
	 * How viewers reacted to several videos, compared. A row per video, in its colour: its poster (play opens it across
	 * the card), a Source picker (Lumiere's real viewers, or one of the project's studies that shows it and has sample
	 * results) and that source's key numbers. Then, along each video (0–100% of its length, so videos of different
	 * lengths line up), every video's sentiment and rating curves laid over each other, and a lane of comments per video.
	 * For Storybook: `studies` stands in for the project's other cards, and `initial.sources` picks sources by video id.
	 */
	let {
		card,
		studies,
		initial = {}
	}: {
		card: CardData;
		studies?: CardData[];
		initial?: { sources?: Record<string, string> };
	} = $props();
	const data = $derived((card.data ?? {}) as Partial<ViewersData>);
	const sharedCards = projectCards();

	/** Category colours, one per video in order. */
	const COLOURS = [
		{ bg: 'bg-category-blue', stroke: 'stroke-category-blue' },
		{ bg: 'bg-category-orange', stroke: 'stroke-category-orange' },
		{ bg: 'bg-category-magenta', stroke: 'stroke-category-magenta' },
		{ bg: 'bg-category-green', stroke: 'stroke-category-green' }
	];

	/** The source picked per video (by video id); a video without one shows its first (Lumiere, when it has data). */
	let picked = $state<Record<string, string>>(untrack(() => ({ ...initial.sources })));

	const videos = $derived(
		(data.videos ?? []).slice(0, COLOURS.length).map((v, i) => {
			const sources = viewerSources(v.viewers, studies ?? sharedCards?.() ?? [], v.videoId);
			const source = sources.find((s) => s.id === picked[v.videoId]) ?? sources[0];
			// Each video's own length is its 100%: from its duration, or else as far as its comments and ratings go.
			const times = [...(source?.viewers.comments ?? []), ...(source?.viewers.ratings ?? [])].map(
				(c) => c.time
			);
			const length = v.duration || Math.max(0, ...times);
			return { ...v, colour: COLOURS[i], sources, source, length };
		})
	);
	type Video = (typeof videos)[number];

	// The key numbers, per video (from its source).
	const total = (d: ViewerData) =>
		d.sentiment ? d.sentiment.positive + d.sentiment.neutral + d.sentiment.negative : 0;
	const shareText = (d: ViewerData, k: 'positive' | 'negative') =>
		total(d) ? `${Math.round(((d.sentiment?.[k] ?? 0) / total(d)) * 100)}%` : '–';
	const metrics: { label: string; text: (v: Video) => string }[] = [
		{ label: 'Viewers', text: (v) => v.source!.viewers.responses.toLocaleString() },
		{
			label: 'Rating',
			text: ({ source: s }) =>
				s!.viewers.rating ? `${s!.viewers.rating.average} / ${s!.viewers.rating.max}` : '–'
		},
		{ label: 'Positive', text: (v) => shareText(v.source!.viewers, 'positive') },
		{ label: 'Negative', text: (v) => shareText(v.source!.viewers, 'negative') },
		{
			label: 'Comments',
			text: ({ source: s }) =>
				((s!.viewers.comments?.length ?? 0) + (s!.reactions?.length ?? 0)).toLocaleString()
		}
	];

	// Along each video, as a share of its length (0–100), so all of them run across the same width. Sentiment is scaled
	// together, so the biggest swing of any video nearly fills the row; ratings run from the lowest mark to full marks.
	const comments = $derived(
		videos.map((v) =>
			v.length
				? (v.source?.viewers.comments ?? []).map((c) => ({ ...c, at: along(c.time, v.length) }))
				: []
		)
	);
	const sentiment = $derived(
		sentimentCurves(
			comments.map((list) => list.map((c) => ({ ...c, time: c.at }))),
			100
		)
	);
	const ratings = $derived(
		videos.map((v) =>
			v.length
				? ratingCurve(
						(v.source?.viewers.ratings ?? []).map((r) => ({ ...r, time: along(r.time, v.length) })),
						100
					)
				: null
		)
	);
	const hasCurves = $derived(videos.some((v) => v.length && v.source));
	/** Gridlines at each quarter of the way through. */
	const QUARTERS = [0, 25, 50, 75].map((start) => ({ start }));

	// Playing a video opens it across the card, under the rows; its playhead runs along the curves.
	let playing = $state<string | null>(null);
	let time = $state(0);
	const playingVideo = $derived(videos.find((v) => v.videoId === playing));
	function play(videoId: string) {
		time = 0;
		playing = videoId;
	}
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>{card.title}</Card.Title>
		<Card.Description>
			{[card.subtitle, `${videos.length} ${videos.length === 1 ? 'video' : 'videos'}`]
				.filter(Boolean)
				.join(' · ')}
		</Card.Description>
	</Card.Header>
	<Card.Content class="flex flex-col gap-6">
		{#if card.body}<p class="text-body text-muted-foreground">{card.body}</p>{/if}

		<!-- A row per video (its colour, which is which below too): poster, name and source, then its key numbers. -->
		<ul class="flex flex-col gap-4" aria-label="Videos">
			{#each videos as v, i (i)}
				<li class="flex items-center gap-4">
					<span class="flex w-96 shrink-0 items-center gap-3">
						<span class={['size-2.5 shrink-0 rounded-full', v.colour.bg]} aria-hidden="true"></span>
						<span class="relative w-28 shrink-0">
							{#if v.poster}
								<img
									src={v.poster}
									alt=""
									class="aspect-video w-full rounded-sm bg-muted object-cover"
								/>
							{:else}
								<span class="block aspect-video w-full rounded-sm bg-muted"></span>
							{/if}
							{#if v.streamUrl}
								<Button
									variant="secondary"
									size="icon-sm"
									aria-label="Play {v.name}"
									onclick={() => play(v.videoId)}
									class="absolute top-1/2 left-1/2 -translate-1/2 shadow-raised"><Play /></Button
								>
							{/if}
						</span>
						<span class="flex min-w-0 flex-1 flex-col gap-1">
							<span class="truncate text-body" title={v.name}>{v.name}</span>
							{#if v.sources.length > 1}
								<Label for="source-{card.id}-{i}" class="sr-only">Source for {v.name}</Label>
								<Select.Root
									type="single"
									value={v.source?.id}
									onValueChange={(id) => (picked[v.videoId] = id)}
								>
									<Select.Trigger id="source-{card.id}-{i}" size="sm" class="max-w-full">
										<span class="truncate">{v.source?.name}</span>
									</Select.Trigger>
									<Select.Content>
										{#each v.sources as s (s.id)}
											<Select.Item
												value={s.id}
												label={s.kind === 'study' ? `${s.name} (sample data)` : s.name}
											/>
										{/each}
									</Select.Content>
								</Select.Root>
							{:else}
								<span class="truncate text-caption text-muted-foreground">
									{[
										v.duration && timecode(v.duration),
										v.source
											? v.source.kind === 'lumiere'
												? 'Real viewers'
												: `${v.source.name} · Sample data`
											: undefined
									]
										.filter(Boolean)
										.join(' · ')}
								</span>
							{/if}
						</span>
					</span>
					{#if v.source}
						<div class="grid flex-1 grid-cols-5 gap-4">
							{#each metrics as m (m.label)}
								<Stat variant="plain" value={m.text(v)} label={m.label} />
							{/each}
						</div>
					{:else}
						<p class="flex-1 text-body text-muted-foreground">
							No viewers yet. Show it on Lumiere, or add it to a study in this project and turn on
							its fake responses (Share).
						</p>
					{/if}
				</li>
			{/each}
		</ul>

		{#if playingVideo?.streamUrl}
			<div class="relative mx-auto w-full max-w-xl">
				<!-- svelte-ignore a11y_media_has_caption -->
				<video
					src={playingVideo.streamUrl}
					poster={playingVideo.poster}
					controls
					autoplay
					ontimeupdate={(e) => (time = e.currentTarget.currentTime)}
					class="aspect-video w-full rounded-md bg-muted"
				></video>
				<Button
					variant="secondary"
					size="icon-sm"
					aria-label="Close video"
					onclick={() => (playing = null)}
					class="absolute top-3 right-3 shadow-raised"><X /></Button
				>
			</div>
		{/if}

		{#if hasCurves}
			<!-- Along each video: labels on the left (w-48), 0–100% of each video on the right, quarter lines through it. -->
			<div class="relative isolate flex flex-col gap-1" role="group" aria-label="Along each video">
				<SceneLines
					segments={QUARTERS}
					duration={100}
					time={playingVideo?.length ? along(time, playingVideo.length) : undefined}
				/>

				<div class="flex h-6 items-center">
					<span class="w-48 shrink-0 text-caption text-muted-foreground">Along each video</span>
					<div class="relative h-full flex-1 text-caption text-muted-foreground" aria-hidden="true">
						{#each [0, 25, 50, 75, 100] as q (q)}
							<span
								class={['absolute top-0', q === 100 ? '-translate-x-full pr-1' : 'pl-1']}
								style:left="{q}%">{q === 0 ? 'Start' : q === 100 ? 'End' : `${q}%`}</span
							>
						{/each}
					</div>
				</div>

				<div class="flex h-24 items-center">
					<span class="flex w-48 shrink-0 flex-col">
						<span class="text-caption">Sentiment</span>
						<span class="text-caption text-muted-foreground">Above the line: positive</span>
					</span>
					<CurveChart
						curves={sentiment.map((paths, i) =>
							comments[i].length ? { paths, stroke: videos[i].colour.stroke } : null
						)}
						label="Comment sentiment along each video, by video"
						duration={100}
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
								(paths, i) => paths && { paths, stroke: videos[i].colour.stroke }
							)}
							label="Average rating along each video, by video"
							duration={100}
						/>
					</div>
				{/if}

				<!-- Each video's comments, a dot at each in its sentiment's colour. -->
				{#each videos as v, i (i)}
					<div class="flex h-10 items-center">
						<span class="flex w-48 shrink-0 items-center gap-2 pr-2">
							<span class={['size-2 shrink-0 rounded-full', v.colour.bg]} aria-hidden="true"></span>
							<span class="truncate text-caption">{v.name}</span>
							<span class="shrink-0 text-caption text-muted-foreground">{comments[i].length}</span>
						</span>
						<div class="relative h-full flex-1">
							{#each comments[i] as c, j (j)}
								<span
									class={[
										'absolute top-1/2 size-2 -translate-1/2 rounded-full',
										TONE_DOT[toneOf(c.sentiment)]
									]}
									style:left="{c.at}%"
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
