<script lang="ts">
	import { Button, Card, SegmentedControl } from '@latitudelabs/design-system';
	import { ChevronLeft, ChevronRight, Play, X } from '@latitudelabs/design-system/icons';
	import { onMount, untrack } from 'svelte';
	import {
		hasLanes as lanesIn,
		loadVideoTab,
		setVideoTab,
		videoTab,
		type VideoTab
	} from './video-tab.svelte';
	import VideoLanes, { type LaneGroup } from './VideoLanes.svelte';
	import VideoTimeline from './VideoTimeline.svelte';
	import VideoSections from './video/VideoSections.svelte';
	import ViewerPanel from './video/ViewerPanel.svelte';
	import VideoComments from './video/VideoComments.svelte';
	import ViewerSections from './viewers/ViewerSections.svelte';
	import { insightsQuestions } from './viewer-questions';
	import { videoQuestions } from './video/questions';
	import { askable, fractionAlong, quoted } from '#lib/ask-lumi.js';
	import { toneOf } from './viewer';
	import { projectCards, viewerSources } from './viewer-sources';
	import { timecode } from './format';
	import type { Card as CardData, Span, VideoCardData } from './types';

	/**
	 * For Storybook: `studies` stands in for the project's other cards (the page shares them otherwise), and `initial`
	 * sets how it starts: a character, theme or brand picked, which tab (instead of what was remembered), and which
	 * viewer data source.
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
			tab?: VideoTab;
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

	// Tabs: Overview (what's in it), Timeline (everything as lanes along the video; coloured by kind: characters blue,
	// themes magenta, brands orange) and Viewers (how it landed). Shared by all video cards and remembered on this device.
	onMount(() => {
		if (initial.tab === undefined) loadVideoTab();
	});
	/** Storybook's starting tab, switched locally (not remembered) once someone clicks; otherwise the shared choice. */
	let localTab = $state(untrack(() => initial.tab));
	const wantedTab = $derived(localTab ?? videoTab.current);
	function pickTab(tab: VideoTab) {
		if (localTab === undefined) setVideoTab(tab);
		else localTab = tab;
	}
	const laneGroups = $derived<LaneGroup[]>([
		{
			kind: 'character',
			title: 'Characters',
			bar: 'bg-chart-blue',
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
	// Viewer data, when the video was shown to an audience: its key numbers under the summary, the Viewers tab (answers
	// to its questions, what viewers liked and didn't, every comment at its moment), dots on the timeline and lanes in
	// the Timeline tab. It comes from Lumiere (real
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
	/** What each part of the card can ask Lumi (see ask-lumi.ts). */
	const ask = $derived(
		videoQuestions(card.title, data.duration ?? 0, scenes, comments, viewers?.ratings ?? [])
	);
	/** Go to a moment: play from there, or just move the playhead when there's no stream. */
	const seek = (t: number) => (data.streamUrl ? play(t) : (time = t));
	/** The tabs this card has: Timeline when there's something to put in lanes, Viewers when there's viewer data. */
	const tabs = $derived(
		[
			{ value: 'overview', label: 'Overview' },
			hasLanes && { value: 'timeline', label: 'Timeline' },
			source && { value: 'viewers', label: 'Viewers' }
		].filter((t) => !!t)
	);
	/** The tab showing: the one picked, if this card has it; Overview otherwise. */
	const tab = $derived<VideoTab>(tabs.some((t) => t.value === wantedTab) ? wantedTab : 'overview');
	const lanesView = $derived(tab === 'timeline');
	/** The Viewers tab's questions for Lumi, naming the video by this card's title. */
	const askViewers = $derived(
		viewers && insightsQuestions(card.title, viewers, quoted(card.title))
	);
	const appearsLabel = (item?: { appearances?: Span[] }) =>
		presence(item?.appearances).replace(/^o/, 'O') || undefined;
</script>

<!-- The title, summary and viewer numbers on the left, a smaller video on the right with its timeline and what's
     picked under it. Below, two tabs: Overview (the sections) and Timeline (the lanes), remembered on this device. -->
<Card.Root>
	<Card.Content class="flex flex-col gap-6">
		<div class="flex flex-col-reverse gap-5 md:flex-row md:gap-6">
			<div class="flex min-w-0 flex-1 flex-col gap-1">
				<Card.Title>{card.title}</Card.Title>
				{#if card.subtitle || data.duration}
					<p class="text-caption text-muted-foreground">
						{[card.subtitle, data.duration && timecode(data.duration)].filter(Boolean).join(' · ')}
					</p>
				{/if}
				{#if card.body}<p class="line-clamp-6 text-body text-muted-foreground">{card.body}</p>{/if}
				<ViewerPanel id={card.id} {sources} {source} {ask} onpick={(id) => (sourceId = id)} />
			</div>
			<!-- The video, with its timeline and what's picked under it. -->
			<div class="flex w-full shrink-0 flex-col gap-2 md:w-2/5 md:max-w-sm">
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
								size="sm"
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
						<!-- Ask about the moment under the pointer. -->
						<div {@attach askable((e, el) => ask.moment(fractionAlong(e, el) * data.duration!))}>
							<VideoTimeline
								duration={data.duration}
								{time}
								{scenes}
								{spans}
								marks={comments}
								label={pickedItem &&
									`${pickedItem.name}: ${appearsLabel(pickedItem)?.toLowerCase()}`}
								onseek={seek}
							/>
						</div>
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

		<!-- Tabs: Overview (the sections), Timeline (everything as lanes along the video) and Viewers (how it landed),
		     each when the card has something for it. -->
		{#if tabs.length > 1}
			<SegmentedControl
				aria-label="View"
				class="-mb-2"
				options={tabs}
				value={tab}
				onValueChange={(v) => pickTab(v as VideoTab)}
			/>
		{/if}

		{#if tab === 'timeline'}
			<VideoLanes
				duration={data.duration!}
				{time}
				{scenes}
				groups={laneGroups}
				{comments}
				ratings={viewers?.ratings}
				{picked}
				{ask}
				onseek={seek}
				onpick={pick}
			/>
		{:else if tab === 'viewers' && viewers}
			<!-- How it landed, in colour: the source's summary (a study's), the sentiment split, answers, liked and
			     disliked, every comment. The numbers are in the header, on every tab. -->
			{#if source?.summary}<p class="text-body text-muted-foreground">{source.summary}</p>{/if}
			<ViewerSections
				sentiment={viewers.sentiment}
				questions={viewers.questions}
				liked={viewers.liked}
				disliked={viewers.disliked}
				ask={askViewers}
				onplay={data.streamUrl ? play : undefined}
			/>
			<VideoComments {comments} {reactions} canPlay={!!data.streamUrl} {ask} onplay={play} />
			{#if !viewers.questions?.length && !viewers.liked?.length && !comments.length && !reactions.length}
				<p class="text-body text-muted-foreground">No answers or comments yet.</p>
			{/if}
		{:else}
			<VideoSections
				{data}
				{currentScene}
				{isPicked}
				{appearsLabel}
				{ask}
				onplay={play}
				onpick={pick}
			/>
		{/if}
	</Card.Content>
</Card.Root>
