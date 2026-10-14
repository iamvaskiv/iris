<script lang="ts">
	import { Avatar, Button, Card } from '@latitudelabs/design-system';
	import { Play } from '@latitudelabs/design-system/icons';
	import CardSection from './CardSection.svelte';
	import { timecode } from './format';
	import type { Card as CardData, VideoCardData } from './types';

	let { card }: { card: CardData } = $props();
	const data = $derived((card.data ?? {}) as Partial<VideoCardData>);
	const scenes = $derived(data.scenes ?? []);
	const characters = $derived(data.characters ?? []);

	let playing = $state(false);
	let player = $state<HTMLVideoElement>();
	let startAt = 0;

	/** Swaps the poster for the player on first play; later calls seek the open player. */
	function play(at?: number) {
		if (!player) {
			startAt = at ?? 0;
			playing = true;
			return;
		}
		if (at !== undefined) player.currentTime = at;
		player.play();
	}

	const initials = (name: string) =>
		name
			.split(' ')
			.map((w) => w[0])
			.slice(0, 2)
			.join('');
</script>

<Card.Root>
	<Card.Content class="flex flex-col gap-5">
		{#if playing && data.streamUrl}
			<!-- svelte-ignore a11y_media_has_caption -->
			<video
				bind:this={player}
				src={data.streamUrl}
				poster={data.poster}
				controls
				autoplay
				onloadedmetadata={(e) => (e.currentTarget.currentTime = startAt)}
				class="aspect-video w-full rounded-md bg-muted"
			></video>
		{:else}
			<div class="relative">
				{#if data.poster}
					<img
						src={data.poster}
						alt=""
						class="aspect-video w-full rounded-md bg-muted object-cover"
					/>
				{:else}
					<div class="aspect-video w-full rounded-md bg-muted"></div>
				{/if}
				{#if data.streamUrl}
					<Button
						variant="secondary"
						onclick={() => play()}
						class="absolute top-1/2 left-1/2 -translate-1/2 shadow-raised"
					>
						<Play data-icon="inline-start" />Play
					</Button>
				{/if}
			</div>
		{/if}

		<div class="flex min-w-0 flex-col gap-5">
			<div class="flex flex-col gap-1">
				<Card.Title>{card.title}</Card.Title>
				{#if card.subtitle || data.duration}
					<p class="text-caption text-muted-foreground">
						{[card.subtitle, data.duration && timecode(data.duration)].filter(Boolean).join(' · ')}
					</p>
				{/if}
				{#if card.body}<p class="line-clamp-3 text-body text-muted-foreground">{card.body}</p>{/if}
			</div>

			{#if scenes.length}
				<CardSection title="Scenes" count={scenes.length}>
					{#each scenes as scene, i (i)}
						<li class="w-36 shrink-0 snap-start">
							<button
								type="button"
								disabled={!data.streamUrl}
								onclick={() => play(scene.start)}
								class="flex w-full flex-col gap-1 rounded-sm text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
							>
								{#if scene.thumb}
									<img
										src={scene.thumb}
										alt=""
										class="aspect-video w-full rounded-sm bg-muted object-cover"
									/>
								{:else}
									<div class="aspect-video w-full rounded-sm bg-muted"></div>
								{/if}
								<span class="line-clamp-2 text-caption">{scene.title}</span>
								<span class="text-caption text-muted-foreground">{timecode(scene.start)}</span>
							</button>
						</li>
					{/each}
				</CardSection>
			{/if}

			{#if characters.length}
				<CardSection title="Characters" count={characters.length}>
					{#each characters as person, i (i)}
						<li class="flex w-28 shrink-0 snap-start flex-col items-center gap-1 text-center">
							<Avatar.Root class="size-14 overflow-hidden">
								<!-- Zoomed in: widescreen films are letterboxed inside 16:9 frames, and the bars would show. -->
								{#if person.image}<Avatar.Image
										src={person.image}
										alt=""
										class="scale-150 object-cover"
									/>{/if}
								<Avatar.Fallback>{initials(person.name)}</Avatar.Fallback>
							</Avatar.Root>
							<span class="text-caption">{person.name}</span>
							{#if person.role || person.actor}
								<span class="text-caption text-muted-foreground">{person.actor ?? person.role}</span
								>
							{/if}
						</li>
					{/each}
				</CardSection>
			{/if}
		</div>
	</Card.Content>
</Card.Root>
