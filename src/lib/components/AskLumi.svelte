<script lang="ts">
	import { onMount } from 'svelte';
	import { questionAt } from '#lib/ask-lumi.js';

	/**
	 * The page's Ask Lumi layer (one per page): over anything a card marked `askable`, a soft glow follows the
	 * cursor, and right-clicking sends that thing's question to Lumi (`onask`) instead of opening the browser's menu.
	 * When the pointer rests with the glow on, a hint says so ("Right-click to ask Lumi"). Leaving the window,
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
	let hint = $state(false);
	/** A brief swell of the glow once a question is sent. */
	let sent = $state(false);
	let rest = { x: 0, y: 0 };
	let timer: ReturnType<typeof setTimeout> | undefined;

	function letGo() {
		clearTimeout(timer);
		glow = null;
		hint = false;
	}

	function onpointermove(e: PointerEvent) {
		if (e.pointerType === 'touch') return;
		if (!questionAt(e)) return letGo();
		glow = { x: e.clientX, y: e.clientY };
		// Small drift doesn't count as moving; otherwise the hint goes and the wait starts over.
		if (Math.hypot(e.clientX - rest.x, e.clientY - rest.y) <= DRIFT && (hint || timer)) return;
		rest = { x: e.clientX, y: e.clientY };
		hint = false;
		clearTimeout(timer);
		timer = setTimeout(() => {
			timer = undefined;
			if (glow) hint = true;
		}, REST_MS);
	}

	function oncontextmenu(e: MouseEvent) {
		const target = questionAt(e);
		if (!target) return;
		e.preventDefault();
		clearTimeout(timer);
		timer = undefined;
		hint = false;
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

<!-- The hint, once the pointer rests with the glow on: in the Getting started card's brand wash, softer still. -->
{#if glow && hint}
	<div
		class="hint pointer-events-none fixed z-50 -translate-y-full rounded-md px-2.5 py-1 text-caption motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-300"
		style:left="{glow.x + OFFSET}px"
		style:top="{glow.y - OFFSET / 2}px"
		aria-hidden="true"
	>
		Right-click to ask Lumi
	</div>
{/if}

<style>
	/* The Getting started card's look (brand colours washed over white, text in the brand's purple), toned down further:
	   fainter colours and a lighter edge, so it whispers rather than calls. Dark: a muted brand purple. */
	.hint {
		color: var(--brand-4);
		background:
			radial-gradient(circle at 0% 0%, color-mix(in oklab, var(--brand-3) 16%, transparent), transparent 70%),
			radial-gradient(circle at 100% 100%, color-mix(in oklab, var(--brand-2) 12%, transparent), transparent 70%),
			var(--neutral-0);
		outline: 1px solid color-mix(in oklab, var(--brand-4) 12%, transparent);
		outline-offset: -1px;
		box-shadow: 0 2px 12px color-mix(in oklab, var(--brand-2) 14%, transparent);
	}
	:global(.dark) .hint {
		color: color-mix(in oklab, var(--neutral-0) 90%, transparent);
		background:
			radial-gradient(circle at 0% 0%, color-mix(in oklab, var(--brand-3) 22%, transparent), transparent 70%),
			radial-gradient(circle at 100% 100%, color-mix(in oklab, var(--brand-2) 18%, transparent), transparent 70%),
			color-mix(in oklab, var(--brand-4) 45%, var(--neutral-900));
		outline-color: color-mix(in oklab, var(--neutral-0) 12%, transparent);
		box-shadow: 0 2px 12px color-mix(in oklab, var(--brand-4) 30%, transparent);
	}
</style>
