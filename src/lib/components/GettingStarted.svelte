<script lang="ts">
	import { Button, Card, Popover, buttonVariants, cn } from '@latitudelabs/design-system';
	import { CircleCheck, Icon } from '@latitudelabs/design-system/icons';
	import { checklist, dismissChecklist, STEPS, type Checklist } from '#lib/checklist.svelte.js';
	import { newProject } from '#lib/new-project.js';

	/**
	 * The "Getting started" checklist. `tile`: the first tile on the projects page, the same size as a project's.
	 * `pill`: pinned at the top right of a project page, the next step on a button that opens the whole list.
	 * Shows nothing once dismissed.
	 */
	let {
		variant,
		checklist: shown,
		class: className
	}: {
		variant: 'tile' | 'pill';
		/** Stories only: show this state instead of the browser's. */
		checklist?: Checklist;
		class?: string;
	} = $props();

	const progress = $derived(shown ?? checklist());
	const doneCount = $derived(progress.done.length);
	const allDone = $derived(doneCount === STEPS.length);
	const next = $derived(STEPS.find((s) => !progress.done.includes(s.id)));

	// The tile's blobs play with the pointer: a glow follows it, the colours lean away from it at different depths, and
	// they swell while it's pressed. Where it is, as a share of the card (0–1), centred when it's elsewhere.
	let pointer = $state({ x: 0.5, y: 0.5, pressed: false });
	function track(e: PointerEvent) {
		const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
		pointer.x = (e.clientX - r.left) / r.width;
		pointer.y = (e.clientY - r.top) / r.height;
	}
</script>

<!-- `fill`: in the tile, the steps spread out to fill the card's height. -->
{#snippet list(fill = false)}
	<ol class={['flex flex-col', fill ? 'flex-1 justify-between' : 'gap-2']}>
		{#each STEPS as step (step.id)}
			{@const done = progress.done.includes(step.id)}
			<li class="flex gap-2">
				{#if done}
					<Icon icon={CircleCheck} class="mt-0.5 size-4 shrink-0 text-success" label="Done" />
				{:else}
					<span
						class="mt-0.5 size-4 shrink-0 rounded-full border border-muted-foreground"
						aria-hidden="true"
					></span>
				{/if}
				<span class="flex min-w-0 flex-col gap-1">
					<span
						class={['text-body', done && 'text-muted-foreground', step === next && 'font-medium']}
						>{step.label}</span
					>
					{#if step === next}
						<span class="text-caption text-muted-foreground">{step.hint}</span>
						{#if step.id === 'upload'}
							<Button size="sm" variant="secondary" class="self-start" onclick={() => newProject()}
								>Start a project</Button
							>
						{/if}
					{/if}
				</span>
			</li>
		{/each}
	</ol>
{/snippet}

{#snippet finished()}
	<div class="flex flex-col items-start gap-3">
		<p class="text-body text-muted-foreground">
			You've done every step. Lumi's here whenever you have a new video.
		</p>
		<Button size="sm" variant="secondary" onclick={dismissChecklist}>Hide checklist</Button>
	</div>
{/snippet}

{#if !progress.dismissed}
	{#if variant === 'tile'}
		<!-- Light: a pastel wash with text tinted in the brand's dark red and purple. Dark: the brand colours at full
		     strength under the dark theme's light text. See the styles below. -->
		<Card.Root
			class={cn('getting-started relative isolate h-72 overflow-hidden', className)}
			aria-labelledby="getting-started-title"
			data-pressed={pointer.pressed || undefined}
			style="--x: {pointer.x}; --y: {pointer.y}"
			onpointermove={track}
			onpointerenter={track}
			onpointerleave={() => Object.assign(pointer, { x: 0.5, y: 0.5, pressed: false })}
			onpointerdown={() => (pointer.pressed = true)}
			onpointerup={() => (pointer.pressed = false)}
		>
			<!-- The brand colours (Lumi's orb) across the whole card: onboarding is a brand moment. They drift while the
			     card is hovered, and stop where they are when it isn't. -->
			<div class="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
				<div
					class="blob blob-1 absolute -top-20 -left-12 size-64 rounded-full bg-brand-3 blur-3xl"
				></div>
				<div
					class="blob blob-2 absolute -top-8 -right-16 size-64 rounded-full bg-brand-2 blur-3xl"
				></div>
				<div
					class="blob blob-3 absolute -bottom-24 left-1/4 size-64 rounded-full bg-brand-1 blur-3xl"
				></div>
				<!-- Follows the pointer while it's over the card. -->
				<div class="glow absolute size-40 rounded-full bg-brand-3 blur-2xl"></div>
				<!-- A little depth under the text. -->
				<div class="absolute inset-0 bg-gradient-to-r from-background/40 to-transparent"></div>
			</div>
			<Card.Header>
				<Card.Title id="getting-started-title"
					>{allDone ? "You're all set" : 'Getting started'}</Card.Title
				>
			</Card.Header>
			<Card.Content class="flex flex-1 flex-col gap-4">
				{#if allDone}{@render finished()}{:else}{@render list(true)}{/if}
			</Card.Content>
		</Card.Root>
	{:else}
		<Popover.Root>
			<Popover.Trigger
				class={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'max-w-80', className)}
			>
				<span class="truncate">{next ? `Next: ${next.label}` : "You're all set"}</span>
				<span class="text-muted-foreground">{doneCount}/{STEPS.length}</span>
			</Popover.Trigger>
			<Popover.Content align="end" class="flex w-80 flex-col gap-4" aria-label="Getting started">
				<p class="text-title">Getting started</p>
				{#if allDone}{@render finished()}{:else}{@render list()}{/if}
			</Popover.Content>
		</Popover.Root>
	{/if}
{/if}

<style>
	/* Light: the card's roles retinted for the pastel wash, so the design-system parts inside (title, steps, hints,
	   button) follow without per-element colours. Dark keeps the dark theme's roles on the full-strength colours.
	   Candidate for the design system: an "on brand" tint. */
	:global(.getting-started) {
		--card: var(--neutral-0);
		--foreground: var(--brand-4);
		--card-foreground: var(--brand-4);
		--muted-foreground: color-mix(in oklab, var(--brand-1) 80%, transparent);
		--secondary: color-mix(in oklab, var(--brand-4) 10%, transparent);
		--secondary-foreground: var(--brand-4);
		--border: color-mix(in oklab, var(--brand-4) 25%, transparent);
		/* A crisper edge than other cards: a tinted outline (drawn over the colours) and a stronger hairline. */
		--elevation-hairline: color-mix(in oklab, var(--brand-2) 30%, transparent);
		outline: 1px solid color-mix(in oklab, var(--brand-4) 22%, transparent);
		outline-offset: -1px;
	}
	.blob {
		opacity: 0.45;
	}
	:global(.dark .getting-started) {
		--card: var(--brand-4);
		--foreground: var(--neutral-0);
		--card-foreground: var(--neutral-0);
		--muted-foreground: color-mix(in oklab, var(--neutral-0) 75%, transparent);
		--secondary: color-mix(in oklab, var(--neutral-0) 15%, transparent);
		--secondary-foreground: var(--neutral-0);
		--border: color-mix(in oklab, var(--neutral-0) 40%, transparent);
		--elevation-hairline: color-mix(in oklab, var(--brand-2) 45%, transparent);
		outline-color: color-mix(in oklab, var(--neutral-0) 25%, transparent);
	}
	:global(.dark) .blob {
		opacity: 1;
	}
	/* Parallax: each colour leans away from the pointer by its own depth (and direction), on top of its drift. */
	.blob {
		transform: translate(
			calc((var(--x) - 0.5) * var(--depth)),
			calc((var(--y) - 0.5) * var(--depth))
		);
		transition:
			transform 0.5s ease-out,
			scale 0.6s ease-out;
	}
	.blob-1 {
		--depth: -70px;
	}
	.blob-2 {
		--depth: 90px;
	}
	.blob-3 {
		--depth: -50px;
	}
	:global(.getting-started[data-pressed]:hover) .blob {
		scale: 1.4;
		transition:
			transform 0.5s ease-out,
			scale 0.25s ease-out;
	}
	.glow {
		left: calc(var(--x) * 100%);
		top: calc(var(--y) * 100%);
		translate: -50% -50%;
		opacity: 0;
		transition:
			opacity 0.4s ease-out,
			left 0.25s ease-out,
			top 0.25s ease-out,
			scale 0.25s ease-out;
	}
	:global(.getting-started:hover) .glow {
		opacity: 0.55;
	}
	:global(.dark .getting-started:hover) .glow {
		opacity: 0.9;
	}
	:global(.getting-started[data-pressed]) .glow {
		scale: 1.5;
	}
	.blob {
		animation: 4s ease-in-out infinite alternate paused;
	}
	.blob-1 {
		animation-name: drift-1;
	}
	.blob-2 {
		animation-name: drift-2;
		animation-duration: 5s;
	}
	.blob-3 {
		animation-name: drift-3;
		animation-duration: 3.5s;
	}
	:global(.getting-started:hover) .blob {
		animation-play-state: running;
		scale: 1.15;
	}
	@keyframes drift-1 {
		to {
			translate: 55% 35%;
		}
	}
	@keyframes drift-2 {
		to {
			translate: -60% 45%;
		}
	}
	@keyframes drift-3 {
		to {
			translate: 40% -55%;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.blob,
		.glow {
			animation: none;
			transition: none;
			transform: none;
		}
		:global(.getting-started:hover) .blob,
		:global(.getting-started[data-pressed]) .blob,
		:global(.getting-started[data-pressed]) .glow {
			scale: none;
		}
		.glow {
			display: none;
		}
	}
</style>
