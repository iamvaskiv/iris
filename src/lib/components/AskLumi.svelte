<script lang="ts">
	import { onMount } from 'svelte';
	import { questionAt } from '#lib/ask-lumi.js';

	/**
	 * The page's Ask Lumi layer (one per page): over anything a card marked `askable`, right-clicking sends that thing's
	 * question to Lumi (`onask`) instead of opening the browser's menu. Once the pointer has rested there a moment, a
	 * soft glow fades in just above-right of it, pulsing slowly; resting on, a hint opens from the glow with the question
	 * it would ask, revealing word by word like Lumi's replies, under a small "Right-click to ask Lumi". Moving on hides
	 * them and the wait starts over. Leaving the window, scrolling or Escape clears it. Long-press on touch screens opens the same way (it fires the same event), though
	 * there's no glow or hint there.
	 */
	let { onask }: { onask: (question: string) => void } = $props();

	/** How long the pointer rests before the glow shows, then how much longer before the hint does, and how far it can
	 *  drift meanwhile. */
	const GLOW_MS = 500;
	const HINT_MS = 1500;
	const DRIFT = 4;
	/** The glow's spot: this far right of the cursor and LIFT above it, clear of what you're pointing at. The hint opens
	 *  from there, the glow at its top-left corner. */
	const OFFSET = 16;
	const LIFT = 40;

	/** Where the pointer is, over something askable (null: it isn't). */
	let glow = $state<{ x: number; y: number } | null>(null);
	/** The glow is showing: the pointer has rested GLOW_MS. */
	let shown = $state(false);
	/** The question for where the pointer rests, shown in the hint (null: no hint). */
	let hint = $state<{ question: string; words: string[]; delay: number } | null>(null);
	/** A brief swell of the glow once a question is sent. */
	let sent = $state(false);
	let rest = { x: 0, y: 0 };
	let timer: ReturnType<typeof setTimeout> | undefined;

	function letGo() {
		clearTimeout(timer);
		timer = undefined;
		glow = null;
		shown = false;
		hint = null;
	}

	/** The question's words, revealing one after another like Lumi's replies (quick for short ones, ~0.8s at most). */
	function hintFor(question: string) {
		const words = question.split(/\s+/).filter(Boolean);
		return { question, words, delay: Math.min(35, 800 / Math.max(1, words.length)) };
	}
	/** Near the window's right edge the hint opens to the left of the cursor; near the top, below it. */
	const flipX = $derived(!!glow && glow.x > window.innerWidth - 320);
	const flipY = $derived(!!glow && glow.y < 160);
	/** Where the glow sits, and the hint's corner: above-right of the cursor (left of it near the right edge, below it
	 *  near the top). */
	const spot = $derived(
		glow && {
			x: flipX ? glow.x - OFFSET : glow.x + OFFSET,
			y: flipY ? glow.y + OFFSET : glow.y - LIFT
		}
	);

	function onpointermove(e: PointerEvent) {
		if (e.pointerType === 'touch') return;
		if (!questionAt(e)) return letGo();
		glow = { x: e.clientX, y: e.clientY };
		// Small drift doesn't count as moving; otherwise the glow and hint go and the wait starts over.
		if (Math.hypot(e.clientX - rest.x, e.clientY - rest.y) <= DRIFT && (shown || timer)) return;
		rest = { x: e.clientX, y: e.clientY };
		shown = false;
		hint = null;
		clearTimeout(timer);
		timer = setTimeout(() => {
			shown = true;
			timer = setTimeout(() => {
				timer = undefined;
				// The question for where the pointer rests now (a chart asks about the moment under it).
				const now = glow && questionAt(e);
				if (now) hint = hintFor(now.question);
			}, HINT_MS);
		}, GLOW_MS);
	}

	function oncontextmenu(e: MouseEvent) {
		const target = questionAt(e);
		if (!target) return;
		e.preventDefault();
		clearTimeout(timer);
		timer = undefined;
		hint = null;
		glow = { x: e.clientX, y: e.clientY };
		sent = true;
		setTimeout(() => {
			sent = false;
			glow = null;
			shown = false;
		}, 450);
		onask(target.question);
	}

	onMount(() => {
		const onkey = (e: KeyboardEvent) => e.key === 'Escape' && letGo();
		const onleave = (e: PointerEvent) => !e.relatedTarget && letGo();
		document.addEventListener('pointermove', onpointermove, { passive: true });
		document.addEventListener('pointerout', onleave);
		document.addEventListener('contextmenu', oncontextmenu);
		window.addEventListener('scroll', letGo, { capture: true, passive: true });
		window.addEventListener('keydown', onkey);
		window.addEventListener('blur', letGo);
		return () => {
			clearTimeout(timer);
			document.removeEventListener('pointermove', onpointermove);
			document.removeEventListener('pointerout', onleave);
			document.removeEventListener('contextmenu', oncontextmenu);
			window.removeEventListener('scroll', letGo, { capture: true });
			window.removeEventListener('keydown', onkey);
			window.removeEventListener('blur', letGo);
		};
	});
</script>

<!-- The glow: a soft wash of Lumi's colours just above-right of the cursor, saying "you can ask about this", its corner
     where the hint's will be. It fades in once the pointer has rested, then pulses slowly; it swells away as a
     question goes. -->
{#if spot && (shown || sent)}
	<div
		class={[
			'glow pointer-events-none fixed z-50 size-10 rounded-full bg-brand blur-md',
			// Its top corner on the hint's: top-left, or top-right when the hint opens to the left. It pulses about its
			// own centre.
			flipX && '-translate-x-full',
			sent && 'sent'
		]}
		style:left="{spot.x}px"
		style:top="{spot.y}px"
		aria-hidden="true"
	></div>
{/if}

<!-- The hint, once the pointer rests with the glow on: the question it would ask (revealing like Lumi's replies) under
     a small "Right-click to ask Lumi", in the Getting started card's brand wash, softer still. Its top-left corner on
     the glow (top-right near the window's right edge), growing down and away from the cursor. -->
{#if spot && hint}
	<div
		class={[
			'hint pointer-events-none fixed z-50 flex w-max max-w-72 flex-col gap-0.5 rounded-md px-3 py-2 motion-safe:animate-in motion-safe:duration-300 motion-safe:fade-in-0',
			flipX && '-translate-x-full'
		]}
		style:left="{spot.x}px"
		style:top="{spot.y}px"
		aria-hidden="true"
	>
		<span class="text-caption opacity-60">Right-click to ask Lumi</span>
		{#key hint.question}
			<p class="text-body-sm">
				{#each hint.words as word, i (i)}<span
						class="reveal-word"
						style:animation-delay="{120 + i * hint.delay}ms">{word}</span
					>{' '}{/each}
			</p>
		{/key}
	</div>
{/if}

<style>
	/* The Getting started card's look (brand colours washed over white, text in the brand's purple), toned down further:
	   fainter colours and a lighter edge, so it whispers rather than calls. Dark: a muted brand purple. */
	.hint {
		color: var(--lumi-ink);
		background:
			radial-gradient(
				circle at 0% 0%,
				color-mix(in oklab, var(--brand-3) 16%, transparent),
				transparent 70%
			),
			radial-gradient(
				circle at 100% 100%,
				color-mix(in oklab, var(--brand-2) 12%, transparent),
				transparent 70%
			),
			var(--neutral-0);
		outline: 1px solid var(--lumi-edge-faint);
		outline-offset: -1px;
		box-shadow: 0 2px 12px color-mix(in oklab, var(--brand-2) 14%, transparent);
	}
	:global(.dark) .hint {
		background:
			radial-gradient(
				circle at 0% 0%,
				color-mix(in oklab, var(--brand-3) 22%, transparent),
				transparent 70%
			),
			radial-gradient(
				circle at 100% 100%,
				color-mix(in oklab, var(--brand-2) 18%, transparent),
				transparent 70%
			),
			color-mix(in oklab, var(--brand-4) 45%, var(--neutral-900));
		box-shadow: 0 2px 12px color-mix(in oklab, var(--brand-4) 30%, transparent);
	}
	/* The glow fades in, then pulses slowly (a breath every ~2.4s); it swells away as a question goes. */
	.glow {
		opacity: 0.3;
		animation:
			glow-in 300ms ease-out both,
			glow-pulse 1.2s ease-in-out 300ms infinite alternate;
	}
	.glow.sent {
		animation: glow-swell 450ms ease-out forwards;
	}
	@keyframes glow-in {
		from {
			opacity: 0;
		}
	}
	@keyframes glow-pulse {
		from {
			opacity: 0.3;
			scale: 1;
		}
		to {
			opacity: 0.18;
			scale: 1.25;
		}
	}
	@keyframes glow-swell {
		from {
			opacity: 0.3;
		}
		to {
			opacity: 0;
			scale: 2;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.glow,
		.glow.sent {
			animation: none;
			opacity: 0.3;
		}
	}
	/* As Lumi's replies (AiDock): each word fades in out of a slight blur, one after another. */
	.reveal-word {
		display: inline-block;
		animation: hint-reveal 420ms cubic-bezier(0.2, 0, 0, 1) both;
	}
	@keyframes hint-reveal {
		from {
			opacity: 0;
			filter: blur(6px);
			transform: translateY(3px);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.reveal-word {
			animation: none;
		}
	}
</style>
