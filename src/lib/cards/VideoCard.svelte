<script lang="ts">
	import { Button, Card, Label, Switch } from '@latitudelabs/design-system';
	import { ChevronLeft, ChevronRight, Play, X } from '@latitudelabs/design-system/icons';
	import { onMount, untrack } from 'svelte';
	import {
		hasLanes as lanesIn,
		loadTimelineView,
		setTimelineView,
		timelineView
	} from './timeline-view.svelte';
	import VideoLanes, { type LaneGroup } from './VideoLanes.svelte';
	import VideoTimeline from './VideoTimeline.svelte';
	import VideoSections from './video/VideoSections.svelte';
	import ViewerPanel from './video/ViewerPanel.svelte';
	import { toneOf } from './viewer';
	import { projectCards, viewerSources } from './viewer-sources';
	import { timecode } from './format';
	import type { Card as CardData, Span, VideoCardData } from './types';

	/**
	 * For Storybook: `studies` stands in for the project's other cards (the page shares them otherwise), and `initial`
	 * sets how it starts: a character, theme or brand picked, Timeline view on or off (instead of what was
	 * remembered), and which viewer data source.
	 */
	let {
		card,
		studies,
		initial = {}
	}: {
		card: CardData;
		studies?: CardData[];
		initial?: {
			pick?: { kind: 'character' | 'theme' | 'brand'; index: number };
			lanes?: boolean;
			source?: string;
		};
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
	let picked = $state<{ kind: Kind; index: number } | null>(untrack(() => initial.pick ?? null));
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
		if (initial.lanes === undefined) loadTimelineView();
	});
	const lanesOn = $derived(initial.lanes ?? timelineView.on);
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
	// its moment (a section of them, dots on the timeline, and lanes in Timeline view). It comes from Lumiere (real
	// viewers), or one of the project's studies that shows this video (its sample results), picked with Source.
	const sharedCards = projectCards();
	const sources = $derived(
		viewerSources(data.viewers, studies ?? sharedCards?.() ?? [], data.videoId)
	);
	let sourceId = $state<string | null>(untrack(() => initial.source ?? null));
	const source = $derived(sources.find((s) => s.id === sourceId) ?? sources[0]);
	const viewers = $derived(source?.viewers);
	const comments = $derived(
		(viewers?.comments ?? []).map((c) => ({ ...c, tone: toneOf(c.sentiment) }))
	);
	/** A study's reactions to the whole video: no moment, so in the Comments section only. */
	const reactions = $derived(
		(source?.reactions ?? []).map((r) => ({ ...r, tone: toneOf(r.sentiment) }))
	);

	const hasLanes = $derived(lanesIn(card));
	/** Timeline view is showing (it's on, and there's something to put in lanes). */
	const lanesView = $derived(lanesOn && hasLanes);
	const appearsLabel = (item?: { appearances?: Span[] }) =>
		presence(item?.appearances).replace(/^o/, 'O') || undefined;
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
				<ViewerPanel id={card.id} {sources} {source} onpick={(id) => (sourceId = id)} />
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
						{#if !lanesView}
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
			{#if lanesView}
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
				<VideoSections
					{data}
					{comments}
					{reactions}
					{currentScene}
					{isPicked}
					{appearsLabel}
					onplay={play}
					onpick={pick}
				/>
			{/if}
		</div>
	</Card.Content>
</Card.Root>
