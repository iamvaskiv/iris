<script lang="ts">
	import { Button } from '@latitudelabs/design-system';
	import { Play, Plus, X } from '@latitudelabs/design-system/icons';
	import VideoPicker, { type VideoAsset } from './VideoPicker.svelte';
	import { stepTitle } from './question-types';
	import type { Question } from '../types';

	/**
	 * A channel's videos as people browse them, in a grid, with a tile at the end to add one. A tile opens the video's
	 * own step (as in the list); on its corners, shown on hover or keyboard focus, ▶ watches it full screen as people
	 * would and × removes it from the channel.
	 */
	let {
		channel,
		videos,
		thumbnail,
		onopen,
		onwatch,
		onremove,
		onadd
	}: {
		channel: Question;
		/** The user's videos, to add from (null while they load). */
		videos: VideoAsset[] | null;
		thumbnail: (video: Question) => string | null | undefined;
		onopen: (video: Question) => void;
		onwatch: (index: number) => void;
		onremove: (index: number) => void;
		onadd: (videoId: string) => void;
	} = $props();

	const corner =
		'absolute top-2 opacity-0 shadow-raised group-focus-within:opacity-100 group-hover:opacity-100 focus-visible:opacity-100';
</script>

<ul class="grid grid-cols-2 gap-3" aria-label="Videos in the channel">
	{#each channel.videos ?? [] as v, k (v.id)}
		{@const thumb = thumbnail(v)}
		<li class="group relative flex min-w-0 flex-col gap-1">
			<button
				type="button"
				aria-label="Open {stepTitle(v)}"
				class="aspect-video w-full overflow-hidden rounded-sm bg-muted outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
				onclick={() => onopen(v)}
			>
				{#if thumb}
					<img
						src={thumb}
						alt=""
						class="size-full object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none"
					/>
				{/if}
			</button>
			<span class="truncate text-caption text-muted-foreground">{stepTitle(v)}</span>
			<Button
				variant="secondary"
				size="icon-sm"
				aria-label="Watch {stepTitle(v)} full screen"
				class={[corner, 'left-2']}
				onclick={() => onwatch(k)}
			>
				<Play />
			</Button>
			<Button
				variant="secondary"
				size="icon-sm"
				aria-label="Remove {stepTitle(v)} from the channel"
				class={[corner, 'right-2']}
				onclick={() => onremove(k)}
			>
				<X />
			</Button>
		</li>
	{/each}
	<!-- A tile like the videos', with the picker in the middle. -->
	<li class="flex aspect-video items-center justify-center rounded-sm shadow-hairline">
		<VideoPicker
			{videos}
			label="Add a video to the channel"
			class="gap-2 text-muted-foreground"
			onpick={onadd}
		>
			<Plus />Add video
		</VideoPicker>
	</li>
</ul>
