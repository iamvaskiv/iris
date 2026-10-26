<script lang="ts">
	import { Button } from '@latitudelabs/design-system';
	import { Pause, Play, Plus } from '@latitudelabs/design-system/icons';
	import { onMount, type Snippet } from 'svelte';
	import { stepTitle, timecode, typeColor } from './question-types';
	import type { Question } from '../types';

	/**
	 * A video step as people will see it. Playing it pauses at each of its questions' times and hands over with
	 * `onreach` (the setup then shows that question). `resumeAt` carries on playing from a question's time.
	 * "Add question at m:ss" adds one at the playhead.
	 */
	let {
		step,
		streamUrl,
		poster,
		picker,
		resumeAt = null,
		onadd,
		onreach
	}: {
		step: Question;
		streamUrl?: string | null;
		poster?: string | null;
		/** The video picker, shown above the video next to "Add question at…". */
		picker?: Snippet;
		/** Start playing from here (seconds), past any question at or before it. */
		resumeAt?: number | null;
		onadd: (time: number) => void;
		onreach: (question: Question, time: number) => void;
	} = $props();

	let video = $state<HTMLVideoElement | null>(null);
	let currentTime = $state(0);
	let duration = $state(0);
	let paused = $state(true);
	/** Questions already reached in this viewing (so carrying on doesn't stop at the same one again). */
	let reached = new Set<string>();

	onMount(() => {
		if (resumeAt === null || !video) return;
		for (const q of step.questions ?? []) if ((q.time ?? 0) <= resumeAt) reached.add(q.id);
		const start = () => {
			video!.currentTime = resumeAt!;
			video!.play().catch(() => {});
		};
		if (video.readyState > 0) start();
		else video.addEventListener('loadedmetadata', start, { once: true });
	});

	function ontimeupdate() {
		if (!video || video.paused) return;
		const t = video.currentTime;
		const due = (step.questions ?? []).find(
			(q) => !reached.has(q.id) && (q.time ?? 0) <= t && t - (q.time ?? 0) < 1
		);
		if (due) {
			video.pause();
			reached.add(due.id);
			onreach(due, due.time ?? 0);
		}
	}
	const percent = (t: number) => (duration ? Math.min(100, (t / duration) * 100) : 0);

	function toggle() {
		if (!video) return;
		if (video.paused) video.play().catch(() => {});
		else video.pause();
	}

	// Seeking on our timeline: press, drag, release; arrow keys step 5 seconds.
	let seeking = false;
	function seekTo(e: PointerEvent) {
		const track = e.currentTarget as HTMLElement;
		const box = track.getBoundingClientRect();
		const at = Math.min(1, Math.max(0, (e.clientX - box.left) / box.width));
		if (video && duration) video.currentTime = at * duration;
	}
	function seekStart(e: PointerEvent) {
		seeking = true;
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
		seekTo(e);
	}
	function seekMove(e: PointerEvent) {
		if (seeking) seekTo(e);
	}
	function seekEnd() {
		seeking = false;
	}
	function seekKey(e: KeyboardEvent) {
		if (!video || !duration) return;
		const step = e.key === 'ArrowRight' ? 5 : e.key === 'ArrowLeft' ? -5 : 0;
		if (!step) return;
		e.preventDefault();
		video.currentTime = Math.min(duration, Math.max(0, video.currentTime + step));
	}

	// Seeking back before a question reaches it again.
	function onseeked() {
		if (!video) return;
		for (const q of step.questions ?? [])
			if ((q.time ?? 0) > video.currentTime) reached.delete(q.id);
	}
</script>

<!-- Above the video, so they stay in reach when the video is tall. -->
<div class="flex items-center justify-between gap-4">
	<div class="min-w-0">{@render picker?.()}</div>
	<Button variant="outline" size="sm" onclick={() => onadd(Math.floor(currentTime))}>
		<Plus data-icon="inline-start" />Add question at {timecode(currentTime)}
	</Button>
</div>
<!-- Our own controls rather than the browser's, so the timeline can mark where questions pop up. -->
<div class="overflow-hidden rounded-lg bg-muted">
	<!-- svelte-ignore a11y_media_has_caption, a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
	<video
		bind:this={video}
		bind:currentTime
		bind:duration
		bind:paused
		class="aspect-video w-full object-contain"
		src={streamUrl ?? undefined}
		poster={poster ?? undefined}
		preload="metadata"
		onclick={toggle}
		{ontimeupdate}
		{onseeked}
	></video>
	<div class="flex items-center gap-3 px-2 py-2">
		<Button variant="ghost" size="icon-sm" aria-label={paused ? 'Play' : 'Pause'} onclick={toggle}>
			{#if paused}<Play />{:else}<Pause />{/if}
		</Button>
		<span class="shrink-0 text-caption text-muted-foreground tabular-nums">
			{timecode(currentTime)} / {timecode(duration || 0)}
		</span>
		<!-- The timeline: click or drag to seek; a dot at each question, in its type's colour (click to open it). -->
		<div class="relative flex h-6 flex-1 items-center">
			<div
				role="slider"
				tabindex="0"
				aria-label="Video position"
				aria-valuemin={0}
				aria-valuemax={Math.round(duration || 0)}
				aria-valuenow={Math.round(currentTime)}
				aria-valuetext={timecode(currentTime)}
				class="relative h-6 flex-1 cursor-pointer rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
				onpointerdown={seekStart}
				onpointermove={seekMove}
				onpointerup={seekEnd}
				onkeydown={seekKey}
			>
				<div
					class="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-control/40"
				></div>
				<div
					class="absolute top-1/2 left-0 h-1 -translate-y-1/2 rounded-full bg-primary"
					style:width="{percent(currentTime)}%"
				></div>
			</div>
			{#each step.questions ?? [] as q (q.id)}
				{@const color = typeColor(q.type)}
				<button
					type="button"
					class={[
						'absolute top-1/2 size-3 -translate-1/2 rounded-full ring-2 ring-muted outline-none hover:scale-125 focus-visible:ring-ring',
						color === 'orange'
							? 'bg-category-orange'
							: color === 'magenta'
								? 'bg-category-magenta'
								: 'bg-muted-foreground'
					]}
					style:left="{percent(q.time ?? 0)}%"
					title="{timecode(q.time ?? 0)} · {stepTitle(q)}"
					aria-label="Question at {timecode(q.time ?? 0)}: {stepTitle(q)}"
					onclick={() => {
						video?.pause();
						onreach(q, q.time ?? 0);
					}}
				></button>
			{/each}
		</div>
	</div>
</div>
