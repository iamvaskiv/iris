<script lang="ts" module>
	import type { Span } from './types';
	import type { Tone } from './viewer';

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
		tone: Tone;
		text: string;
	};
</script>

<script lang="ts">
	import { Avatar } from '@latitudelabs/design-system';
	import { ChevronDown } from '@latitudelabs/design-system/icons';
	import { along, ratingCurve as ratingPaths, sceneSegments, sentimentCurves } from './curve';
	import { timecode } from './format';
	import CurveChart from './timeline/CurveChart.svelte';
	import SceneBlocks from './timeline/SceneBlocks.svelte';
	import PlayheadSummary from './timeline/PlayheadSummary.svelte';
	import SceneLines from './timeline/SceneLines.svelte';
	import { TONE_DOT, initials } from './viewer';
	import { askable, fractionAlong } from '#lib/ask-lumi.js';
	import type { VideoQuestions } from './video/questions';

	/**
	 * The video as lanes (the card's Timeline tab): the scenes across the top, viewers' comments by sentiment (positive, neutral and negative,
	 * when it was shown to an audience; click one to go to it), then a lane for each character, theme and brand
	 * with bars where it's on screen, longest screen time first. Scene boundaries and the playhead run through every
	 * lane, with a box beside the playhead summing up that moment. Click a lane to go to that moment (`onseek`); click a
	 * name to pick it (`onpick`, as on the card).
	 */
	let {
		duration,
		time,
		scenes,
		groups,
		comments = [],
		ratings = [],
		picked,
		ask,
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
		/** What each part can ask Lumi (see ask-lumi.ts). */
		ask?: VideoQuestions;
		onseek: (time: number) => void;
		onpick: (kind: LaneGroup['kind'], index: number) => void;
	} = $props();

	const percent = (t: number) => along(t, duration);
	const segments = $derived(sceneSegments(scenes, duration));
	const screenTime = (lane: Lane) =>
		(lane.appearances ?? []).reduce((n, s) => n + s.end - s.start, 0);
	const sorted = (lanes: Lane[]) => [...lanes].sort((a, b) => screenTime(b) - screenTime(a));
	const share = (lane: Lane) => Math.round(percent(screenTime(lane)));
	const isPicked = (kind: LaneGroup['kind'], lane: Lane) =>
		picked?.kind === kind && picked.index === lane.index;

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
	const sentimentCurve = $derived(sentimentCurves([comments], duration)[0]);
	const ratingCurve = $derived(ratingPaths(ratings, duration));
	const ratingAverage = $derived(
		ratings.length ? ratings.reduce((n, r) => n + r.value, 0) / ratings.length : 0
	);

	const TONES = [
		{ key: 'positive', label: 'Positive', dot: TONE_DOT.positive },
		{ key: 'neutral', label: 'Neutral', dot: TONE_DOT.neutral },
		{ key: 'negative', label: 'Negative', dot: TONE_DOT.negative }
	] as const;

	// Hovering over the lanes moves the playhead (and its summary) to the moment under the pointer, the box just below
	// the pointer (Ask Lumi's hint goes above it); the real position stays as a faint line, and clicking goes there. Otherwise the box stays near the top
	// of whatever part of the lanes is in view as they scroll.
	let root = $state<HTMLElement>();
	let track = $state<HTMLElement>();
	let hover = $state<{ time: number; y: number } | null>(null);
	/** How far the lanes' top has scrolled above the top of their scrolling area (0 while it's in view). */
	let scrolledPast = $state(0);
	const shownTime = $derived(hover?.time ?? time);
	const boxTop = $derived(hover ? hover.y + 20 : Math.max(80, scrolledPast + 16));

	/** The nearest scrolling ancestor's top edge (the page scrolls the window: 0). */
	function viewTop(el: HTMLElement) {
		for (let p = el.parentElement; p; p = p.parentElement) {
			const { overflowY } = getComputedStyle(p);
			if (/(auto|scroll)/.test(overflowY) && p.scrollHeight > p.clientHeight)
				return p.getBoundingClientRect().top;
		}
		return 0;
	}
	$effect(() => {
		if (!root) return;
		const el = root;
		const measure = () =>
			(scrolledPast = Math.max(0, viewTop(el) - el.getBoundingClientRect().top));
		measure();
		window.addEventListener('scroll', measure, { capture: true, passive: true });
		window.addEventListener('resize', measure);
		return () => {
			window.removeEventListener('scroll', measure, { capture: true });
			window.removeEventListener('resize', measure);
		};
	});

	function onpointermove(e: PointerEvent) {
		if (e.pointerType === 'touch' || !track || !root) return;
		if (e.clientX < track.getBoundingClientRect().left) return (hover = null);
		hover = {
			time: fractionAlong(e, track) * duration,
			y: e.clientY - root.getBoundingClientRect().top
		};
	}

	/** A lane's question for Lumi: about the character, theme or brand, at a moment when there is one. */
	function laneQuestion(kind: LaneGroup['kind'], lane: Lane, t?: number) {
		if (!ask) return null;
		if (kind === 'character') return ask.character({ ...lane, actor: lane.sub }, t);
		return kind === 'theme' ? ask.theme(lane, t) : ask.brand(lane, t);
	}

	/** Clicking a lane goes to that moment. */
	function seek(e: MouseEvent) {
		onseek(fractionAlong(e, e.currentTarget as HTMLElement) * duration);
	}
</script>

<!-- Labels on the left (w-58), lanes on the right; the overlay of scene lines and the playhead covers the lanes. -->
<!-- Isolated, so the overlay stays above the lanes but under Lumi's dock. -->
<div
	bind:this={root}
	class="relative isolate flex flex-col"
	role="group"
	aria-label="Timeline"
	{onpointermove}
	onpointerleave={() => (hover = null)}
>
	<!-- The lanes column, measured for hovering. -->
	<div bind:this={track} class="pointer-events-none absolute inset-y-0 right-0 left-58"></div>
	<SceneLines
		{segments}
		{duration}
		time={shownTime}
		ghost={hover ? time : undefined}
		class="left-58"
	/>
	<!-- What's happening where the playhead is (or the pointer, while hovering), in a box beside it. -->
	<PlayheadSummary
		time={shownTime}
		{duration}
		{segments}
		{groups}
		{comments}
		{ratings}
		top={boxTop}
		tracking={!!hover}
		class="left-58"
	/>

	{@render toggle('scenes', 'Scenes', segments.length)}
	<!-- The scenes: a block each, titled; click one to go to its start. -->
	{#if open.scenes}
		<div class="flex h-12 items-center">
			<span class="w-58 shrink-0"></span>
			<SceneBlocks {segments} {duration} ask={ask?.scene} {onseek} />
		</div>
	{/if}

	{#if ratings.length}
		{@render toggle('rating', 'Rating', ratings.length)}
		{#if open.rating}
			<div class="flex h-20 items-center">
				<span class="flex w-58 shrink-0 flex-col">
					<span class="text-caption">Average rating</span>
					<span class="text-caption text-muted-foreground"
						>{ratingAverage.toFixed(1)} / {ratings[0].max} · {ratings.length}
						{ratings.length === 1 ? 'rating' : 'ratings'}</span
					>
				</span>
				<CurveChart
					curves={[
						ratingCurve && { paths: ratingCurve, fill: true, color: 'text-category-magenta' }
					]}
					label="Average rating along the video"
					{duration}
					ask={ask?.rating}
					{onseek}
				/>
			</div>
		{/if}
	{/if}

	{#if comments.length}
		{@render toggle('viewers', 'Sentiment', comments.length)}
		{#if open.viewers}
			<div class="flex h-20 items-center">
				<span class="flex w-58 shrink-0 flex-col">
					<span class="text-caption">Over time</span>
					<span class="text-caption text-muted-foreground">Above the line: positive</span>
				</span>
				<CurveChart
					curves={[{ paths: sentimentCurve, fill: true }]}
					label="Comment sentiment along the video"
					{duration}
					ask={ask?.sentiment}
					midline
					{onseek}
				/>
			</div>
		{/if}
		{#each open.viewers ? TONES : [] as tone (tone.key)}
			{@const own = comments.filter((c) => c.tone === tone.key)}
			<div class="flex h-12 items-center" {@attach askable(ask?.tone(tone.key, own.length))}>
				<span class="flex w-58 shrink-0 flex-col">
					<span class="text-caption">{tone.label}</span>
					<span class="text-caption text-muted-foreground"
						>{own.length} {own.length === 1 ? 'comment' : 'comments'}</span
					>
				</span>
				<div class="relative h-full flex-1">
					{#each own as c, i (i)}
						<button
							{@attach askable(ask?.comment(c))}
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
					{@attach askable(ask && laneQuestion(group.kind, lane))}
					type="button"
					aria-pressed={on}
					onclick={() => onpick(group.kind, lane.index)}
					class="flex w-58 shrink-0 items-center gap-2 rounded-sm pr-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
				<div
					class="relative h-full flex-1 cursor-pointer"
					onclick={seek}
					{@attach askable(
						ask && ((e, el) => laneQuestion(group.kind, lane, fractionAlong(e, el) * duration))
					)}
				>
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
