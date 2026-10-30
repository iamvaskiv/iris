<script lang="ts" module>
	import type { Span } from './types';

	/** One lane: something on the card and where it's on screen. `index` is its place in the card's own list. */
	export type Lane = {
		name: string;
		sub?: string;
		image?: string;
		appearances?: Span[];
		index: number;
	};
	/** A kind of lane (characters, themes, brands), in its category colour. */
	export type LaneGroup = {
		kind: 'character' | 'theme' | 'brand';
		title: string;
		bar: string;
		lanes: Lane[];
	};
	/** A viewer's comment, where in the video it was left. */
	export type CommentMark = {
		time: number;
		/** From -1 (negative) to 1 (positive). */
		sentiment: number;
		tone: 'positive' | 'neutral' | 'negative';
		text: string;
	};
</script>

<script lang="ts">
	import { Avatar } from '@latitudelabs/design-system';
	import { ChevronDown } from '@latitudelabs/design-system/icons';
	import { curvePaths, smoothCurve } from './curve';
	import { timecode } from './format';

	/**
	 * The video as lanes (Timeline view): the scenes across the top, viewers' comments by sentiment (positive, neutral and negative,
	 * when it was shown to an audience; click one to go to it), then a lane for each character, theme and brand
	 * with bars where it's on screen, longest screen time first. Scene boundaries and the playhead run through every
	 * lane. Click a lane to go to that moment (`onseek`); click a name to pick it (`onpick`, as on the card).
	 */
	let {
		duration,
		time,
		scenes,
		groups,
		comments = [],
		ratings = [],
		picked,
		onseek,
		onpick
	}: {
		duration: number;
		time: number;
		scenes: { title: string; start: number; end?: number }[];
		groups: LaneGroup[];
		comments?: CommentMark[];
		/** Star ratings, where in the video they were given. */
		ratings?: { time: number; value: number; max: number; min?: number }[];
		picked: { kind: LaneGroup['kind']; index: number } | null;
		onseek: (time: number) => void;
		onpick: (kind: LaneGroup['kind'], index: number) => void;
	} = $props();

	const percent = (t: number) => (duration ? Math.min(100, Math.max(0, (t / duration) * 100)) : 0);
	const segments = $derived(
		scenes.map((s, i) => ({ ...s, end: s.end ?? scenes[i + 1]?.start ?? duration }))
	);
	const screenTime = (lane: Lane) =>
		(lane.appearances ?? []).reduce((n, s) => n + s.end - s.start, 0);
	const sorted = (lanes: Lane[]) => [...lanes].sort((a, b) => screenTime(b) - screenTime(a));
	const share = (lane: Lane) => Math.round(percent(screenTime(lane)));
	const isPicked = (kind: LaneGroup['kind'], lane: Lane) =>
		picked?.kind === kind && picked.index === lane.index;
	const initials = (name: string) =>
		name
			.split(' ')
			.map((w) => w[0])
			.slice(0, 2)
			.join('');

	/** Which groups are open: all of them to begin with, as on the card's sections. */
	const open = $state<Record<string, boolean>>({
		scenes: true,
		viewers: true,
		rating: true,
		character: true,
		theme: true,
		brand: true
	});

	// Charts: how positive the comments were along the video (a curve about a neutral midline), and the average rating
	// along it (a rating question at the end shows as one rise there).
	// Scaled so its biggest swing nearly fills the row: comments are often mildly positive throughout, and a true
	// scale would leave a near-flat line. Above the midline is still positive, below it negative.
	const sentimentCurve = $derived.by(() => {
		const ys = smoothCurve(
			comments.map((c) => ({ time: c.time, value: (c.sentiment + 1) / 2 })),
			duration,
			{ baseline: 0.5 }
		);
		const swing = Math.max(...ys.map((y) => Math.abs(y - 0.5)));
		return curvePaths(swing ? ys.map((y) => 0.5 + ((y - 0.5) / swing) * 0.45) : ys);
	});
	const ratingCurve = $derived(
		curvePaths(
			smoothCurve(
				// The lowest mark (one star, or 0 on a slider) at the bottom, full marks at the top.
				ratings.map((r) => {
					const min = r.min ?? 1;
					return { time: r.time, value: (r.value - min) / (r.max - min || 1) };
				}),
				duration
			)
		)
	);
	const ratingAverage = $derived(
		ratings.length ? ratings.reduce((n, r) => n + r.value, 0) / ratings.length : 0
	);

	/** Unique per card, for the charts' gradient ids. */
	const uid = $props.id();

	const TONES = [
		{ key: 'positive', label: 'Positive', dot: 'bg-success' },
		{ key: 'neutral', label: 'Neutral', dot: 'bg-muted-foreground' },
		{ key: 'negative', label: 'Negative', dot: 'bg-destructive' }
	] as const;

	/** Clicking a lane goes to that moment. */
	function seek(e: MouseEvent) {
		const box = (e.currentTarget as HTMLElement).getBoundingClientRect();
		onseek(Math.min(1, Math.max(0, (e.clientX - box.left) / box.width)) * duration);
	}
</script>

<!-- Labels on the left (w-48), lanes on the right; the overlay of scene lines and the playhead covers the lanes. -->
<!-- Isolated, so the overlay stays above the lanes but under Lumi's dock. -->
<div class="relative isolate flex flex-col" role="group" aria-label="Timeline view">
	<div class="pointer-events-none absolute inset-y-0 right-0 left-48 z-10" aria-hidden="true">
		{#each segments.slice(1) as s, i (i)}
			<div class="absolute inset-y-0 w-px bg-border" style:left="{percent(s.start)}%"></div>
		{/each}
		<div
			class="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-foreground"
			style:left="{percent(time)}%"
		></div>
	</div>

	{@render toggle('scenes', 'Scenes', segments.length)}
	<!-- The scenes: a block each, titled; click one to go to its start. -->
	{#if open.scenes}
		<div class="flex h-12 items-center">
			<span class="w-48 shrink-0"></span>
			<div class="relative h-8 flex-1">
				{#each segments as s, i (i)}
					<button
						type="button"
						class="absolute inset-y-0 truncate rounded-sm bg-muted px-2 text-left text-caption outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
						style:left="calc({percent(s.start)}% + 1px)"
						style:width="calc({percent(s.end) - percent(s.start)}% - 2px)"
						title="{s.title} · {timecode(s.start)}"
						onclick={() => onseek(s.start)}>{s.title}</button
					>
				{/each}
			</div>
		</div>
	{/if}

	{#if ratings.length}
		{@render toggle('rating', 'Rating', ratings.length)}
		{#if open.rating}
			<div class="flex h-20 items-center">
				<span class="flex w-48 shrink-0 flex-col">
					<span class="text-caption">Average rating</span>
					<span class="text-caption text-muted-foreground"
						>{ratingAverage.toFixed(1)} / {ratings[0].max} · {ratings.length}
						{ratings.length === 1 ? 'rating' : 'ratings'}</span
					>
				</span>
				{@render chart(ratingCurve, false, 'Average rating along the video')}
			</div>
		{/if}
	{/if}

	{#if comments.length}
		{@render toggle('viewers', 'Sentiment', comments.length)}
		{#if open.viewers}
			<div class="flex h-20 items-center">
				<span class="flex w-48 shrink-0 flex-col">
					<span class="text-caption">Over time</span>
					<span class="text-caption text-muted-foreground">Above the line: positive</span>
				</span>
				{@render chart(sentimentCurve, true, 'Comment sentiment along the video')}
			</div>
		{/if}
		{#each open.viewers ? TONES : [] as tone (tone.key)}
			{@const own = comments.filter((c) => c.tone === tone.key)}
			<div class="flex h-12 items-center">
				<span class="flex w-48 shrink-0 flex-col">
					<span class="text-caption">{tone.label}</span>
					<span class="text-caption text-muted-foreground"
						>{own.length} {own.length === 1 ? 'comment' : 'comments'}</span
					>
				</span>
				<div class="relative h-full flex-1">
					{#each own as c, i (i)}
						<button
							type="button"
							class={[
								'absolute top-1/2 size-2.5 -translate-1/2 rounded-full outline-none hover:scale-150 focus-visible:ring-2 focus-visible:ring-ring',
								tone.dot
							]}
							style:left="{percent(c.time)}%"
							title="{timecode(c.time)} · {c.text}"
							aria-label="{tone.label} comment at {timecode(c.time)}: {c.text}"
							onclick={() => onseek(c.time)}
						></button>
					{/each}
				</div>
			</div>
		{/each}
	{/if}

	{#each groups.filter((g) => g.lanes.length) as group (group.kind)}
		{@render toggle(group.kind, group.title, group.lanes.length)}
		{#each open[group.kind] ? sorted(group.lanes) : [] as lane (lane.index)}
			{@const on = isPicked(group.kind, lane)}
			<div class={['flex h-12 items-center rounded-sm', on && 'bg-accent']}>
				<button
					type="button"
					aria-pressed={on}
					onclick={() => onpick(group.kind, lane.index)}
					class="flex w-48 shrink-0 items-center gap-2 rounded-sm pr-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
				>
					{#if group.kind === 'character'}
						<Avatar.Root class="size-7 shrink-0 overflow-hidden">
							{#if lane.image}<Avatar.Image
									src={lane.image}
									alt=""
									class="scale-150 object-cover"
								/>{/if}
							<Avatar.Fallback class="text-caption">{initials(lane.name)}</Avatar.Fallback>
						</Avatar.Root>
					{/if}
					<span class="flex min-w-0 flex-col">
						<span class="truncate text-caption">{lane.name}</span>
						<span class="truncate text-caption text-muted-foreground">
							{lane.appearances?.length ? `${share(lane)}% on screen` : 'not placed'}
						</span>
					</span>
				</button>
				<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
				<div class="relative h-full flex-1 cursor-pointer" onclick={seek}>
					{#each lane.appearances ?? [] as s, i (i)}
						<div
							class={[
								'absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full',
								group.bar,
								picked && !on && 'opacity-40'
							]}
							style:left="{percent(s.start)}%"
							style:width="max(4px, {percent(s.end) - percent(s.start)}%)"
						></div>
					{/each}
				</div>
			</div>
		{/each}
	{/each}
</div>

<!-- A group's heading, opening and closing it like the card's sections (title · count, and a chevron). -->
{#snippet toggle(key: string, title: string, count: number)}
	<button
		type="button"
		aria-expanded={open[key]}
		onclick={() => (open[key] = !open[key])}
		class="mt-4 mb-1 flex items-center gap-1 self-start rounded-sm text-body text-muted-foreground outline-none first:mt-0 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
	>
		{title}<span>&nbsp;· {count}</span>
		<ChevronDown
			class={['size-4 transition-transform', !open[key] && '-rotate-90']}
			aria-hidden="true"
		/>
	</button>
{/snippet}

<!-- A smoothed curve along the video (an area under a line; with `midline`, a neutral line through the middle). Click
     to go to that moment. -->
{#snippet chart(paths: { line: string; area: string }, midline: boolean, label: string)}
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
	<div class="relative h-full flex-1 cursor-pointer py-2 text-foreground" onclick={seek}>
		<svg
			viewBox="0 0 1000 100"
			preserveAspectRatio="none"
			class="size-full overflow-visible"
			role="img"
			aria-label={label}
		>
			<defs>
				<linearGradient id="{uid}-{midline ? 'sentiment' : 'rating'}" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0" stop-color="currentColor" stop-opacity="0.35" />
					<stop offset="1" stop-color="currentColor" stop-opacity="0" />
				</linearGradient>
			</defs>
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
			<path d={paths.area} fill="url(#{uid}-{midline ? 'sentiment' : 'rating'})" />
			<path
				d={paths.line}
				fill="none"
				stroke="currentColor"
				stroke-width="1.5"
				vector-effect="non-scaling-stroke"
			/>
		</svg>
	</div>
{/snippet}
