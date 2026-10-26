<script lang="ts">
	import { Button } from '@latitudelabs/design-system';
	import { Play } from '@latitudelabs/design-system/icons';
	import { timecode } from './question-types';

	/**
	 * A small still of a video at a moment (a question's time), with a play button to carry on watching from there.
	 * Shown above a question that pops up in a video.
	 */
	let {
		streamUrl,
		poster,
		time,
		transitionName,
		oncontinue
	}: {
		streamUrl?: string | null;
		poster?: string | null;
		time: number;
		/** Shared with the video step's player, so switching between them morphs one into the other. */
		transitionName?: string;
		oncontinue: () => void;
	} = $props();

	let video = $state<HTMLVideoElement | null>(null);
	// Show the frame at the question's time once the video can seek.
	$effect(() => {
		if (!video || !streamUrl) return;
		const seek = () => (video!.currentTime = time);
		if (video.readyState > 0) seek();
		else video.addEventListener('loadedmetadata', seek, { once: true });
	});
</script>

<div class="relative mb-12 w-56 overflow-hidden rounded-sm bg-muted">
	<!-- svelte-ignore a11y_media_has_caption -->
	<video
		bind:this={video}
		data-study-video
		style:view-transition-name={transitionName}
		style:view-transition-class="study-video"
		class="aspect-video w-full object-cover"
		src={streamUrl ?? undefined}
		poster={streamUrl ? undefined : (poster ?? undefined)}
		preload="metadata"
		muted
		tabindex="-1"
		aria-hidden="true"
	></video>
	<div class="absolute inset-0 flex items-center justify-center">
		<Button
			variant="secondary"
			size="icon"
			class="rounded-full shadow-raised"
			aria-label="Carry on watching from {timecode(time)}"
			onclick={oncontinue}
		>
			<Play />
		</Button>
	</div>
</div>
