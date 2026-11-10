<script lang="ts">
	import { along } from '../curve';
	import { timecode } from '../format';
	import { TONE_DOT, type Tone } from '../viewer';
	import type { Span } from '../types';

	/**
	 * A small box beside the playhead in the lanes saying what's happening at that moment: the time and scene, who and
	 * what is on screen (characters, themes and brands, each in its lane colour), viewers' comments within a few
	 * seconds (the nearest one quoted) and the average rating given around then. It sits to the right of the line, or
	 * to its left past the middle, `top` pixels down (kept inside the lanes): the parent keeps that in view while the
	 * lanes scroll, or by the pointer while it hovers (`tracking`, no easing then). Sits over the lanes column of its
	 * parent, like SceneLines (`class` sets the left offset); it doesn't take clicks, so the lanes under it still work.
	 */
	let {
		time,
		duration,
		segments,
		groups,
		comments = [],
		ratings = [],
		top,
		tracking = false,
		class: className
	}: {
		time: number;
		duration: number;
		segments: { title: string; start: number; end: number }[];
		groups: {
			kind: string;
			title: string;
			bar: string;
			lanes: { name: string; appearances?: Span[] }[];
		}[];
		comments?: { time: number; tone: Tone; text: string }[];
		ratings?: { time: number; value: number; max: number }[];
		/** How far down the lanes the box goes, in pixels. */
		top: number;
		/** It's following the pointer: move without easing. */
		tracking?: boolean;
		class?: string;
	} = $props();

	let height = $state(0);
	let boxHeight = $state(0);
	const y = $derived(Math.max(0, Math.min(top, height - boxHeight)));

	/** How close (in seconds) a comment or rating has to be to count as "now". */
	const NEAR = 5;

	const at = $derived(along(time, duration));
	/** Past the middle, the box flips to the line's left so it stays inside the lanes. */
	const flip = $derived(at > 55);
	const scene = $derived(segments.find((s) => s.start <= time && time < s.end) ?? segments.at(-1));
	const onScreen = $derived(
		groups
			.map((g) => ({
				...g,
				names: g.lanes
					.filter((l) => l.appearances?.some((s) => s.start <= time && time < s.end))
					.map((l) => l.name)
			}))
			.filter((g) => g.names.length)
	);
	const nearby = $derived(
		comments
			.filter((c) => Math.abs(c.time - time) <= NEAR)
			.sort((a, b) => Math.abs(a.time - time) - Math.abs(b.time - time))
	);
	const nearRatings = $derived(ratings.filter((r) => Math.abs(r.time - time) <= NEAR));
	const rating = $derived(
		nearRatings.length && {
			average: nearRatings.reduce((n, r) => n + r.value, 0) / nearRatings.length,
			max: nearRatings[0].max
		}
	);
	const tones = $derived(
		(['positive', 'neutral', 'negative'] as const)
			.map((tone) => ({ tone, count: nearby.filter((c) => c.tone === tone).length }))
			.filter((t) => t.count)
	);
</script>

<div
	class={['pointer-events-none absolute inset-y-0 right-0 z-20', className]}
	aria-live="polite"
	bind:clientHeight={height}
>
	<div
		bind:offsetHeight={boxHeight}
		class={[
			'absolute flex w-64 flex-col gap-2 rounded-md bg-popover p-3 text-popover-foreground shadow-raised',
			flip ? '-ml-2 -translate-x-full' : 'ml-2',
			!tracking && 'transition-[top] duration-200 ease-out motion-reduce:transition-none'
		]}
		style:left="{at}%"
		style:top="{y}px"
	>
		<p class="text-caption">
			{timecode(time)}{#if scene}<span class="text-muted-foreground">{` · ${scene.title}`}</span
				>{/if}
		</p>
		{#each onScreen as g (g.kind)}
			<div class="flex items-start gap-2 text-caption">
				<span class={['mt-1.5 h-1.5 w-3 shrink-0 rounded-full', g.bar]} aria-hidden="true"></span>
				<span class="min-w-0">
					<span class="text-muted-foreground">{g.title}:</span>
					{g.names.join(', ')}
				</span>
			</div>
		{:else}
			<p class="text-caption text-muted-foreground">Nothing tagged on screen</p>
		{/each}
		{#if nearby.length}
			<div class="flex flex-col gap-1 border-t border-border pt-2 text-caption">
				<span class="flex items-center gap-2 text-muted-foreground">
					{nearby.length}
					{nearby.length === 1 ? 'comment' : 'comments'} around now
					<span class="flex items-center gap-1.5">
						{#each tones as t (t.tone)}
							<span class="flex items-center gap-0.5">
								<span class={['size-1.5 rounded-full', TONE_DOT[t.tone]]} aria-hidden="true"
								></span>{t.count}<span class="sr-only">{t.tone}</span>
							</span>
						{/each}
					</span>
				</span>
				<span class="line-clamp-2">“{nearby[0].text}”</span>
			</div>
		{/if}
		{#if rating}
			<p class="text-caption text-muted-foreground">
				Rating around now: <span class="text-popover-foreground"
					>{rating.average.toFixed(1)} / {rating.max}</span
				>
			</p>
		{/if}
	</div>
</div>
