<script lang="ts">
	import { Button } from '@latitudelabs/design-system';
	import { Plus } from '@latitudelabs/design-system/icons';
	import type { Snippet } from 'svelte';
	import QuestionAnswer from './QuestionAnswer.svelte';
	import { timecode } from './question-types';
	import type { Question } from '../types';

	/**
	 * A video step as people will see it: the video plays and pauses at each of its questions' times, with the
	 * question over the paused frame; answering or skipping carries on. "Add question at m:ss" adds one at the
	 * playhead.
	 */
	let {
		step,
		streamUrl,
		poster,
		picker,
		onadd
	}: {
		step: Question;
		streamUrl?: string | null;
		poster?: string | null;
		/** The video picker, shown above the video next to "Add question at…". */
		picker?: Snippet;
		onadd: (time: number) => void;
	} = $props();

	let video = $state<HTMLVideoElement | null>(null);
	let currentTime = $state(0);
	/** The question showing over the video, and the ones already asked in this viewing. */
	let asking = $state<Question | null>(null);
	let asked = new Set<string>();

	function ontimeupdate() {
		if (!video || asking) return;
		const due = (step.questions ?? []).find(
			(q) =>
				!asked.has(q.id) &&
				(q.time ?? 0) <= video!.currentTime &&
				video!.currentTime - (q.time ?? 0) < 1
		);
		if (due) {
			video.pause();
			video.currentTime = due.time ?? 0;
			asking = due;
		}
	}
	// Seeking back before a question asks it again.
	function onseeked() {
		if (!video) return;
		for (const q of step.questions ?? []) if ((q.time ?? 0) > video.currentTime) asked.delete(q.id);
	}
	function carryOn() {
		if (!asking) return;
		asked.add(asking.id);
		asking = null;
		video?.play();
	}
</script>

<!-- Above the video, so they stay in reach when the video is tall. -->
<div class="flex items-center justify-between gap-4">
	<div class="min-w-0">{@render picker?.()}</div>
	<Button variant="outline" size="sm" onclick={() => onadd(Math.floor(currentTime))}>
		<Plus data-icon="inline-start" />Add question at {timecode(currentTime)}
	</Button>
</div>
<div class="relative overflow-hidden rounded-lg bg-muted">
	<!-- svelte-ignore a11y_media_has_caption -->
	<video
		bind:this={video}
		bind:currentTime
		class="aspect-video w-full object-contain"
		src={streamUrl ?? undefined}
		poster={poster ?? undefined}
		controls={!asking}
		preload="metadata"
		{ontimeupdate}
		{onseeked}
	></video>
	{#if asking}
		<!-- The question over the paused frame. -->
		<div
			class="absolute inset-0 flex items-center justify-center bg-background/80 p-6 backdrop-blur-sm"
			role="dialog"
			aria-label="Question at {timecode(asking.time ?? 0)}"
		>
			<div class="w-full max-w-md rounded-xl bg-card p-5 shadow-raised">
				{#key asking.id}
					<QuestionAnswer question={asking} oncontinue={carryOn} />
				{/key}
			</div>
		</div>
	{/if}
</div>
<p class="text-caption text-muted-foreground">
	{(step.questions ?? []).length
		? step.questions!.length === 1
			? '1 question pops up while it plays.'
			: `${step.questions!.length} questions pop up while it plays.`
		: 'Play or scrub to a moment, then add a question that pops up there.'}
</p>
