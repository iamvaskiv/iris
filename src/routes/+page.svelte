<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { Badge, Button, Card } from '@latitudelabs/design-system';
	import { ChartColumn, Plus, Users, Video } from '@latitudelabs/design-system/icons';
	import AiDock from '#lib/components/AiDock.svelte';
	import AppHeader from '#lib/components/AppHeader.svelte';
	import CardPreview from '#lib/components/CardPreview.svelte';
	import GettingStarted from '#lib/components/GettingStarted.svelte';
	import { onMount } from 'svelte';
	import { isOnboarding, markTourSeen } from '#lib/onboarding.js';
	import TourScene from '#lib/components/TourScene.svelte';
	import { TOUR_DONE, TOUR_STEPS } from '#lib/intro.js';
	import {
		markWelcomed,
		maybeTour,
		maybeWelcome,
		showTourStep,
		WELCOME,
		workspaceChat,
		type WorkspaceResponse
	} from '#lib/workspace-chat.svelte.js';
	import { draftProjectUrl, newProject, newProjectWithVideo } from '#lib/new-project.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let thinking = $state(false);
	let error = $state('');
	let draft = $state('');

	// The first-visit tour plays in Lumi's dock (TOUR_STEPS in intro.ts), with the tiles out of the way meanwhile. On a
	// first visit the server already leaves the tiles out, so they don't show for a moment before it starts.
	const tourStep = $derived(workspaceChat.tourStep);
	let tourEnded = $state(false);
	const tilesHidden = $derived(tourStep !== null || (data.tour && !tourEnded));

	/** The tour's over (finished or skipped): the welcome follows it. */
	function endTour() {
		markTourSeen();
		tourEnded = true;
		Object.assign(workspaceChat, { tourStep: null, reply: '', choices: [] });
		if (maybeWelcome() && !data.onboarding) invalidateAll();
	}

	/** Moves through the tour. Scripted, so each step shows straight away (no thinking). */
	function goTour(to: number) {
		if (workspaceChat.tourStep === null || to < 0) return;
		if (to >= TOUR_STEPS.length) return endTour();
		showTourStep(to);
	}

	function tourKeys(e: KeyboardEvent) {
		if (workspaceChat.tourStep === null || e.defaultPrevented) return;
		if (e.key === 'ArrowRight') goTour(workspaceChat.tourStep + 1);
		else if (e.key === 'ArrowLeft') goTour(workspaceChat.tourStep - 1);
		else if (e.key === 'Escape') endTour();
	}

	/** What Iris is for, offered above the input until the conversation starts. */
	const suggestions = [
		{ label: 'Analyse and understand video content', icon: Video },
		{ label: 'Get opinion from viewers', icon: Users },
		{ label: 'Compare videos', icon: ChartColumn }
	];

	// Dropping a video anywhere on the page starts a new project with it. Enter/leave fire for every element the drag
	// crosses, so a counter (rather than the event target) tells when it has really left the page.
	let dragDepth = $state(0);
	const carriesFiles = (e: DragEvent) => !!e.dataTransfer?.types.includes('Files');

	function drop(e: DragEvent) {
		e.preventDefault();
		dragDepth = 0;
		const file = [...(e.dataTransfer?.files ?? [])].find((f) => f.type.startsWith('video/'));
		if (file) newProjectWithVideo(file);
		else error = 'Drop a video file to start a project with it.';
	}

	// Someone new is greeted by Lumi, offering the example project (see maybeWelcome).
	// The welcome starts onboarding, which lists only the example: reload the list without the others.
	// The list can also be stale the other way: links preload the page on hover, so leaving the example (which ends
	// onboarding) can arrive with the short list fetched just before. Either way, fetch it again.
	onMount(() => {
		if (maybeTour()) return;
		const welcomed = maybeWelcome();
		if (welcomed ? !data.onboarding : data.onboarding && !isOnboarding()) invalidateAll();
	});

	/** Chat at the projects level: quick answers above the input; the assistant creates/opens projects only when asked. */
	async function send(message: string) {
		markWelcomed();
		// The welcome's first two answers go straight where they say, without a round trip to Lumi.
		if (message === WELCOME.example) {
			Object.assign(workspaceChat, { reply: '', choices: [] });
			return goto('/projects/example');
		}
		if (message === WELCOME.upload) {
			Object.assign(workspaceChat, { reply: '', choices: [] });
			return newProject();
		}
		draft = '';
		error = '';
		thinking = true;
		try {
			const res: WorkspaceResponse = await fetch('/api/workspace', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ message, history: workspaceChat.history })
			}).then((r) => r.json());
			workspaceChat.history = res.history;
			workspaceChat.reply = res.text;
			workspaceChat.choices = res.choices ?? [];
			error = res.error ?? '';
			if (res.refresh) await invalidateAll();
			if (res.navigate) {
				// Let the user read where they're being taken before moving.
				const { projectId, name, message: question } = res.navigate;
				const url = projectId
					? `/projects/${projectId}${question ? `?q=${encodeURIComponent(question)}` : ''}`
					: draftProjectUrl({ name, question });
				setTimeout(() => goto(url), 1500);
			}
		} catch (e) {
			error = String(e);
		} finally {
			thinking = false;
		}
	}
</script>

<svelte:head><title>Projects · Iris</title></svelte:head>

<svelte:window onkeydown={tourKeys} />

<!-- The tour is scripted: in place of Lumi's input, what she's describing and Back / Next (Skip is top right).
     Arrow keys and Escape work too. -->
{#snippet tourControls()}
	{#if tourStep !== null}
		<div class="flex w-full flex-col items-center gap-6">
			<TourScene step={tourStep} />
			<p class="sr-only" aria-live="polite">Step {tourStep + 1} of {TOUR_STEPS.length}</p>
			<div class="flex items-center gap-2">
				{#if tourStep > 0}
					<Button variant="ghost" onclick={() => goTour(tourStep - 1)}>Back</Button>
				{/if}
				<Button onclick={() => goTour(tourStep + 1)}
					>{tourStep === TOUR_STEPS.length - 1 ? TOUR_DONE : 'Next'}</Button
				>
			</div>
		</div>
	{/if}
{/snippet}

<!-- Where we are in it, at the bottom of the screen (outside the dock, whose transform would hold it). -->
{#if tourStep !== null}
	<div
		class="fixed bottom-8 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2"
		aria-hidden="true"
	>
		{#each TOUR_STEPS as _, i (i)}
			<span
				class={[
					'h-2 rounded-full transition-all duration-300',
					i === tourStep ? 'w-6 bg-primary' : 'w-2 bg-muted-foreground/40'
				]}
			></span>
		{/each}
	</div>
{/if}

<div
	class="min-h-dvh bg-background"
	role="region"
	aria-label="Projects"
	ondragenter={(e) => carriesFiles(e) && dragDepth++}
	ondragleave={(e) => carriesFiles(e) && (dragDepth = Math.max(0, dragDepth - 1))}
	ondragover={(e) => carriesFiles(e) && e.preventDefault()}
	ondrop={drop}
>
	{#if dragDepth > 0}
		<div
			class="pointer-events-none fixed inset-4 z-20 flex items-center justify-center rounded-xl bg-card/90 shadow-raised"
		>
			<p class="text-title">Drop a video to start a project</p>
		</div>
	{/if}
	<!-- During the tour, nothing but Lumi and a way out: Skip where the nav usually is. -->
	{#if tilesHidden}
		<!-- As tall as the header, so Lumi stays put when it comes back. -->
		<div class="flex h-30 items-center justify-end px-8">
			<Button variant="ghost" onclick={endTour}>Skip</Button>
		</div>
	{:else}
		<AppHeader />
	{/if}

	<main class="mx-auto flex w-full max-w-[970px] flex-col gap-16 px-4 pb-16">
		<!-- Lumi, large: the projects-level assistant above the grid, centred in about half the screen. -->
		<section class="flex min-h-[50dvh] flex-col justify-center">
			<AiDock
				centered
				inline
				reply={workspaceChat.reply}
				choices={workspaceChat.choices}
				{suggestions}
				{thinking}
				{error}
				bind:draft
				onsubmit={send}
				below={tourStep === null ? undefined : tourControls}
			/>
		</section>

		{#if !tilesHidden}
			<section class="flex flex-col gap-4" aria-labelledby="projects-title">
				<h1 id="projects-title" class="text-center text-title text-muted-foreground">
					Previously on Lumiere
				</h1>
				<div class="grid grid-cols-1 gap-8 sm:grid-cols-2">
					<!-- First, until it's hidden: the steps from someone's first video to viewer feedback. -->
					<GettingStarted variant="tile" />
					{#each data.projects as project (project.id)}
						<a
							href="/projects/{project.id}"
							class={[
								'group rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
								project.example && 'demo'
							]}
						>
							<Card.Root
								class="relative h-72 overflow-hidden transition-shadow hover:shadow-raised"
							>
								<Card.Header>
									<Card.Title>{project.name}</Card.Title>
									{#if project.summary}<Card.Description>{project.summary}</Card.Description>{/if}
									{#if project.fielding && !project.example}
										<!-- Under the description: a quiz in the project is fielding (see isFielding). Not on the demo, whose study
										     only shows sample answers. -->
										<div class="mt-2"><Badge variant="success">Fielding in progress</Badge></div>
									{/if}
									{#if project.example}
										<!-- Bright like the checklist: the brand colours, with the dark theme's light text scoped to it. -->
										<Card.Action
											><Badge variant="secondary" class="dark bg-brand">Demo</Badge></Card.Action
										>
									{:else if project.status}
										<Card.Action><Badge variant="secondary">{project.status}</Badge></Card.Action>
									{/if}
								</Card.Header>
								<!-- The latest cards peek out of the bottom, fanned like the thumbnails (the newest on top); on hover
								     (or focus) they lift a little and fan out further. A project without cards shows its video
								     thumbnails. -->
								{#each project.cards as card, i (card.id)}
									<CardPreview
										{card}
										project={project.studies}
										class={[
											'absolute top-40 shadow-raised transition-[translate,rotate] duration-300 ease-out motion-safe:group-hover:-translate-y-2 motion-safe:group-focus-visible:-translate-y-2',
											project.cards.length === 1 &&
												'left-1/2 -translate-x-1/2 rotate-3 motion-safe:group-hover:rotate-5 motion-safe:group-focus-visible:rotate-5',
											project.cards.length === 2 &&
												(i === 0
													? 'left-1/6 -rotate-6 motion-safe:group-hover:-rotate-9 motion-safe:group-focus-visible:-rotate-9'
													: 'left-2/5 rotate-3 motion-safe:group-hover:rotate-5 motion-safe:group-focus-visible:rotate-5')
										]}
									/>
								{/each}
								{#each project.thumbnails as src, i (src)}
									<img
										{src}
										alt=""
										class={[
											'absolute -bottom-10 aspect-video w-48 rounded-md object-cover shadow-raised',
											project.thumbnails.length === 1 && 'left-1/2 -translate-x-1/2 rotate-3',
											project.thumbnails.length === 2 &&
												(i === 0 ? 'left-1/4 -rotate-6' : 'left-1/2 rotate-3')
										]}
									/>
								{/each}
							</Card.Root>
						</a>
					{/each}

					<button
						class="flex h-72 cursor-pointer items-center justify-center gap-2 rounded-xl bg-card text-title text-muted-foreground shadow-hairline transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
						onclick={() => newProject()}
					>
						<Plus class="size-4" />New
					</button>
				</div>
			</section>
		{/if}
	</main>
</div>

<style>
	/* The demo project glows in the brand colours, to stand out from the person's own projects. */
	.demo {
		box-shadow:
			0 0 0 1px color-mix(in oklab, var(--brand-2) 22%, transparent),
			0 0 28px -6px color-mix(in oklab, var(--brand-2) 55%, transparent);
		transition: box-shadow 0.3s ease-out;
	}
	.demo:hover {
		box-shadow:
			0 0 0 1px color-mix(in oklab, var(--brand-2) 30%, transparent),
			0 0 40px -4px color-mix(in oklab, var(--brand-3) 60%, transparent);
	}
	:global(.dark) .demo {
		box-shadow:
			0 0 0 1px color-mix(in oklab, var(--brand-2) 40%, transparent),
			0 0 32px -4px color-mix(in oklab, var(--brand-2) 60%, transparent);
	}
	:global(.dark) .demo:hover {
		box-shadow:
			0 0 0 1px color-mix(in oklab, var(--brand-2) 50%, transparent),
			0 0 44px -2px color-mix(in oklab, var(--brand-3) 65%, transparent);
	}
</style>
