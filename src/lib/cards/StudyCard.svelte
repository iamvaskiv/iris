<script lang="ts">
	import { page } from '$app/state';
	import {
		Badge,
		Button,
		buttonVariants,
		Card,
		Kbd,
		Label,
		Popover,
		PromptInput,
		Slider,
		Select,
		Steps,
		Switch
	} from '@latitudelabs/design-system';
	import { Icon, Plus, Share, Trash, X } from '@latitudelabs/design-system/icons';
	import { tick, untrack } from 'svelte';
	import StudyResults from './study/StudyResults.svelte';
	import VideoMoment from './study/VideoMoment.svelte';
	import VideoStepPreview from './study/VideoStepPreview.svelte';
	import {
		QUESTION_TYPES,
		SCALE_MAX,
		SCALE_MIN,
		flatSteps,
		parseTime,
		stepDescription,
		stepTitle,
		timecode,
		typeColor,
		typeLabel
	} from './study/question-types';
	import type { Card as CardData, Question, StudyData } from './types';

	let { card }: { card: CardData } = $props();

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
	/** Every step in list order, with questions inside a video right after it; `selected` indexes this. */
	const steps = $derived(flatSteps(questions));
	const question = $derived(steps[selected]?.q);
	/** The video a selected question pops up in, if it's inside one. */
	const parent = $derived(steps[selected]?.parent);
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

	let questionField = $state<HTMLTextAreaElement | null>(null);
	let list = $state<HTMLElement | null>(null);
	async function addQuestion() {
		const id = crypto.randomUUID().slice(0, 8);
		questions.push({ id, type: 'open', text: '' });
		save();
		await selectId(id);
		questionField?.focus({ preventScroll: true });
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

	function removeQuestion() {
		const from = parent ? parent.questions! : questions;
		from.splice(from.indexOf(question), 1);
		selected = Math.max(0, Math.min(selected - (parent ? 1 : 0), flatSteps(questions).length - 1));
		save();
	}

	/** Moves a question inside a video to another time ("1:05" or seconds), keeping time order. */
	function setTime(text: string) {
		const time = parseTime(text);
		if (time === null || !parent) return;
		question.time = time;
		parent.questions!.sort((a, b) => (a.time ?? 0) - (b.time ?? 0));
		save();
		selectId(question.id);
	}

	function setType(type: string) {
		question.type = type as Question['type'];
		if (question.type === 'choice' && !question.options?.length) question.options = ['', ''];
		save();
	}

	// Video steps: the user's videos to pick from, and each picked video's playable link (signed, fetched on demand;
	// Storybook has no server, so it shows only the names saved on the step).
	type VideoAsset = { id: string; name: string; thumbnail?: string };
	let videos = $state<VideoAsset[] | null>(null);
	let media = $state<Record<string, { streamUrl: string | null; poster: string | null }>>({});
	$effect(() => {
		// A video step, or a question inside one (shown with the video's moment above it).
		const id = question?.type === 'video' ? question.videoId : parent?.videoId;
		if (!id || !page.params.id) return;
		if (!videos)
			fetch('/api/assets')
				.then((r) => r.json())
				.then((list: VideoAsset[]) => (videos = list))
				.catch(() => (videos = []));
		if (!media[id])
			fetch(`/api/assets/${id}/media`)
				.then((r) => r.json())
				.then((m) => (media[id] = m))
				.catch(() => {});
	});

	// Playing a video step hands over to each of its questions as the video reaches it; the question's moment plays
	// on from there. `resume` tells the video step where to carry on.
	let resume = $state<{ stepId: string; time: number } | null>(null);
	function reach(q: Question) {
		morph(() => {
			resume = null;
			return selectId(q.id);
		});
	}
	function carryOn() {
		if (!parent) return;
		const time = question.time ?? 0;
		const stepId = parent.id;
		morph(() => {
			resume = { stepId, time };
			return selectId(stepId);
		});
	}

	// Moving between a video step and its questions morphs the big player into the question's small video and
	// back (a view transition: both carry the same view-transition-name); the rest cross-fades. It waits for the
	// incoming video to show its frame (briefly) so the morph doesn't land on a blank one.
	let preview = $state<HTMLElement | null>(null);
	const videoName = $derived(`study-video-${card.id}`);
	function frameShown() {
		const v = preview?.querySelector<HTMLVideoElement>('[data-study-video]');
		if (!v || (v.readyState >= 2 && !v.seeking)) return;
		return new Promise<void>((done) => {
			v.addEventListener('seeked', () => done(), { once: true });
			v.addEventListener('loadeddata', () => done(), { once: true });
			setTimeout(done, 500);
		});
	}
	async function morph(update: () => unknown) {
		const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (!document.startViewTransition || reduce) return update();
		document.startViewTransition(async () => {
			await update();
			await tick();
			await frameShown();
		});
	}
	/** Whether going from the selected step to step `i` passes between a video and its questions. */
	const aboutVideo = (i: number) =>
		[steps[selected], steps[i]].some((s) => s && (s.parent || s.q.type === 'video'));

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
	let writing = $state(false);
	let sampleError = $state('');

	// Sample results from before individual responses existed: have Lumi write them again (once per page view).
	let refreshed = false;
	$effect(() => {
		const stale = results && questions.some((q) => !results.questions[q.id]?.people);
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
	<Card.Header class={[results && 'relative z-20']}>
		<Card.Title class="flex items-center gap-2">
			{card.title}
			{#if results}<Badge variant="secondary">Sample data</Badge>{/if}
			{#if writing && results}<span class="text-caption font-normal text-muted-foreground"
					>Lumi is updating the answers…</span
				>{/if}
		</Card.Title>
		<Card.Description>{card.subtitle ?? 'Questions to share with people'}</Card.Description>
		<Card.Action>
			<Popover.Root>
				<Popover.Trigger class={buttonVariants({ variant: 'ghost', size: 'sm' })}>
					<Share data-icon="inline-start" />Share
				</Popover.Trigger>
				<Popover.Content align="end" aria-label="Share">
					<p>
						Sorry, sharing doesn't work yet. But we can pretend some answers have already come in.
					</p>
					<div class="flex items-center justify-between gap-4">
						<Label for="sample-{card.id}">Fake responses</Label>
						<Switch
							id="sample-{card.id}"
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
				</Popover.Content>
			</Popover.Root>
		</Card.Action>
	</Card.Header>
	{#if results}
		<Card.Content class="flex min-h-0 flex-1">
			<StudyResults {questions} {results} />
		</Card.Content>
	{:else}
		<Card.Content class="flex min-h-0 flex-1 flex-row gap-4">
			<div class="flex w-62 shrink-0 flex-col gap-1">
				<div bind:this={list} class="min-h-0 overflow-y-auto">
					<Steps
						aria-label="Questions"
						steps={steps.map((s) => ({
							title: stepTitle(s.q),
							description: stepDescription(s),
							color: typeColor(s.q.type),
							indent: !!s.parent,
							number: s.number
						}))}
						current={selected}
						onselect={(i: number) => {
							const go = () => ((resume = null), (selected = i));
							if (aboutVideo(i)) morph(go);
							else go();
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

			<!-- Room at the bottom (pb-32) keeps the preview's content clear of Lumi's dock, which covers the card's foot. -->
			<section
				bind:this={preview}
				aria-label="Preview"
				class="relative flex flex-1 flex-col overflow-y-auto rounded-sm bg-background px-8 pt-16 pb-32"
			>
				<p class="absolute top-4 left-4 text-caption text-muted-foreground">Preview</p>
				{#if question}
					<div class="absolute top-2 right-2 flex items-center gap-1">
						{#if parent}
							<!-- When it pops up in the video: type a new time to move it. -->
							<input
								value={timecode(question.time ?? 0)}
								onchange={(e) => setTime(e.currentTarget.value)}
								aria-label="Pops up in the video at (m:ss)"
								title="Pops up in the video at"
								class="h-8 w-14 rounded-sm bg-secondary text-center text-body font-medium text-secondary-foreground outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50"
							/>
						{/if}
						<Select.Root type="single" value={question.type} onValueChange={setType}>
							<Select.Trigger size="sm" aria-label="Question type">
								{typeLabel(question.type)}
							</Select.Trigger>
							<Select.Content align="end">
								<!-- Questions inside a video can't be videos themselves. -->
								{#each QUESTION_TYPES.filter((t) => !parent || t.value !== 'video') as t (t.value)}
									<Select.Item value={t.value} label={t.label} />
								{/each}
							</Select.Content>
						</Select.Root>
						<Button
							variant="ghost"
							size="icon-sm"
							aria-label="Delete question"
							onclick={removeQuestion}
						>
							<Trash />
						</Button>
					</div>

					<!-- The preview is also where the question is written: edit it as people will see it. -->
					<div class="m-auto flex w-full max-w-xl flex-col gap-4">
						{#if parent}
							{@const m = parent.videoId ? media[parent.videoId] : undefined}
							<!-- The moment it pops up at; play to carry on watching from there. -->
							<VideoMoment
								streamUrl={m?.streamUrl}
								poster={m?.poster}
								time={question.time ?? 0}
								transitionName={videoName}
								oncontinue={carryOn}
							/>
						{/if}
						<textarea
							bind:this={questionField}
							bind:value={question.text}
							oninput={save}
							rows="1"
							aria-label="Question"
							placeholder={question.type === 'video'
								? 'Say something before the video (optional)'
								: 'Type your question'}
							class="field-sizing-content resize-none bg-transparent text-heading outline-none placeholder:text-placeholder"
						></textarea>
						{#if question.type === 'open'}
							<PromptInput
								bind:value={answer}
								placeholder={question.placeholder || 'Type your answer…'}
								label="Answer (preview)"
								onsubmit={() => (answer = '')}
							/>
						{:else if question.type === 'video'}
							{#snippet picker()}
								<Select.Root type="single" value={question.videoId ?? ''} onValueChange={setVideo}>
									<Select.Trigger aria-label="Video" class="max-w-full min-w-0">
										<span class="truncate">{question.videoName ?? 'Choose a video'}</span>
									</Select.Trigger>
									<Select.Content>
										{#each videos ?? [] as v (v.id)}
											<Select.Item value={v.id} label={v.name} />
										{:else}
											<p class="px-3 py-2 text-caption text-muted-foreground">
												{videos ? 'No videos yet. Drop one on the page to upload it.' : 'Loading…'}
											</p>
										{/each}
									</Select.Content>
								</Select.Root>
							{/snippet}
							{#if question.videoId}
								{@const m = media[question.videoId]}
								{#key question.videoId}
									<VideoStepPreview
										step={question}
										streamUrl={m?.streamUrl}
										poster={m?.poster}
										{picker}
										resumeAt={resume?.stepId === question.id ? resume.time : null}
										transitionName={videoName}
										onadd={addQuestionAt}
										onreach={reach}
									/>
								{/key}
							{:else}
								<div class="self-start">{@render picker()}</div>
								<div
									class="flex aspect-video w-full items-center justify-center rounded-lg bg-muted text-body text-muted-foreground"
								>
									Pick one of your videos to show here.
								</div>
							{/if}
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
		</Card.Content>
	{/if}
</Card.Root>

<style>
	/* The video morphing between a video step's player and a question's small video. */
	:global(::view-transition-group(*.study-video)) {
		animation-duration: 450ms;
		animation-timing-function: cubic-bezier(0.2, 0, 0, 1);
	}
	:global(::view-transition-old(*.study-video)),
	:global(::view-transition-new(*.study-video)) {
		height: 100%;
		object-fit: cover;
	}
</style>
