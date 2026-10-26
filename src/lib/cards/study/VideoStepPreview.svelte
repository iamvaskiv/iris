<script lang="ts">
	import { Button } from '@latitudelabs/design-system';
	import { Plus } from '@latitudelabs/design-system/icons';
	import { onMount, type Snippet } from 'svelte';
	import { timecode } from './question-types';
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
<!-- svelte-ignore a11y_media_has_caption -->
<video
	bind:this={video}
	bind:currentTime
	class="aspect-video w-full rounded-lg bg-muted object-contain"
	src={streamUrl ?? undefined}
	poster={poster ?? undefined}
	controls
	preload="metadata"
	{ontimeupdate}
	{onseeked}
></video>
