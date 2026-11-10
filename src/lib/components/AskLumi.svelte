<script lang="ts">
	import { onMount } from 'svelte';
	import { questionAt } from '#lib/ask-lumi.js';

	/**
	 * The page's Ask Lumi layer (one per page): over anything a card marked `askable`, a soft glow follows the
	 * cursor, and right-clicking sends that thing's question to Lumi (`onask`) instead of opening the browser's menu.
	 * When the pointer rests with the glow on, a hint shows the question it would ask, revealing word by word like
	 * Lumi's replies, under a small "Right-click to ask Lumi". Leaving the window,
	 * scrolling or Escape clears it. Long-press on touch screens opens the same way (it fires the same event), though
	 * there's no glow or hint there.
	 */
	let { onask }: { onask: (question: string) => void } = $props();

	/** How long the pointer rests (with the glow on) before the hint shows, and how far it can drift meanwhile. */
	const REST_MS = 1400;
	const DRIFT = 4;
	/** The hint sits this far above-right of the cursor, clear of what you're pointing at (and of what hangs below the
	 *  pointer, like the Timeline's summary box). */
	const OFFSET = 16;

	let glow = $state<{ x: number; y: number } | null>(null);
	/** The question for where the pointer rests, shown in the hint (null: no hint). */
	let hint = $state<{ question: string; words: string[]; delay: number } | null>(null);
	/** A brief swell of the glow once a question is sent. */
	let sent = $state(false);
	let rest = { x: 0, y: 0 };
	let timer: ReturnType<typeof setTimeout> | undefined;

	function letGo() {
		clearTimeout(timer);
		glow = null;
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

	function onpointermove(e: PointerEvent) {
		if (e.pointerType === 'touch') return;
		if (!questionAt(e)) return letGo();
		glow = { x: e.clientX, y: e.clientY };
		// Small drift doesn't count as moving; otherwise the hint goes and the wait starts over.
		if (Math.hypot(e.clientX - rest.x, e.clientY - rest.y) <= DRIFT && (hint || timer)) return;
		rest = { x: e.clientX, y: e.clientY };
		hint = null;
		clearTimeout(timer);
		timer = setTimeout(() => {
			timer = undefined;
			// The question for where the pointer rests now (a chart asks about the moment under it).
			const now = glow && questionAt(e);
			if (now) hint = hintFor(now.question);
		}, REST_MS);
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

<!-- The glow: a soft wash of Lumi's colours around the cursor, saying "you can ask about this"; it swells as a
     question goes. -->
{#if glow}
	<div
		class={[
			'pointer-events-none fixed z-50 size-10 -translate-1/2 rounded-full bg-brand blur-md transition-[opacity,scale] duration-300 motion-safe:animate-in motion-safe:fade-in-0',
			sent ? 'scale-200 opacity-0 motion-reduce:scale-100' : 'opacity-30'
		]}
		style:left="{glow.x}px"
		style:top="{glow.y}px"
		aria-hidden="true"
	></div>
{/if}

<!-- The hint, once the pointer rests with the glow on: the question it would ask (revealing like Lumi's replies) under
     a small "Right-click to ask Lumi", in the Getting started card's brand wash, softer still. Above-right of the
     cursor, flipping left near the right edge and below near the top. -->
{#if glow && hint}
	<div
		class={[
			'hint pointer-events-none fixed z-50 flex w-max max-w-72 flex-col gap-0.5 rounded-md px-3 py-2 motion-safe:animate-in motion-safe:duration-300 motion-safe:fade-in-0',
			flipX && '-translate-x-full',
			!flipY && '-translate-y-full'
		]}
		style:left="{flipX ? glow.x - OFFSET : glow.x + OFFSET}px"
		style:top="{flipY ? glow.y + OFFSET : glow.y - OFFSET / 2}px"
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
