<script lang="ts">
	import { page } from '$app/state';
	import {
		Badge,
		Button,
		buttonVariants,
		Card,
		Dialog,
		Kbd,
		Label,
		Popover,
		PromptInput,
		Slider,
		Steps,
		Switch
	} from '@latitudelabs/design-system';
	import {
		ChartColumn,
		ChevronDown,
		ChevronUp,
		Icon,
		Plus,
		Settings,
		Share,
		X
	} from '@latitudelabs/design-system/icons';
	import { tick, untrack } from 'svelte';
	import { cubicOut } from 'svelte/easing';
	import { SvelteSet } from 'svelte/reactivity';
	import { readLocal, writeLocal } from '#lib/local.js';
	import { projectCardUpdate } from './viewer-sources';
	import ChannelGrid from './study/ChannelGrid.svelte';
	import ChannelPlayer from './study/ChannelPlayer.svelte';
	import ResizeHandle from './study/ResizeHandle.svelte';
	import StudySettings from './study/StudySettings.svelte';
	import StudyResults from './study/StudyResults.svelte';
	import VideoMoment from './study/VideoMoment.svelte';
	import VideoStepPreview from './study/VideoStepPreview.svelte';
	import type { VideoAsset } from './study/VideoPicker.svelte';
	import { feedSlide } from './study/slide';
	import { dragSteps, type StepMove } from './study/drag-steps';
	import {
		QUESTION_TYPES,
		SCALE_MAX,
		SCALE_MIN,
		childrenOf,
		flatSteps,
		extendSteps,
		inside,
		isEmpty,
		parseTime,
		popsUp,
		stepDescription,
		stepTitle,
		typeColor,
		typeLabel
	} from './study/question-types';
	import type { Card as CardData, Question, StudyData } from './types';

	/**
	 * For Storybook, how it starts: `settings` opens (or closes) the settings sidebar instead of what was remembered,
	 * `select` selects that step, `watch` plays that video of the selected channel full screen, and `media` stands in
	 * for the videos' links and posters (Storybook has no server to ask), and `adding` starts with a new step waiting for
	 * its type. `part` shows one side of the study, for
	 * lanes: its setup (even while fielding), or its insights (results, or an empty state until there are some).
	 */
	let {
		card,
		part,
		settings,
		select,
		watch,
		adding = false,
		media: givenMedia
	}: {
		card: CardData;
		part?: 'setup' | 'insights';
		settings?: boolean;
		select?: string;
		watch?: number;
		adding?: boolean;
		media?: Record<string, { streamUrl: string | null; poster: string | null }>;
	} = $props();

	/** Edited here and saved in the background; replaced when the card itself changes (Lumi edited it). */
	let questions = $state<Question[]>([]);
	let selected = $state(0);
	let sample = $state<StudyData['sample']>();
	$effect.pre(() => {
		const data = card.data as StudyData | undefined;
		const latest = $state.snapshot(data?.questions ?? []);
		const latestSample = $state.snapshot(data?.sample);
		untrack(() => {
			questions = latest;
			sample = latestSample;
			selected = Math.min(selected, Math.max(0, flatSteps(latest).length - 1));
		});
	});
	/** With fake responses on, the card shows (made-up) results instead of the setup. */
	const results = $derived(sample?.enabled ? sample.results : undefined);
	/** The results this card shows: none on the setup side in lanes, which shows the setup even while fielding. */
	const shownResults = $derived(part === 'setup' ? undefined : results);
	/** Every step in list order, with questions inside a video right after it; `selected` indexes this. */
	const steps = $derived(flatSteps(questions));
	const question = $derived(steps[selected]?.q);
	/** The video a selected question pops up in, if it's inside one. */
	const parent = $derived(steps[selected]?.parent);
	/** Whether the selected question pops up in a video (rather than being a channel's video, or a step of its own). */
	const inVideo = $derived(popsUp(steps[selected]));
	$effect.pre(() => {
		if (!select) return;
		const at = untrack(() => steps.findIndex((s) => s.q.id === select));
		if (at >= 0) untrack(() => (selected = at));
	});
	const selectId = async (id: string) => {
		await tick();
		selected = Math.max(
			0,
			steps.findIndex((s) => s.q.id === id)
		);
		await tick();
		list?.querySelector('[aria-current=step]')?.scrollIntoView({ block: 'nearest' });
	};

	/** Saves a moment after the last edit. Storybook has no project, so nothing is saved there. */
	let timer: ReturnType<typeof setTimeout>;
	function save() {
		const projectId = page.params.id;
		if (!projectId) return;
		clearTimeout(timer);
		timer = setTimeout(() => {
			fetch(`/api/projects/${projectId}/cards/${card.id}`, {
				method: 'PUT',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ questions: $state.snapshot(questions) })
			}).catch((e) => console.error('Saving the study failed', e));
		}, 400);
	}

	/**
	 * The question settings sidebar on the right: open or closed for every question (it doesn't follow the
	 * selection), and remembered on this device.
	 */
	const SETTINGS_KEY = 'iris.study.settings-open';
	let settingsOpen = $derived(settings ?? readLocal(SETTINGS_KEY) === 'true');
	/**
	 * Opens the sidebar by growing it from nothing at the card's right edge, so the preview narrows (and its question
	 * glides left) as it comes in, and widens again as it goes. Includes the gap before it, which would otherwise jump.
	 */
	function sidebar(node: HTMLElement) {
		const width = node.offsetWidth;
		const gap = parseFloat(getComputedStyle(node.parentElement!).columnGap) || 0;
		const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
		return {
			duration: reduce ? 0 : 280,
			easing: cubicOut,
			css: (t: number) => `width: ${t * width}px; margin-left: ${(t - 1) * gap}px; opacity: ${t};`
		};
	}
	function toggleSettings() {
		settingsOpen = !settingsOpen;
		writeLocal(SETTINGS_KEY, String(settingsOpen));
	}

	/**
	 * The question list's width: drag the edge between it and the preview (ResizeHandle), between LIST_MIN and
	 * LIST_MAX, and at most a third of the card; remembered on this device. Starts at the default (w-62).
	 */
	const LIST_KEY = 'iris.study.list-width';
	const LIST_MIN = 200;
	const LIST_MAX = 480;
	const LIST_DEFAULT = 248;
	let listWidth = $state(LIST_DEFAULT);
	$effect.pre(() => {
		const saved = Number(readLocal(LIST_KEY));
		if (saved) listWidth = Math.min(LIST_MAX, Math.max(LIST_MIN, saved));
	});

	let questionField = $state<HTMLTextAreaElement | null>(null);
	let list = $state<HTMLElement | null>(null);
	/**
	 * New adds a step whose type isn't picked yet: last in the list, its preview offering the types. It's only here
	 * (nothing is saved) until a type is picked, and goes if another step is opened instead.
	 */
	// svelte-ignore state_referenced_locally
	let undecided = $state(adding);
	async function addQuestion() {
		undecided = true;
		await tick();
		list?.querySelector('[aria-current=step]')?.scrollIntoView({ block: 'nearest' });
	}

	/** What each type is, in the new step's choice of types. */
	const TYPE_HINTS: Record<Question['type'], string> = {
		open: 'A written answer',
		choice: 'One of a few options',
		scale: 'A number from 0 to 10',
		video: 'One of your videos, to watch',
		channel: 'Videos to browse and open'
	};
	const TYPE_DOTS: Record<Question['type'], string> = {
		open: 'bg-muted-foreground',
		choice: 'bg-category-orange',
		scale: 'bg-category-magenta',
		video: 'bg-category-green',
		channel: 'bg-category-blue'
	};

	/** The new step becomes a step of that type, ready to write (a video's picker is in the settings). */
	async function decide(type: Question['type']) {
		const id = crypto.randomUUID().slice(0, 8);
		questions.push({
			id,
			type,
			text: '',
			...(type === 'choice' && { options: ['', ''] }),
			...(type === 'channel' && { videos: [] })
		});
		undecided = false;
		save();
		await selectId(id);
		questionField?.focus({ preventScroll: true });
	}

	/** Moves a step (dragged in the list) before or after a sibling; the selected step stays selected. */
	function moveStep({ step, target, after }: StepMove) {
		const id = steps[selected]?.q.id;
		const siblings = step.parent ? childrenOf(step.parent) : questions;
		siblings.splice(siblings.indexOf(step.q), 1);
		siblings.splice(siblings.indexOf(target.q) + (after ? 1 : 0), 0, step.q);
		selected = Math.max(
			0,
			flatSteps(questions).findIndex((s) => s.q.id === id)
		);
		save();
	}

	/** A question inside the selected video, popping up at `time`; kept in time order. */
	async function addQuestionAt(time: number) {
		const video = question;
		const id = crypto.randomUUID().slice(0, 8);
		(video.questions ??= []).push({ id, type: 'open', text: '', time });
		video.questions.sort((a, b) => (a.time ?? 0) - (b.time ?? 0));
		save();
		await selectId(id);
		questionField?.focus({ preventScroll: true });
	}

	/**
	 * Destructive changes ask first, in a dialog naming what goes (`confirming`); a step with nothing in it yet
	 * goes without asking.
	 */
	let confirming = $state<{ title: string; body: string; action: string; run: () => void } | null>(
		null
	);
	let confirmOpen = $state(false);
	function ask(c: NonNullable<typeof confirming>) {
		confirming = c;
		confirmOpen = true;
	}

	/** Deletes the selected step, with what's inside it; the step it was in (if any) is selected after. */
	function removeQuestion() {
		const q = question;
		const from = parent;
		const remove = () => {
			const list = from ? childrenOf(from) : questions;
			list.splice(list.indexOf(q), 1);
			const at = from ? flatSteps(questions).findIndex((s) => s.q.id === from.id) : selected;
			selected = Math.max(0, Math.min(at, flatSteps(questions).length - 1));
			save();
		};
		const what = inside(q);
		// A channel's video without questions loses nothing (the video stays in the assets), as from its tile.
		if (isEmpty(q) || (from?.type === 'channel' && !what)) return remove();
		ask(
			from?.type === 'channel'
				? {
						title: `Remove “${stepTitle(q)}” from the channel?`,
						body: `Its ${what} will be deleted too.`,
						action: 'Remove video',
						run: remove
					}
				: {
						title: `Delete “${stepTitle(q)}”?`,
						body: what
							? `Its ${what} will be deleted too.`
							: 'This deletes the step from the study.',
						action: q.type === 'channel' ? 'Delete channel' : 'Delete',
						run: remove
					}
		);
	}

	/** Moves a question inside a video to another time ("1:05" or seconds), keeping time order. */
	function setTime(text: string) {
		const time = parseTime(text);
		if (time === null || !inVideo || !parent) return;
		question.time = time;
		parent.questions!.sort((a, b) => (a.time ?? 0) - (b.time ?? 0));
		save();
		selectId(question.id);
	}

	/** Changes the selected step's type; leaving a channel or a video drops what's inside it, so that asks first. */
	function setType(type: Question['type']) {
		const q = question;
		if (type === q.type) return;
		const change = () => {
			q.type = type;
			if (type === 'choice' && !q.options?.length) q.options = ['', ''];
			if (type === 'channel') q.videos ??= [];
			if (type !== 'channel') delete q.videos;
			if (type !== 'video') delete q.questions;
			save();
		};
		const what = inside(q);
		if (!what) return change();
		ask({
			title: `Change “${stepTitle(q)}” to ${typeLabel(type).toLowerCase()}?`,
			body: `Its ${what} will be deleted: only a ${typeLabel(q.type).toLowerCase()} can hold them.`,
			action: 'Change type',
			run: change
		});
	}

	// Video steps: the user's videos to pick from, and each picked video's playable link (signed, fetched on demand;
	// Storybook has no server, so it shows only the names saved on the step).
	let videos = $state<VideoAsset[] | null>(null);
	let media = $state<Record<string, { streamUrl: string | null; poster: string | null }>>({});
	$effect.pre(() => {
		if (givenMedia) untrack(() => Object.assign(media, givenMedia));
	});
	let videosLoading = false;
	const mediaLoading = new SvelteSet<string>();
	function loadVideos() {
		if (videos || videosLoading || !page.params.id) return;
		videosLoading = true;
		fetch('/api/assets')
			.then((r) => r.json())
			.then((list: VideoAsset[]) => (videos = list))
			.catch(() => (videos = []));
	}
	function loadMedia(id: string) {
		if (media[id] || mediaLoading.has(id) || !page.params.id) return;
		mediaLoading.add(id);
		fetch(`/api/assets/${id}/media`)
			.then((r) => r.json())
			.then((m) => (media[id] = m))
			.catch(() => mediaLoading.delete(id));
	}
	$effect(() => {
		if (!question) return;
		// A video step, a question inside one (shown with the video's moment above it), or a channel (all its videos,
		// so moving between them full screen doesn't wait).
		const ids =
			question.type === 'channel'
				? (question.videos ?? []).map((v) => v.videoId)
				: [question.type === 'video' ? question.videoId : inVideo ? parent?.videoId : undefined];
		if (question.type === 'video' || question.type === 'channel') loadVideos();
		for (const id of ids) if (id) loadMedia(id);
	});

	/** Where the selected video step's preview is playing (the settings add questions there). */
	let videoTime = $state(0);

	/** In a channel with vertical sliding, a video's up and down arrows go to the channel's previous and next videos. */
	function feed(video: Question) {
		if (parent?.type !== 'channel' || !parent.vertical) return undefined;
		const list = parent.videos ?? [];
		const k = list.indexOf(video);
		const go = (to: Question | undefined, by: number) =>
			to
				? () => {
						slideBy = by;
						selectId(to.id);
					}
				: undefined;
		return { previous: go(list[k - 1], -1), next: go(list[k + 1], 1) };
	}
	/**
	 * Going along the feed with those arrows slides the videos through the preview's edges (feedSlide): the next comes
	 * up from the bottom as the current one leaves through the top. Other ways of moving switch at once.
	 */
	let slideBy = $state(0);
	let preview = $state<HTMLElement | null>(null);

	// Channels: their videos as a grid; ▶ on one plays it full screen in the preview (`playing`: which channel and
	// video, so it can't turn up on another step).
	let playing = $state<{ channel: string; index: number } | null>(null);
	$effect.pre(() => {
		if (watch === undefined) return;
		const id = untrack(() => question?.id);
		if (id) untrack(() => (playing = { channel: id, index: watch }));
	});
	const thumbnail = (v: Question) =>
		videos?.find((a) => a.id === v.videoId)?.thumbnail ??
		(v.videoId ? media[v.videoId]?.poster : undefined);
	function addToChannel(id: string) {
		(question.videos ??= []).push({
			id: crypto.randomUUID().slice(0, 8),
			type: 'video',
			text: '',
			videoId: id,
			videoName: videos?.find((v) => v.id === id)?.name
		});
		save();
	}
	/** Removes the channel's `k`th video, with its questions (asking first if it has any); the channel stays selected. */
	function removeFromChannel(k: number) {
		const channel = question;
		const v = channel.videos?.[k];
		if (!v) return;
		const remove = () => {
			channel.videos?.splice(channel.videos.indexOf(v), 1);
			save();
		};
		const what = inside(v);
		if (!what) return remove();
		ask({
			title: `Remove “${stepTitle(v)}” from the channel?`,
			body: `Its ${what} will be deleted too.`,
			action: 'Remove video',
			run: remove
		});
	}
	function setVertical(on: boolean) {
		question.vertical = on || undefined;
		save();
	}

	// Playing a video step hands over to each of its questions as the video reaches it; the question's moment plays
	// on from there. `resume` tells the video step where to carry on.
	let resume = $state<{ stepId: string; time: number } | null>(null);
	function reach(q: Question) {
		resume = null;
		selectId(q.id);
	}
	function carryOn() {
		if (!inVideo || !parent) return;
		resume = { stepId: parent.id, time: question.time ?? 0 };
		selectId(parent.id);
	}

	function setVideo(id: string) {
		question.videoId = id;
		question.videoName = videos?.find((v) => v.id === id)?.name;
		save();
	}

	let optionsList = $state<HTMLElement | null>(null);
	async function addOption(at = question.options?.length ?? 0) {
		(question.options ??= []).splice(at, 0, '');
		save();
		await tick();
		optionsList?.querySelectorAll('input')[at]?.focus();
	}

	function removeOption(i: number) {
		question.options?.splice(i, 1);
		save();
	}

	/** Tried out in the preview only; answers aren't collected yet. */
	let answer = $state('');
	let scaleValue = $state(5);

	// Share: sharing isn't built yet, so it offers fake responses instead (Lumi writes them on the server).
	const updateCard = projectCardUpdate();
	let writing = $state(false);
	let sampleError = $state('');

	// Sample results from before individual responses existed: have Lumi write them again (once per page view).
	let refreshed = false;
	$effect(() => {
		// Once per study: its insights side, beside it in lanes, leaves it to the setup.
		const stale =
			part !== 'insights' && results && questions.some((q) => !results.questions[q.id]?.people);
		if (stale && !refreshed && !writing) {
			refreshed = true;
			setSample(true);
		}
	});

	async function setSample(enabled: boolean) {
		const projectId = page.params.id;
		sampleError = '';
		if (!projectId) {
			// Storybook: no server; show whatever results the card already has.
			sample = { ...sample, enabled };
			return;
		}
		writing = enabled;
		try {
			const res = await fetch(`/api/projects/${projectId}/cards/${card.id}/sample`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ enabled })
			});
			if (!res.ok) throw new Error(`${res.status}`);
			sample = (await res.json()).sample;
			// Hand the results back to the page, so the project's video and sources cards show them at once.
			updateCard?.(card.id, {
				...card.data,
				questions: $state.snapshot(questions),
				sample: $state.snapshot(sample)
			});
		} catch (e) {
			sampleError = `Couldn't make up the answers (${e instanceof Error ? e.message : e}).`;
		} finally {
			writing = false;
		}
	}
</script>

<!-- As tall as the project page allows a full-size card (--card-height: below the header, behind Lumi's dock); the
     question list and the preview scroll inside. -->
<Card.Root class="relative h-(--card-height) min-h-100">
	<!-- Above the results, which scroll up underneath it on the right. -->
	<Card.Header class={[shownResults && 'relative z-20']}>
		<Card.Title class="flex items-center gap-2">
			{card.title}
			{#if shownResults}<Badge variant="secondary">Sample data</Badge>{/if}
			{#if writing && shownResults}<span class="text-caption font-normal text-muted-foreground"
					>Lumi is updating the answers…</span
				>{/if}
		</Card.Title>
		<Card.Description
			>{part === 'insights'
				? 'Insights'
				: (card.subtitle ?? 'Questions to share with people')}</Card.Description
		>
		<!-- With sample results the study reads as live: a "Fielding in progress" badge beside Share. -->
		<Card.Action class="flex items-center gap-2">
			{#if results}<Badge variant="success">Fielding in progress</Badge>{/if}
			<Popover.Root>
				<Popover.Trigger class={buttonVariants({ variant: 'ghost', size: 'sm' })}>
					<Share data-icon="inline-start" />Share
				</Popover.Trigger>
				<Popover.Content align="end" aria-label="Share">
					<p>
						Sorry, sharing doesn't work yet. But we can pretend some answers have already come in.
					</p>
					{@render fakeResponses(`sample-${card.id}`)}
				</Popover.Content>
			</Popover.Root>
		</Card.Action>
	</Card.Header>
	{#if shownResults}
		<Card.Content class="flex min-h-0 flex-1">
			<StudyResults {questions} results={shownResults} />
		</Card.Content>
	{:else if part === 'insights'}
		<!-- No answers yet: they'd come in from sharing, which isn't built; fake ones can stand in. -->
		<Card.Content class="flex min-h-0 flex-1 items-center justify-center pb-24">
			<div class="flex max-w-sm flex-col items-center gap-3 text-center">
				<Icon icon={ChartColumn} size="lg" class="text-muted-foreground" />
				<p class="text-title">No responses yet</p>
				<p class="text-caption text-muted-foreground">
					Insights show here once people answer. Sharing doesn't work yet, but Lumi can make up some
					answers to show how they'd read.
				</p>
				{@render fakeResponses(`sample-insights-${card.id}`)}
			</div>
		</Card.Content>
	{:else}
		<Card.Content class="flex min-h-0 flex-1 flex-row gap-4">
			<!-- At most a third of the card, so a narrow window keeps room for the preview. -->
			<div class="relative flex max-w-1/3 shrink-0 flex-col gap-1" style:width="{listWidth}px">
				<ResizeHandle
					bind:value={listWidth}
					min={LIST_MIN}
					max={LIST_MAX}
					initial={LIST_DEFAULT}
					label="Resize the question list"
					controls="study-list-{card.id}"
					onchange={(width) => writeLocal(LIST_KEY, String(width))}
				/>
				<div bind:this={list} id="study-list-{card.id}" class="min-h-0 overflow-y-auto">
					<Steps
						aria-label="Questions"
						{@attach extendSteps(steps)}
						{@attach dragSteps(steps, moveStep)}
						steps={[
							...steps.map((s) => ({
								title: stepTitle(s.q),
								description: stepDescription(s),
								color: typeColor(s.q.type),
								indent: !!s.parent,
								number: s.number
							})),
							...(undecided
								? [
										{
											title: 'New step',
											description: 'Pick a type',
											number: `${questions.length + 1}.`
										}
									]
								: [])
						]}
						current={undecided ? steps.length : selected}
						onselect={(i: number) => {
							if (i >= steps.length) return;
							// Opening another step drops the new one still waiting for a type.
							undecided = false;
							resume = null;
							playing = null;
							selected = i;
						}}
					/>
				</div>
				<Button
					variant="outline"
					class="h-14 w-full justify-start gap-3 rounded-sm px-2 text-muted-foreground"
					onclick={addQuestion}
				>
					<Icon icon={Plus} />New
				</Button>
			</div>

			<!-- Room at the bottom (pb-32) keeps the preview's content clear of Lumi's dock, which covers the card's foot.
			     Wrapped so a channel's full-screen video can cover it whatever it's scrolled to; isolated, so the video stays
			     above the preview but under Lumi's dock. -->
			<div class="relative isolate flex min-w-0 flex-1">
				<section
					bind:this={preview}
					aria-label="Preview"
					class={[
						'relative flex flex-1 flex-col rounded-sm bg-background px-8 pt-16 pb-32',
						// Clipped while videos slide past its edges along a channel's feed, so no scrollbar flashes up.
						slideBy ? 'overflow-hidden' : 'overflow-y-auto'
					]}
				>
					<!-- Not while picking a new step's type: that isn't something people will see. -->
					{#if !undecided}<p class="absolute top-4 left-4 text-caption text-muted-foreground">
							Preview
						</p>{/if}
					{#if undecided}
						<!-- The new step's choice of types, styled like a multiple-choice question's options. -->
						<div class="m-auto flex w-full max-w-xl flex-col gap-4">
							<p class="text-heading">What kind of step?</p>
							<div class="flex flex-col gap-1" role="group" aria-label="Step types">
								{#each QUESTION_TYPES as t (t.value)}
									<button
										type="button"
										class="group/type flex h-12 items-center gap-4 rounded-lg bg-secondary px-4 text-left text-body-lg transition-[background-color,box-shadow] duration-200 outline-none hover:bg-card hover:shadow-hairline focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none"
										onclick={() => decide(t.value)}
									>
										<span
											class="size-2 shrink-0 rounded-full transition-[scale] duration-200 group-hover/type:scale-150 motion-reduce:transition-none {TYPE_DOTS[
												t.value
											]}"
										></span>
										<span class="flex-1">{t.label}</span>
										<span class="text-caption text-muted-foreground">{TYPE_HINTS[t.value]}</span>
									</button>
								{/each}
							</div>
						</div>
					{:else if question}
						<Button
							variant="ghost"
							size="icon-sm"
							aria-label="Question settings"
							aria-pressed={settingsOpen}
							aria-controls="study-settings-{card.id}"
							title={settingsOpen ? 'Hide question settings' : 'Show question settings'}
							class={['absolute top-2 right-2', settingsOpen && 'bg-accent']}
							onclick={toggleSettings}
						>
							<Settings />
						</Button>

						<!-- The preview is also where the question is written: edit it as people will see it. -->
						<div class="m-auto flex w-full max-w-xl flex-col gap-4">
							{#if parent && inVideo}
								{@const m = parent.videoId ? media[parent.videoId] : undefined}
								<!-- The moment it pops up at; play to carry on watching from there. -->
								<VideoMoment
									streamUrl={m?.streamUrl}
									poster={m?.poster}
									time={question.time ?? 0}
									oncontinue={carryOn}
								/>
							{/if}
							<!-- A video step has no text of its own on screen: the video is the step (picked in the settings). -->
							{#if question.type !== 'video'}
								<textarea
									bind:this={questionField}
									bind:value={question.text}
									oninput={save}
									rows="1"
									aria-label="Question"
									placeholder={question.type === 'channel'
										? 'Name the channel'
										: 'Type your question'}
									class="field-sizing-content resize-none bg-transparent text-heading outline-none placeholder:text-placeholder"
								></textarea>
							{/if}
							{#if question.type === 'open'}
								<PromptInput
									bind:value={answer}
									placeholder={question.placeholder || 'Type your answer…'}
									label="Answer (preview)"
									onsubmit={() => (answer = '')}
								/>
							{:else if question.type === 'video'}
								{#if question.videoId}
									{@const m = media[question.videoId]}
									{@const along = feed(question)}
									<!-- One cell, so the leaving and arriving videos overlap while they slide (the preview clips them). -->
									<div class="relative grid">
										{#key question.id + question.videoId}
											<div
												class="col-start-1 row-start-1"
												in:feedSlide={{ dir: slideBy, within: preview }}
												out:feedSlide={{ dir: -slideBy, within: preview }}
												onintroend={() => (slideBy = 0)}
											>
												<VideoStepPreview
													step={question}
													streamUrl={m?.streamUrl}
													poster={m?.poster}
													resumeAt={resume?.stepId === question.id ? resume.time : null}
													bind:time={videoTime}
													onreach={reach}
												/>
											</div>
										{/key}
										{#if along}
											<!-- Vertical sliding: up to the channel's previous video, down to its next. Over the video, staying put
											     while the videos slide under them (the layer matches the video's own box). -->
											<div class="pointer-events-none absolute inset-x-0 top-0 aspect-video">
												<div
													class="pointer-events-auto absolute top-1/2 right-4 flex -translate-y-1/2 flex-col gap-2"
												>
													<Button
														variant="secondary"
														size="icon-sm"
														aria-label="Previous video in the channel"
														disabled={!along.previous}
														onclick={along.previous}><ChevronUp /></Button
													>
													<Button
														variant="secondary"
														size="icon-sm"
														aria-label="Next video in the channel"
														disabled={!along.next}
														onclick={along.next}><ChevronDown /></Button
													>
												</div>
											</div>
										{/if}
									</div>
								{:else}
									<div
										class="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-lg bg-muted text-body text-muted-foreground"
									>
										Pick one of your videos in the settings.
										{#if !settingsOpen}
											<Button variant="secondary" size="sm" onclick={toggleSettings}
												>Choose a video</Button
											>
										{/if}
									</div>
								{/if}
							{:else if question.type === 'channel'}
								<ChannelGrid
									channel={question}
									{videos}
									{thumbnail}
									onopen={(v) => selectId(v.id)}
									onwatch={(index) => (playing = { channel: question.id, index })}
									onremove={removeFromChannel}
									onadd={addToChannel}
								/>
							{:else if question.type === 'scale'}
								<!-- Try it: the number picked shows on the right; the ends are labelled below. -->
								<div class="flex items-center gap-4">
									<Slider
										type="single"
										bind:value={scaleValue}
										min={SCALE_MIN}
										max={SCALE_MAX}
										step={1}
										aria-label="Answer (preview)"
										class="flex-1"
									/>
									<span class="w-8 text-right text-body-lg font-medium">{scaleValue}</span>
								</div>
								<div class="-mt-2 flex justify-between pr-12 text-caption text-muted-foreground">
									<span>{SCALE_MIN}</span>
									<span>{SCALE_MAX}</span>
								</div>
							{:else}
								<ol bind:this={optionsList} class="flex flex-col gap-1" aria-label="Options">
									{#each question.options ?? [] as _, i (i)}
										<li
											class="flex h-12 items-center gap-6 rounded-lg bg-secondary pr-1 pl-2 text-body-lg"
										>
											<Kbd aria-hidden="true">{i + 1}</Kbd>
											<input
												bind:value={question.options![i]}
												oninput={save}
												onkeydown={(e) => {
													if (e.key === 'Enter' && !e.isComposing) {
														e.preventDefault();
														addOption(i + 1);
													}
												}}
												aria-label="Option {i + 1}"
												placeholder="Option {i + 1}"
												class="min-w-0 flex-1 bg-transparent outline-none placeholder:text-placeholder"
											/>
											<Button
												variant="ghost"
												size="icon-sm"
												aria-label="Remove option {i + 1}"
												onclick={() => removeOption(i)}
											>
												<X />
											</Button>
										</li>
									{/each}
								</ol>
								<Button
									variant="ghost"
									class="self-start text-muted-foreground"
									onclick={() => addOption()}
								>
									<Plus data-icon="inline-start" />Add option
								</Button>
							{/if}
						</div>
					{:else}
						<p class="m-auto text-body text-muted-foreground">Add a question to see it here.</p>
					{/if}
				</section>
				{#if playing && question?.type === 'channel' && playing.channel === question.id}
					<ChannelPlayer
						channel={question}
						bind:index={playing.index}
						{media}
						onclose={() => (playing = null)}
						onreach={(q) => {
							playing = null;
							selectId(q.id);
						}}
					/>
				{/if}
			</div>
			{#if question && settingsOpen && !undecided}
				<!-- The selected question's settings; stays open (or closed) as you move between questions. -->
				<!-- Clips its fixed-width content while it grows or shrinks, so nothing rewraps on the way. -->
				<aside
					id="study-settings-{card.id}"
					aria-label="Question settings"
					class="shrink-0 overflow-hidden"
					transition:sidebar
				>
					<div
						class="relative flex h-full w-62 flex-col gap-5 overflow-y-auto rounded-sm bg-background p-4 pt-12"
					>
						<StudySettings
							id={card.id}
							{question}
							{parent}
							{inVideo}
							{videos}
							{videoTime}
							onsettype={setType}
							onsetvideo={setVideo}
							onaddquestion={addQuestionAt}
							onsetvertical={setVertical}
							onsettime={setTime}
							onremove={removeQuestion}
						/>
					</div>
				</aside>
			{/if}
		</Card.Content>
	{/if}
</Card.Root>

<!-- Share's stand-in: switches made-up answers on or off, with how that's going. -->
{#snippet fakeResponses(id: string)}
	<div class="flex items-center justify-between gap-4">
		<Label for={id}>Fake responses</Label>
		<Switch
			{id}
			checked={writing || !!sample?.enabled}
			disabled={writing}
			onCheckedChange={setSample}
		/>
	</div>
	{#if writing}
		<p class="text-caption text-muted-foreground">Lumi is making up answers…</p>
	{:else if sampleError}
		<p class="text-caption text-destructive">{sampleError}</p>
	{/if}
{/snippet}

<!-- Asks before a change that loses work (deleting a step, or changing its type), naming what goes. -->
<Dialog.Root bind:open={confirmOpen}>
	<Dialog.Content>
		{#if confirming}
			<Dialog.Header>
				<Dialog.Title>{confirming.title}</Dialog.Title>
				<Dialog.Description>{confirming.body}</Dialog.Description>
			</Dialog.Header>
			<Dialog.Footer>
				<Dialog.Close class={buttonVariants({ variant: 'secondary' })}>Cancel</Dialog.Close>
				<Button
					variant="destructive"
					onclick={() => {
						confirming?.run();
						confirmOpen = false;
					}}>{confirming.action}</Button
				>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>
