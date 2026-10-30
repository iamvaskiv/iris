<script lang="ts">
	import { along, sceneSegments } from './curve';
	import { timecode } from './format';
	import { TONE_DOT, type Tone } from './viewer';
	import type { Span } from './types';

	/**
	 * A map of the video under its player: the scenes as segments side by side, where the video is (`time`), and,
	 * when something on the card is picked, the spans it appears in (`spans`, drawn over the scenes). Viewers'
	 * comments (`marks`) are dots above it, in their sentiment's colour. Click or drag to go to a moment (`onseek`);
	 * arrow keys step 5 seconds.
	 */
	let {
		duration,
		time,
		scenes,
		spans = [],
		marks = [],
		label,
		onseek
	}: {
		duration: number;
		/** Where the video is, in seconds (0 before it's played). */
		time: number;
		scenes: { title: string; start: number; end?: number }[];
		/** What's picked appears here. */
		spans?: Span[];
		/** Viewers' comments, where they were left. */
		marks?: { time: number; tone: Tone; text?: string }[];
		/** What's picked, for screen readers ("Otto Anderson appears 4 times"). */
		label?: string;
		onseek: (time: number) => void;
	} = $props();

	const percent = (t: number) => along(t, duration);
	/** Each scene runs to the next one's start (or its own end, or the video's end). */
	const segments = $derived(sceneSegments(scenes, duration));

	let dragging = false;
	function seekTo(e: PointerEvent) {
		const box = (e.currentTarget as HTMLElement).getBoundingClientRect();
		onseek(Math.min(1, Math.max(0, (e.clientX - box.left) / box.width)) * duration);
	}
	function onkeydown(e: KeyboardEvent) {
		const by = { ArrowLeft: -5, ArrowRight: 5 }[e.key];
		if (!by) return;
		e.preventDefault();
		onseek(Math.min(duration, Math.max(0, time + by)));
	}
</script>

<div
	role="slider"
	tabindex="0"
	aria-label="Go to a moment in the video"
	aria-valuemin={0}
	aria-valuemax={Math.round(duration)}
	aria-valuenow={Math.round(time)}
	aria-valuetext="{timecode(time)}{label ? `. ${label}` : ''}"
	class="group relative h-6 cursor-pointer touch-none rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
	onpointerdown={(e) => {
		dragging = true;
		e.currentTarget.setPointerCapture(e.pointerId);
		seekTo(e);
	}}
	onpointermove={(e) => dragging && seekTo(e)}
	onpointerup={() => (dragging = false)}
	onpointercancel={() => (dragging = false)}
	{onkeydown}
>
	<!-- The scenes, with a hairline gap between them (title on hover). -->
	<div class="absolute inset-x-0 top-1/2 flex h-2 -translate-y-1/2 gap-px">
		{#each segments as s, i (i)}
			<div
				class="h-full rounded-full bg-control/40"
				style:width="{percent(s.end) - percent(s.start)}%"
				title="{s.title} · {timecode(s.start)}"
			></div>
		{:else}
			<div class="h-full w-full rounded-full bg-control/40"></div>
		{/each}
	</div>
	<!-- Where the picked thing appears. -->
	{#each spans as s, i (i)}
		<div
			class="pointer-events-none absolute top-1/2 h-2 -translate-y-1/2 rounded-full bg-primary"
			style:left="{percent(s.start)}%"
			style:width="max(4px, {percent(s.end) - percent(s.start)}%)"
		></div>
	{/each}
	<!-- Viewers' comments, as dots along the top edge. -->
	{#each marks as m, i (i)}
		<div
			class={[
				'pointer-events-none absolute top-0 size-1.5 -translate-x-1/2 rounded-full',
				TONE_DOT[m.tone]
			]}
			style:left="{percent(m.time)}%"
		></div>
	{/each}
	<!-- Where the video is. -->
	<div
		class="pointer-events-none absolute top-1/2 h-4 w-0.5 -translate-1/2 rounded-full bg-foreground"
		style:left="{percent(time)}%"
	></div>
</div>
