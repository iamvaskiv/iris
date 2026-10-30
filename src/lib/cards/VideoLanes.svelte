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
	import SceneLines from './timeline/SceneLines.svelte';
	import { TONE_DOT, initials } from './viewer';

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

	/** Clicking a lane goes to that moment. */
	function seek(e: MouseEvent) {
		const box = (e.currentTarget as HTMLElement).getBoundingClientRect();
		onseek(Math.min(1, Math.max(0, (e.clientX - box.left) / box.width)) * duration);
	}
</script>

<!-- Labels on the left (w-48), lanes on the right; the overlay of scene lines and the playhead covers the lanes. -->
<!-- Isolated, so the overlay stays above the lanes but under Lumi's dock. -->
<div class="relative isolate flex flex-col" role="group" aria-label="Timeline view">
	<SceneLines {segments} {duration} {time} />

	{@render toggle('scenes', 'Scenes', segments.length)}
	<!-- The scenes: a block each, titled; click one to go to its start. -->
	{#if open.scenes}
		<div class="flex h-12 items-center">
			<span class="w-48 shrink-0"></span>
			<SceneBlocks {segments} {duration} {onseek} />
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
				<CurveChart
					curves={[ratingCurve && { paths: ratingCurve, fill: true }]}
					label="Average rating along the video"
					{duration}
					{onseek}
				/>
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
				<CurveChart
					curves={[{ paths: sentimentCurve, fill: true }]}
					label="Comment sentiment along the video"
					{duration}
					midline
					{onseek}
				/>
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
