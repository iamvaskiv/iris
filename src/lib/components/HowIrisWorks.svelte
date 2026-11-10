<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { Badge, Button, Orb } from '@latitudelabs/design-system';
	import { ArrowUp, Icon } from '@latitudelabs/design-system/icons';
	import Logo from './Logo.svelte';

	/**
	 * "How Iris works": a three-step intro shown over the projects page on someone's first visit, before Lumi's
	 * welcome. Each step has a small looping animation; Skip (or Escape) closes it at any point.
	 */
	let { onclose }: { onclose: () => void } = $props();

	const STEPS = [
		{
			title: 'Ask Lumi anything',
			body: 'Type a question about your videos, or drop a video in. There are no menus to learn.'
		},
		{
			title: 'Lumi answers in cards',
			body: "Each answer lands as a card: a video's scenes, what viewers said, side-by-side comparisons. Her reply stays short."
		},
		{
			title: 'Cards keep up with you',
			body: "Ask a follow-up and Lumi updates the card you're looking at, instead of piling up another one."
		}
	];

	let step = $state(0);
	// null, not undefined: the design system's Button has a fallback for `ref`, and binding undefined to it throws.
	let nextButton = $state<HTMLElement | null>(null);
	const last = $derived(step === STEPS.length - 1);

	async function go(to: number) {
		if (to < 0) return;
		if (to >= STEPS.length) return onclose();
		step = to;
		await tick();
		nextButton?.focus();
	}

	function onkeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') return onclose();
		if (e.key === 'ArrowRight') go(step + 1);
		if (e.key === 'ArrowLeft') go(step - 1);
	}

	// The page underneath doesn't scroll while the intro is up.
	onMount(() => {
		nextButton?.focus();
		const html = document.documentElement;
		const before = html.style.overflow;
		html.style.overflow = 'hidden';
		return () => void (html.style.overflow = before);
	});

	// Step 1 types questions into the field, one after another.
	const QUESTIONS = [
		'What did viewers think of the trailer?',
		'Which scene landed best?',
		'Compare it with the teaser'
	];
	const reducedMotion =
		typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
	let typed = $state(reducedMotion ? QUESTIONS[0] : '');
	let sent = $state(false);
	$effect(() => {
		if (step !== 0 || reducedMotion) return;
		let q = 0;
		let i = 0;
		let wait = 0;
		const timer = setInterval(() => {
			if (wait > 0) return void wait--;
			const question = QUESTIONS[q];
			if (i < question.length) {
				typed = question.slice(0, ++i);
				sent = false;
				return;
			}
			if (!sent) {
				// Typed: a beat, then it's sent (the button pulses) and the next question starts.
				sent = true;
				wait = 18;
				return;
			}
			typed = '';
			i = 0;
			q = (q + 1) % QUESTIONS.length;
			wait = 6;
		}, 55);
		return () => clearInterval(timer);
	});
</script>

<svelte:window {onkeydown} />

<div
	class="fixed inset-0 z-40 flex flex-col bg-background"
	role="dialog"
	aria-modal="true"
	aria-labelledby="intro-title"
	aria-describedby="intro-body"
	out:fade={{ duration: 250 }}
>
	<header class="flex items-center justify-between px-8 py-8">
		<Logo class="h-14 w-auto" />
		<Button variant="ghost" onclick={onclose}>Skip</Button>
	</header>

	<main class="flex flex-1 flex-col items-center justify-center gap-8 px-4 pb-16">
		<!-- The stage: one small looping scene per step. Decorative; the text below says the same. -->
		<div
			class="stage relative h-64 w-full max-w-md overflow-hidden rounded-xl bg-card shadow-hairline"
			aria-hidden="true"
		>
			{#key step}
				<div
					class="absolute inset-0"
					in:fade={{ duration: 300, delay: 100 }}
					out:fade={{ duration: 150 }}
				>
					{#if step === 0}
						<div class="flex h-full flex-col items-center justify-center gap-6 px-8">
							<Orb size={48} state={sent ? 'speaking' : 'idle'} pulse={sent} />
							<div class="flex h-12 w-full items-center gap-2 rounded-lg bg-input pr-2 pl-4">
								<span class="min-w-0 flex-1 truncate text-body">
									{typed}<span class="caret ml-px inline-block h-4 w-px bg-foreground align-middle"
									></span>
								</span>
								<span
									class={[
										'send flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground',
										sent && 'sent'
									]}><Icon icon={ArrowUp} class="size-4" /></span
								>
							</div>
						</div>
					{:else if step === 1}
						<div class="scene-cards flex h-full flex-col gap-4 p-6">
							<div class="reply flex items-center gap-2">
								<Orb size={24} state="speaking" />
								<span class="text-body"
									>Viewers loved it: <span class="font-medium">4.7 / 5</span>.</span
								>
							</div>
							<div class="grid flex-1 grid-cols-2 gap-3">
								<!-- A video card: poster and a few lines. -->
								<div class="card-a flex flex-col gap-2 rounded-md bg-card p-3 shadow-raised">
									<div class="aspect-video w-full rounded-sm bg-brand"></div>
									<div class="h-2 w-3/4 rounded-full bg-foreground/70"></div>
									<div class="h-2 w-1/2 rounded-full bg-muted"></div>
								</div>
								<!-- An insights card: a number and bars. -->
								<div class="card-b flex flex-col gap-2 rounded-md bg-card p-3 shadow-raised">
									<div class="h-2 w-2/3 rounded-full bg-foreground/70"></div>
									<span class="text-title">174</span>
									<div class="flex flex-1 items-end gap-1">
										<div class="h-3/4 flex-1 rounded-sm bg-brand-2"></div>
										<div class="h-1/2 flex-1 rounded-sm bg-brand-3"></div>
										<div class="h-1/4 flex-1 rounded-sm bg-brand-4"></div>
									</div>
								</div>
							</div>
						</div>
					{:else}
						<div class="scene-update relative flex h-full items-center justify-center p-6">
							<!-- The one card, updated in place when the follow-up arrives. -->
							<div
								class="main-card relative flex h-40 w-56 flex-col gap-2 rounded-md bg-card p-3 shadow-raised"
							>
								<div class="flex items-center justify-between gap-2">
									<div class="h-2 w-1/2 rounded-full bg-foreground/70"></div>
									<span class="updated"><Badge variant="success">Updated</Badge></span>
								</div>
								<div class="flex flex-1 items-end gap-2">
									<div class="bar bar-1 flex-1 rounded-sm bg-brand-2"></div>
									<div class="bar bar-2 flex-1 rounded-sm bg-brand-3"></div>
									<div class="bar bar-3 flex-1 rounded-sm bg-brand-4"></div>
									<div class="bar bar-4 flex-1 rounded-sm bg-brand-1"></div>
								</div>
							</div>
							<!-- What would have been a second card slides onto the first and merges into it. -->
							<div class="ghost absolute h-40 w-56 rounded-md bg-card/60 shadow-raised"></div>
							<span
								class="chip absolute right-6 bottom-6 rounded-full bg-secondary px-3 py-1 text-caption text-secondary-foreground"
								>Add the teaser</span
							>
						</div>
					{/if}
				</div>
			{/key}
		</div>

		<div class="flex max-w-md flex-col items-center gap-2 text-center">
			<p class="text-caption text-muted-foreground">Step {step + 1} of {STEPS.length}</p>
			{#key step}
				<h1 id="intro-title" class="text-heading" in:fly={{ y: 8, duration: 300 }}>
					{STEPS[step].title}
				</h1>
				<p
					id="intro-body"
					class="text-body-lg text-muted-foreground"
					in:fly={{ y: 8, duration: 300, delay: 60 }}
				>
					{STEPS[step].body}
				</p>
			{/key}
		</div>

		<div class="flex items-center gap-2">
			{#each STEPS as s, i (s.title)}
				<button
					type="button"
					class={[
						'h-2 cursor-pointer rounded-full transition-all duration-300 outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
						i === step ? 'w-6 bg-primary' : 'w-2 bg-muted-foreground/40 hover:bg-muted-foreground'
					]}
					aria-label="Step {i + 1}: {s.title}"
					aria-current={i === step ? 'step' : undefined}
					onclick={() => go(i)}
				></button>
			{/each}
		</div>

		<div class="flex items-center gap-2">
			{#if step > 0}
				<Button variant="ghost" onclick={() => go(step - 1)}>Back</Button>
			{/if}
			<Button bind:ref={nextButton} onclick={() => go(step + 1)}
				>{last ? 'Get started' : 'Next'}</Button
			>
		</div>
	</main>
</div>

<style>
	/* Step 1: a blinking caret, and the send button pulsing as the question goes. */
	.caret {
		animation: blink 1s steps(1) infinite;
	}
	@keyframes blink {
		50% {
			opacity: 0;
		}
	}
	.send {
		transition: scale 0.2s ease-out;
	}
	.send.sent {
		scale: 1.2;
	}

	/* Step 2: Lumi's short reply, then her cards pop in one after the other; the scene loops every 5s. */
	.scene-cards .reply,
	.scene-cards .card-a,
	.scene-cards .card-b {
		animation: 5s ease-out infinite both;
	}
	.scene-cards .reply {
		animation-name: reply-in;
	}
	.scene-cards .card-a {
		animation-name: card-a-in;
	}
	.scene-cards .card-b {
		animation-name: card-b-in;
	}
	@keyframes reply-in {
		0% {
			opacity: 0;
			translate: 0 6px;
		}
		10%,
		88% {
			opacity: 1;
			translate: 0 0;
		}
		100% {
			opacity: 0;
		}
	}
	@keyframes card-a-in {
		0%,
		12% {
			opacity: 0;
			scale: 0.9;
			translate: 0 12px;
		}
		24%,
		88% {
			opacity: 1;
			scale: 1;
			translate: 0 0;
		}
		100% {
			opacity: 0;
		}
	}
	@keyframes card-b-in {
		0%,
		26% {
			opacity: 0;
			scale: 0.9;
			translate: 0 12px;
		}
		38%,
		88% {
			opacity: 1;
			scale: 1;
			translate: 0 0;
		}
		100% {
			opacity: 0;
		}
	}

	/* Step 3: a follow-up arrives, the would-be second card slides onto the first and merges, and the first one
	   updates (bars change, a fourth appears, "Updated"). Loops every 6s. */
	.scene-update .chip,
	.scene-update .ghost,
	.scene-update .bar,
	.scene-update .updated {
		animation: 6s ease-in-out infinite both;
	}
	.scene-update .chip {
		animation-name: chip;
	}
	.scene-update .ghost {
		animation-name: ghost;
	}
	.scene-update .updated {
		animation-name: updated;
	}
	.scene-update .bar-1 {
		animation-name: bar-1;
	}
	.scene-update .bar-2 {
		animation-name: bar-2;
	}
	.scene-update .bar-3 {
		animation-name: bar-3;
	}
	.scene-update .bar-4 {
		animation-name: bar-4;
	}
	@keyframes chip {
		0%,
		8% {
			opacity: 0;
			translate: 0 8px;
		}
		16%,
		55% {
			opacity: 1;
			translate: 0 0;
		}
		65%,
		100% {
			opacity: 0;
		}
	}
	@keyframes ghost {
		0%,
		22% {
			opacity: 0;
			translate: 70% 10%;
			rotate: 6deg;
		}
		30% {
			opacity: 1;
		}
		44% {
			opacity: 0.6;
			translate: 0 0;
			rotate: 0deg;
		}
		50%,
		100% {
			opacity: 0;
			translate: 0 0;
			scale: 0.96;
		}
	}
	@keyframes updated {
		0%,
		48% {
			opacity: 0;
			scale: 0.8;
		}
		54%,
		90% {
			opacity: 1;
			scale: 1;
		}
		100% {
			opacity: 0;
		}
	}
	@keyframes bar-1 {
		0%,
		46% {
			height: 70%;
		}
		56%,
		90% {
			height: 45%;
		}
		100% {
			height: 70%;
		}
	}
	@keyframes bar-2 {
		0%,
		46% {
			height: 40%;
		}
		56%,
		90% {
			height: 85%;
		}
		100% {
			height: 40%;
		}
	}
	@keyframes bar-3 {
		0%,
		46% {
			height: 25%;
		}
		56%,
		90% {
			height: 55%;
		}
		100% {
			height: 25%;
		}
	}
	@keyframes bar-4 {
		0%,
		46% {
			height: 0%;
			opacity: 0;
		}
		56%,
		90% {
			height: 65%;
			opacity: 1;
		}
		100% {
			height: 0%;
			opacity: 0;
		}
	}

	/* Without motion: every scene shows its finished state, still. */
	@media (prefers-reduced-motion: reduce) {
		.caret,
		.scene-cards .reply,
		.scene-cards .card-a,
		.scene-cards .card-b,
		.scene-update .chip,
		.scene-update .bar,
		.scene-update .updated {
			animation: none;
		}
		.scene-update .ghost {
			display: none;
		}
		.scene-update .bar-1 {
			height: 45%;
		}
		.scene-update .bar-2 {
			height: 85%;
		}
		.scene-update .bar-3 {
			height: 55%;
		}
		.scene-update .bar-4 {
			height: 65%;
		}
	}
</style>
