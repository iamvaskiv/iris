<script lang="ts">
	import {
		Avatar,
		Button,
		Card,
		Label,
		Select,
		SentimentCounts,
		Stat,
		Switch,
		Tile
	} from '@latitudelabs/design-system';
	import { onMount } from 'svelte';
	import {
		hasLanes as lanesIn,
		loadTimelineView,
		setTimelineView,
		timelineView
	} from './timeline-view.svelte';
	import VideoLanes, { type CommentMark, type LaneGroup } from './VideoLanes.svelte';
	import { ChevronLeft, ChevronRight, Play, X } from '@latitudelabs/design-system/icons';
	import { untrack } from 'svelte';
	import VideoTimeline from './VideoTimeline.svelte';
	import { projectCards, studySources, type ViewerSource } from './viewer-sources';
	import { timecode } from './format';
	import type { Card as CardData, Span, VideoCardData } from './types';

	/**
	 * For Storybook: `pick` starts with that character, theme or brand picked (see below), `lanes` with Timeline view
	 * on or off instead of what was remembered.
	 */
	let {
		card,
		pick: picking,
		lanes: lanesGiven,
		studies,
		source: sourceGiven
	}: {
		card: CardData;
		pick?: { kind: 'character' | 'theme' | 'brand'; index: number };
		lanes?: boolean;
		/** For Storybook: the project's other cards (the page shares them otherwise), and which source to start on. */
		studies?: CardData[];
		source?: string;
	} = $props();
	const data = $derived((card.data ?? {}) as Partial<VideoCardData>);
	const scenes = $derived(data.scenes ?? []);
	const characters = $derived(data.characters ?? []);
	const themes = $derived(data.themes ?? []);
	const brands = $derived(data.brands ?? []);

	let playing = $state(false);
	let player = $state<HTMLVideoElement>();
	let startAt = 0;
	/** Where the video is (or will start), for the timeline and the current scene. */
	let time = $state(0);

	/** Swaps the poster for the player on first play; later calls seek the open player. */
	function play(at?: number) {
		if (at !== undefined) time = at;
		if (!player) {
			startAt = at ?? 0;
			playing = true;
			return;
		}
		if (at !== undefined) player.currentTime = at;
		player.play();
	}

	/** The scene the video is in, once it's playing. */
	const currentScene = $derived(
		playing
			? scenes.findLastIndex(
					(s, i) => s.start <= time && time < (s.end ?? scenes[i + 1]?.start ?? Infinity)
				)
			: -1
	);

	// Pick a character, theme or brand to see where it appears (on the timeline) and watch from its first
	// appearance; pick it again, or use the arrows, to go to its next one.
	type Kind = 'character' | 'theme' | 'brand';
	let picked = $state<{ kind: Kind; index: number } | null>(untrack(() => picking ?? null));
	const pickedItem = $derived(
		picked
			? { character: characters, theme: themes, brand: brands }[picked.kind][picked.index]
			: undefined
	);
	const spans = $derived<Span[]>(pickedItem?.appearances ?? []);
	/**
	 * How much of the video it's in, and in how many stretches: "on screen 0:42, 3 times". Back-to-back moments are one
	 * stretch, so the lead is "on screen 2:40, throughout" rather than "once".
	 */
	function presence(list: Span[] = []) {
		if (!list.length) return '';
		const total = list.reduce((n, s) => n + s.end - s.start, 0);
		const whole = data.duration && total >= data.duration * 0.9;
		const how = whole
			? 'throughout'
			: list.length === 1
				? 'once'
				: list.length === 2
					? 'twice'
					: `${list.length} times`;
		return `on screen ${timecode(total)}, ${how}`;
	}
	/** The next appearance after where the video is (back to the first after the last), or the one before. */
	function step(by: 1 | -1) {
		if (!spans.length) return;
		const next =
			by > 0
				? (spans.find((s) => s.start > time + 0.5) ?? spans[0])
				: (spans.findLast((s) => s.start < time - 1) ?? spans.at(-1)!);
		play(next.start);
	}
	function pick(kind: Kind, index: number) {
		if (picked?.kind === kind && picked.index === index) return step(1);
		picked = { kind, index };
		const first = spans[0];
		if (first && data.streamUrl) play(first.start);
	}
	const isPicked = (kind: Kind, index: number) => picked?.kind === kind && picked.index === index;

	// Timeline view: everything on the card as lanes along the video, in place of its sections (remembered on this
	// device). Coloured by kind: characters blue, themes magenta, brands orange.
	onMount(() => {
		if (lanesGiven === undefined) loadTimelineView();
	});
	const lanesOn = $derived(lanesGiven ?? timelineView.on);
	const laneGroups = $derived<LaneGroup[]>([
		{
			kind: 'character',
			title: 'Characters',
			bar: 'bg-category-blue',
			lanes: characters.map((c, index) => ({ ...c, sub: c.actor ?? c.role, index }))
		},
		{
			kind: 'theme',
			title: 'Themes',
			bar: 'bg-category-magenta',
			lanes: themes.map((t, index) => ({ ...t, index }))
		},
		{
			kind: 'brand',
			title: 'Brands',
			bar: 'bg-category-orange',
			lanes: brands.map((b, index) => ({ ...b, index }))
		}
	]);
	// Viewer data, when the video was shown to an audience: its key numbers under the summary, and every comment, at
	// its moment (a section of them, dots on the timeline, and lanes in Timeline view).
	// Where it comes from: Lumiere (real viewers), or one of the project's studies that shows this video (its sample
	// results), picked with Source.
	const sharedCards = projectCards();
	const sources = $derived<ViewerSource[]>([
		...(data.viewers
			? [{ id: 'lumiere', name: 'Lumiere', kind: 'lumiere' as const, viewers: data.viewers }]
			: []),
		...(data.videoId ? studySources(studies ?? sharedCards?.() ?? [], data.videoId) : [])
	]);
	let sourceId = $state<string | null>(untrack(() => sourceGiven ?? null));
	const source = $derived(sources.find((s) => s.id === sourceId) ?? sources[0]);
	const viewers = $derived(source?.viewers);
	const fromStudy = $derived(source?.kind === 'study');
	const tone = (sentiment: number): CommentMark['tone'] =>
		sentiment > 0.2 ? 'positive' : sentiment < -0.2 ? 'negative' : 'neutral';
	const comments = $derived(
		(viewers?.comments ?? []).map((c) => ({ ...c, tone: tone(c.sentiment) }))
	);
	/** A study's reactions to the whole video: no moment, so in the Comments section only. */
	const reactions = $derived(
		(source?.reactions ?? []).map((r) => ({ ...r, tone: tone(r.sentiment) }))
	);
	const dot = {
		positive: 'bg-success',
		neutral: 'bg-muted-foreground',
		negative: 'bg-destructive'
	};

	const hasLanes = $derived(lanesIn(card));
	/** Timeline view is showing (it's on, and there's something to put in lanes). */
	const lanesView = $derived(lanesOn && hasLanes);
	const appearsLabel = (item?: { appearances?: Span[] }) =>
		presence(item?.appearances).replace(/^o/, 'O') || undefined;

	const initials = (name: string) =>
		name
			.split(' ')
			.map((w) => w[0])
			.slice(0, 2)
			.join('');
</script>

<!-- Regular view: a wide card at its natural height, the video across it, then its title and summary and the
     sections. Timeline view: full size (as tall as the page allows, below the header and behind Lumi's dock), the
     title and summary at the top left beside a smaller video, and the lanes scrolling below them, with room at the
     bottom (pb-32) to scroll the last ones clear of Lumi's dock. -->
<Card.Root class={['relative', lanesView && 'h-(--card-height) min-h-100']}>
	<Card.Content class={['flex flex-col gap-6', lanesView && 'min-h-0 flex-1']}>
		<div class={['flex shrink-0', lanesView ? 'gap-6' : 'flex-col-reverse gap-5']}>
			<div class="flex min-w-0 flex-1 flex-col gap-1">
				<Card.Title>{card.title}</Card.Title>
				{#if card.subtitle || data.duration}
					<p class="text-caption text-muted-foreground">
						{[card.subtitle, data.duration && timecode(data.duration)].filter(Boolean).join(' · ')}
					</p>
				{/if}
				{#if card.body}<p class="line-clamp-6 text-body text-muted-foreground">{card.body}</p>{/if}
				{#if sources.length > 1}
					<!-- Whose viewer data this is: Lumiere's, or a study's (sample) results. -->
					<div class="mt-3 flex items-center gap-2">
						<Label for="source-{card.id}" class="text-caption text-muted-foreground">Source</Label>
						<Select.Root type="single" value={source?.id} onValueChange={(id) => (sourceId = id)}>
							<Select.Trigger id="source-{card.id}" size="sm">{source?.name}</Select.Trigger>
							<Select.Content>
								{#each sources as s (s.id)}
									<Select.Item
										value={s.id}
										label={s.kind === 'study' ? `${s.name} (sample data)` : s.name}
									/>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>
				{/if}
				{#if viewers}
					<!-- What viewers made of it: as the insights card counts it, or as the study's sample results do. -->
					<div class="mt-3 flex flex-wrap gap-5">
						{#if viewers.views}<Stat
								variant="plain"
								value={viewers.views.toLocaleString()}
								label={fromStudy ? 'Views' : 'Views, last 12 months'}
							/>{/if}
						<Stat
							variant="plain"
							value={viewers.responses.toLocaleString()}
							label={fromStudy ? 'Watched' : 'Responses'}
						/>
						{#if viewers.rating}<Stat
								variant="plain"
								value="{viewers.rating.average} / {viewers.rating.max}"
								label="Rating, {viewers.rating.count} {fromStudy && viewers.rating.max === 10
									? 'answers'
									: 'votes'}"
							/>{/if}
						{#if viewers.sentiment}
							<Stat variant="plain" label={fromStudy ? 'Reactions' : 'Comment sentiment'}>
								<SentimentCounts {...viewers.sentiment} />
							</Stat>
						{/if}
					</div>
				{/if}
				{#if hasLanes}
					<div class="mt-3 flex items-center gap-2">
						<Switch id="lanes-{card.id}" checked={lanesOn} onCheckedChange={setTimelineView} />
						<Label for="lanes-{card.id}" class="text-caption">Timeline view</Label>
					</div>
				{/if}
			</div>
			<!-- The video, with its timeline and what's picked under it. -->
			<div class={['flex shrink-0 flex-col gap-2', lanesView ? 'w-2/5 max-w-lg' : 'w-full']}>
				{#if playing && data.streamUrl}
					<!-- svelte-ignore a11y_media_has_caption -->
					<video
						bind:this={player}
						src={data.streamUrl}
						poster={data.poster}
						controls
						autoplay
						onloadedmetadata={(e) => (e.currentTarget.currentTime = startAt)}
						ontimeupdate={(e) => (time = e.currentTarget.currentTime)}
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
				{#if data.duration}
					<div class="flex flex-col gap-1">
						{#if !(lanesOn && hasLanes)}
							<VideoTimeline
								duration={data.duration}
								{time}
								{scenes}
								{spans}
								marks={comments}
								label={pickedItem &&
									`${pickedItem.name}: ${appearsLabel(pickedItem)?.toLowerCase()}`}
								onseek={(t) => (data.streamUrl ? play(t) : (time = t))}
							/>
						{/if}
						<!-- What's picked, and stepping through where it appears. -->
						{#if pickedItem}
							<div class="flex items-center gap-1 text-caption">
								<span class="min-w-0 truncate">
									{pickedItem.name}
									<span class="text-muted-foreground"
										>· {spans.length ? presence(spans) : 'not placed in the video'}</span
									>
								</span>
								{#if spans.length > 1}
									<Button
										variant="ghost"
										size="icon-sm"
										aria-label="Previous appearance"
										onclick={() => step(-1)}><ChevronLeft /></Button
									>
									<Button
										variant="ghost"
										size="icon-sm"
										aria-label="Next appearance"
										onclick={() => step(1)}><ChevronRight /></Button
									>
								{/if}
								<Button
									variant="ghost"
									size="icon-sm"
									class="ml-auto"
									aria-label="Stop showing {pickedItem.name}"
									onclick={() => (picked = null)}><X /></Button
								>
							</div>
						{/if}
					</div>
				{/if}
			</div>
		</div>

		<div
			class={[
				'flex flex-col gap-5',
				lanesView && '-mx-1 min-h-0 flex-1 overflow-y-auto px-1 pb-32'
			]}
		>
			{#if lanesOn && hasLanes}
				<VideoLanes
					duration={data.duration!}
					{time}
					{scenes}
					groups={laneGroups}
					{comments}
					ratings={viewers?.ratings}
					{picked}
					onseek={(t) => (data.streamUrl ? play(t) : (time = t))}
					onpick={pick}
				/>
			{:else}
				{#if scenes.length}
					<Card.Section title="Scenes" count={scenes.length}>
						{#each scenes as scene, i (i)}
							<li class="w-36">
								<!-- The scene playing now is outlined. -->
								<button
									type="button"
									disabled={!data.streamUrl}
									aria-current={currentScene === i ? 'time' : undefined}
									onclick={() => play(scene.start)}
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
						{#each reactions as r, i (i)}
							<li class="w-56">
								<Tile class="h-full w-full">
									<span class="line-clamp-3 text-caption">“{r.text}”</span>
									<span class="flex items-center gap-1.5 text-caption text-muted-foreground">
										<span class={['size-1.5 shrink-0 rounded-full', dot[r.tone]]} aria-hidden="true"
										></span>
										About the whole video
										<span class="sr-only">({r.tone})</span>
									</span>
								</Tile>
							</li>
						{/each}
					</Card.Section>
				{/if}

				{#if comments.length || reactions.length}
					<Card.Section title="Comments" count={comments.length + reactions.length}>
						{#each comments as c, i (i)}
							<li class="w-56">
								<Tile class="h-full w-full" disabled={!data.streamUrl} onclick={() => play(c.time)}>
									<span class="line-clamp-3 text-caption">“{c.text}”</span>
									<span class="flex items-center gap-1.5 text-caption text-muted-foreground">
										<span class={['size-1.5 shrink-0 rounded-full', dot[c.tone]]} aria-hidden="true"
										></span>
										{[timecode(c.time), ...(c.emotions ?? []).slice(0, 2)].join(' · ')}
										<span class="sr-only">({c.tone})</span>
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
									onclick={() => pick('character', i)}
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
										<span class="text-caption text-muted-foreground"
											>{person.actor ?? person.role}</span
										>
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
									onclick={() => pick('theme', i)}
								>
									<span class="text-caption">{theme.name}</span>
									{#if theme.description}
										<span class="line-clamp-3 text-caption text-muted-foreground"
											>{theme.description}</span
										>
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
									onclick={() => pick('brand', i)}
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
			{/if}
		</div>
	</Card.Content>
</Card.Root>
