<script lang="ts">
	import { Avatar, Card, Tile } from '@latitudelabs/design-system';
	import { timecode } from '../format';
	import { TONE_DOT, initials, type Tone } from '../viewer';
	import type { InsightComment, Span, VideoCardData } from '../types';

	type Kind = 'character' | 'theme' | 'brand';

	/**
	 * A video card's sections in the regular view, each a row of tiles: Scenes (the one playing outlined), viewers'
	 * Comments (each at its moment, then a study's reactions to the whole video), Characters, Themes and Brands
	 * (picked to see where they're on screen). Playing and picking go back to the card (`onplay`, `onpick`).
	 */
	let {
		data,
		comments,
		reactions,
		currentScene,
		isPicked,
		appearsLabel,
		onplay,
		onpick
	}: {
		data: Partial<VideoCardData>;
		comments: (InsightComment & { tone: Tone })[];
		reactions: { text: string; tone: Tone }[];
		/** The scene playing now (-1 for none). */
		currentScene: number;
		isPicked: (kind: Kind, index: number) => boolean;
		/** "On screen 0:42, 3 times", on hover. */
		appearsLabel: (item: { appearances?: Span[] }) => string | undefined;
		onplay: (time: number) => void;
		onpick: (kind: Kind, index: number) => void;
	} = $props();

	const scenes = $derived(data.scenes ?? []);
	const characters = $derived(data.characters ?? []);
	const themes = $derived(data.themes ?? []);
	const brands = $derived(data.brands ?? []);
	const canPlay = $derived(!!data.streamUrl);
</script>

{#if scenes.length}
	<Card.Section title="Scenes" count={scenes.length}>
		{#each scenes as scene, i (i)}
			<li class="w-36">
				<!-- The scene playing now is outlined. -->
				<button
					type="button"
					disabled={!canPlay}
					aria-current={currentScene === i ? 'time' : undefined}
					onclick={() => onplay(scene.start)}
					class="group flex w-full flex-col gap-1 rounded-sm text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
				>
					{#if scene.thumb}
						<img
							src={scene.thumb}
							alt=""
							class="aspect-video w-full rounded-sm bg-muted object-cover group-aria-[current]:ring-2 group-aria-[current]:ring-primary"
						/>
					{:else}
						<div
							class="aspect-video w-full rounded-sm bg-muted group-aria-[current]:ring-2 group-aria-[current]:ring-primary"
						></div>
					{/if}
					<span class="line-clamp-2 text-caption">{scene.title}</span>
					<span class="text-caption text-muted-foreground">{timecode(scene.start)}</span>
				</button>
			</li>
		{/each}
	</Card.Section>
{/if}

{#if comments.length || reactions.length}
	<Card.Section title="Comments" count={comments.length + reactions.length}>
		{#each comments as c, i (i)}
			<li class="w-56">
				<Tile class="h-full w-full" disabled={!canPlay} onclick={() => onplay(c.time)}>
					<span class="line-clamp-3 text-caption">“{c.text}”</span>
					<span class="flex items-center gap-1.5 text-caption text-muted-foreground">
						<span class={['size-1.5 shrink-0 rounded-full', TONE_DOT[c.tone]]} aria-hidden="true"
						></span>
						{[timecode(c.time), ...(c.emotions ?? []).slice(0, 2)].join(' · ')}
						<span class="sr-only">({c.tone})</span>
					</span>
				</Tile>
			</li>
		{/each}
		{#each reactions as r, i (i)}
			<li class="w-56">
				<Tile class="h-full w-full">
					<span class="line-clamp-3 text-caption">“{r.text}”</span>
					<span class="flex items-center gap-1.5 text-caption text-muted-foreground">
						<span class={['size-1.5 shrink-0 rounded-full', TONE_DOT[r.tone]]} aria-hidden="true"
						></span>
						About the whole video
						<span class="sr-only">({r.tone})</span>
					</span>
				</Tile>
			</li>
		{/each}
	</Card.Section>
{/if}

{#if characters.length}
	<Card.Section title="Characters" count={characters.length}>
		{#each characters as person, i (i)}
			<li class="w-28">
				<button
					type="button"
					aria-pressed={isPicked('character', i)}
					title={appearsLabel(person)}
					onclick={() => onpick('character', i)}
					class="group flex w-full flex-col items-center gap-1 rounded-sm text-center outline-none focus-visible:ring-2 focus-visible:ring-ring"
				>
					<Avatar.Root
						class="size-14 overflow-hidden ring-offset-2 ring-offset-card group-aria-pressed:ring-2 group-aria-pressed:ring-primary"
					>
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
						<span class="text-caption text-muted-foreground">{person.actor ?? person.role}</span>
					{/if}
				</button>
			</li>
		{/each}
	</Card.Section>
{/if}

{#if themes.length}
	<Card.Section title="Themes" count={themes.length}>
		{#each themes as theme, i (i)}
			<li class="w-56">
				<Tile
					class={['h-full w-full', isPicked('theme', i) && 'ring-2 ring-primary']}
					aria-pressed={isPicked('theme', i)}
					title={appearsLabel(theme)}
					onclick={() => onpick('theme', i)}
				>
					<span class="text-caption">{theme.name}</span>
					{#if theme.description}
						<span class="line-clamp-3 text-caption text-muted-foreground">{theme.description}</span>
					{/if}
				</Tile>
			</li>
		{/each}
	</Card.Section>
{/if}

{#if brands.length}
	<Card.Section title="Brands" count={brands.length}>
		{#each brands as brand, i (i)}
			<li class="w-44">
				<Tile
					class={['h-full w-full', isPicked('brand', i) && 'ring-2 ring-primary']}
					aria-pressed={isPicked('brand', i)}
					title={appearsLabel(brand)}
					onclick={() => onpick('brand', i)}
				>
					<span class="text-caption">{brand.name}</span>
					<span class="text-caption text-muted-foreground">
						{[brand.category, brand.time !== undefined && timecode(brand.time)]
							.filter(Boolean)
							.join(' · ')}
					</span>
				</Tile>
			</li>
		{/each}
	</Card.Section>
{/if}
