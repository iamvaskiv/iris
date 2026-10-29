<script lang="ts">
	import { Button } from '@latitudelabs/design-system';
	import { ChevronDown, ChevronUp, Pause, Play, X } from '@latitudelabs/design-system/icons';
	import { fade } from 'svelte/transition';
	import { SvelteSet } from 'svelte/reactivity';
	import { dotClass, dueQuestion, stepTitle } from './question-types';
	import { feedSlide } from './slide';
	import type { Question } from '../types';

	/**
	 * A channel's video full screen, as people will see it after picking it from the grid: it plays straight away. With
	 * `vertical` (vertical sliding, like a short-video feed) they slide up and down to the next or previous video, with
	 * the buttons, arrow keys or the scroll wheel; without it they go back to the grid to pick another. Like a video step, playing pauses at each of the video's
	 * questions and hands over with `onreach`. Escape or the close button goes back to the grid.
	 */
	let {
		channel,
		index = $bindable(),
		media,
		onclose,
		onreach
	}: {
		channel: Question;
		/** Which of the channel's videos is showing. */
		index: number;
		media: Record<string, { streamUrl: string | null; poster: string | null }>;
		onclose: () => void;
		onreach: (question: Question) => void;
	} = $props();

	const videos = $derived(channel.videos ?? []);
	const step = $derived(videos[index]);
	const m = $derived(step?.videoId ? media[step.videoId] : undefined);

	let video = $state<HTMLVideoElement | null>(null);
	let paused = $state(true);
	let currentTime = $state(0);
	let duration = $state(0);
	/** Questions already reached in this viewing, so playing on doesn't stop at the same one again. */
	const reached = new SvelteSet<string>();

	/** Which way the last move went (1: on to the next video), so the videos slide that way. */
	let direction = $state(1);
	function go(by: number) {
		const to = index + by;
		if (!channel.vertical || to < 0 || to >= videos.length) return;
		direction = by;
		index = to;
	}

	function ontimeupdate() {
		if (!video || video.paused) return;
		const due = dueQuestion(step.questions, reached, video.currentTime);
		if (due) {
			video.pause();
			reached.add(due.id);
			onreach(due);
		}
	}

	function toggle() {
		if (!video) return;
		if (video.paused) video.play().catch(() => {});
		else video.pause();
	}

	function onkeydown(e: KeyboardEvent) {
		// Not while typing somewhere (Lumi's prompt, say): the keys are the field's then.
		const typing = (e.target as Element | null)?.closest?.(
			'input, textarea, select, [contenteditable]'
		);
		if (e.defaultPrevented || typing) return;
		if (e.key === 'Escape') onclose();
		else if (channel.vertical && e.key === 'ArrowUp') go(-1);
		else if (channel.vertical && e.key === 'ArrowDown') go(1);
		else return;
		e.preventDefault();
	}

	// Vertical sliding: one wheel gesture moves one video (a trackpad sends many events; wait for them to settle).
	let wheelLocked = false;
	function onwheel(e: WheelEvent) {
		if (!channel.vertical || Math.abs(e.deltaY) < 20) return;
		e.preventDefault();
		if (wheelLocked) return;
		wheelLocked = true;
		setTimeout(() => (wheelLocked = false), 600);
		go(Math.sign(e.deltaY));
	}

	const reduce =
		typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
	let screen = $state<HTMLElement | null>(null);
	const percent = (t: number) => (duration ? Math.min(100, (t / duration) * 100) : 0);
</script>

<svelte:window {onkeydown} />

<!-- Fills the preview, standing in for the viewer's screen. -->
<div
	bind:this={screen}
	role="dialog"
	aria-label="{stepTitle(channel)}: {step ? stepTitle(step) : ''}"
	class="absolute inset-0 z-10 overflow-hidden rounded-sm bg-background"
	transition:fade={{ duration: reduce ? 0 : 200 }}
	{onwheel}
>
	{#key index}
		<div
			class="absolute inset-0"
			in:feedSlide={{ dir: direction, within: screen }}
			out:feedSlide={{ dir: -direction, within: screen }}
		>
			<!-- svelte-ignore a11y_media_has_caption -->
			<video
				bind:this={video}
				bind:paused
				bind:currentTime
				bind:duration
				class="size-full object-contain"
				src={m?.streamUrl ?? undefined}
				poster={m?.poster ?? undefined}
				autoplay
				playsinline
				onclick={toggle}
				{ontimeupdate}
			></video>
			{#if !m?.streamUrl}
				<p
					class="absolute inset-0 flex items-center justify-center text-body text-muted-foreground"
				>
					{step?.videoName ?? 'No video picked'}
				</p>
			{/if}
		</div>
	{/key}

	<div class="absolute inset-x-0 top-0 flex items-center justify-between gap-4 p-4">
		<p class="min-w-0 truncate text-body font-medium">
			{step ? stepTitle(step) : ''}
			{#if channel.vertical}
				<span class="font-normal text-muted-foreground">· {index + 1} of {videos.length}</span>
			{/if}
		</p>
		<Button variant="secondary" size="icon-sm" aria-label="Back to the channel" onclick={onclose}>
			<X />
		</Button>
	</div>

	{#if channel.vertical}
		<div class="absolute top-1/2 right-4 flex -translate-y-1/2 flex-col gap-2">
			<Button
				variant="secondary"
				size="icon-sm"
				aria-label="Previous video"
				disabled={index === 0}
				onclick={() => go(-1)}><ChevronUp /></Button
			>
			<Button
				variant="secondary"
				size="icon-sm"
				aria-label="Next video"
				disabled={index === videos.length - 1}
				onclick={() => go(1)}><ChevronDown /></Button
			>
		</div>
	{/if}

	<!-- Play and how far in, with a dot at each of the video's questions in its type's colour. Raised clear of Lumi's
	     dock, which covers the foot of the card (the preview leaves it the same room, pb-32). -->
	<div class="absolute inset-x-0 bottom-0 flex items-center gap-3 px-4 pt-4 pb-32">
		<Button
			variant="secondary"
			size="icon-sm"
			aria-label={paused ? 'Play' : 'Pause'}
			onclick={toggle}
		>
			{#if paused}<Play />{:else}<Pause />{/if}
		</Button>
		<div class="relative h-1 flex-1 rounded-full bg-control/40">
			<div
				class="absolute inset-y-0 left-0 rounded-full bg-primary"
				style:width="{percent(currentTime)}%"
			></div>
			{#each step?.questions ?? [] as q (q.id)}
				<span
					class={['absolute top-1/2 size-2 -translate-1/2 rounded-full', dotClass(q.type)]}
					style:left="{percent(q.time ?? 0)}%"
				></span>
			{/each}
		</div>
	</div>
</div>
