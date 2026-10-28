<script lang="ts" module>
	/** Docked sizes, smallest first; the pull tab steps between neighbours. */
	const MODES = ['compact', 'default', 'expanded'] as const;
	export type DockMode = (typeof MODES)[number];

	export function timeOfDayGreeting() {
		const hour = new Date().getHours();
		return hour < 12 ? 'Good morning!' : hour < 18 ? 'Good afternoon!' : 'Good evening!';
	}
</script>

<script lang="ts">
	import {
		ChatMessage,
		ChoiceList,
		Icon,
		Kbd,
		Orb,
		PromptInput,
		Tile
	} from '@latitudelabs/design-system';
	import type { ComponentProps } from 'svelte';
	import { onMount, tick } from 'svelte';
	import { loadOrbVariant, orbVariant } from '#lib/orb-variant.svelte.js';
	import { blocks, type Run } from '#lib/reply-format.js';
	import type { TranscriptMessage } from '#lib/transcript.js';

	type Props = {
		reply?: string;
		/** Shown when there's no reply yet, so Lumi always has something to say. Defaults to a time-of-day hello. */
		greeting?: string;
		thinking?: boolean;
		error?: string;
		draft?: string;
		placeholder?: string;
		/** Rendered height, bindable (the project page keeps cards clear of the dock). */
		height?: number;
		/** Answers offered with the reply: shown as buttons in place of the input, picking one sends it. */
		choices?: string[];
		/** Ways to get started, as cards above the input until the conversation starts; picking one sends it. */
		suggestions?: { label: string; icon: ComponentProps<typeof Icon>['icon'] }[];
		/** Empty-state layout: in the middle of the screen, large avatar above a larger, centered message. */
		centered?: boolean;
		/** With `centered`: sit in the page flow (e.g. above the projects grid) instead of fixed in the middle of the screen. */
		inline?: boolean;
		/** Docked layout size, bindable; the pull tab on top of the dock steps between them (drag down to shrink, up to
		 *  grow). `compact`: the avatar sits left of the input and the reply is hidden (still read out to screen
		 *  readers); errors and choices still show. `default`: the latest reply above the input. `expanded`: the whole
		 *  conversation (`messages`), scrollable, above the input. */
		mode?: DockMode;
		/** The conversation so far, oldest first, for the expanded layout (see transcript.ts). */
		messages?: TranscriptMessage[];
		onsubmit: (message: string) => void;
	};
	let {
		reply,
		greeting = timeOfDayGreeting(),
		thinking = false,
		error,
		draft = $bindable(''),
		placeholder = 'Press Enter to ask Lumi...',
		height = $bindable(0),
		choices = [],
		suggestions = [],
		centered = false,
		inline = false,
		mode = $bindable('default'),
		messages = [],
		onsubmit
	}: Props = $props();

	let input = $state<HTMLTextAreaElement | null>(null);
	let choiceList = $state<HTMLElement | null>(null);

	// Choices sit above the input, which stays for typing something else.
	const showChoices = $derived(choices.length > 0 && !thinking && !error);
	const showSuggestions = $derived(suggestions.length > 0 && !reply && !thinking && !showChoices);
	/** Inside the input or the choices: where the conversation's focus lives. */
	const inPrompt = (el: EventTarget | null) =>
		el instanceof Node && (el === input || !!choiceList?.contains(el));

	// Keep the conversation going without re-clicking: if the field had focus when a message was sent, and the user
	// hasn't moved focus elsewhere since, refocus it when the dock swaps layouts (empty project → bottom panel creates
	// a new field). Within one layout the field stays focused anyway (it's read-only, not disabled, while thinking).
	let keepFocus = false;
	function send(message: string) {
		keepFocus = inPrompt(document.activeElement);
		onsubmit(message);
	}
	$effect(() => {
		if (input && keepFocus && document.activeElement !== input)
			input.focus({ preventScroll: true });
	});
	$effect(() => {
		const onfocusmove = (e: FocusEvent) => {
			if (!inPrompt(e.target)) keepFocus = false;
		};
		window.addEventListener('focusin', onfocusmove);
		return () => window.removeEventListener('focusin', onfocusmove);
	});

	/** A subtle pop of the whole dock when its input gets focus (click, Tab or Enter). */
	function onfocusin(e: FocusEvent) {
		if (e.target !== input) return;
		const dock = e.currentTarget as HTMLElement;
		dock.classList.remove('dock-pop');
		void dock.offsetWidth; // reflow, so the animation restarts on every focus
		dock.classList.add('dock-pop');
	}
	onMount(loadOrbVariant);

	// The orb reacts to the conversation: thinking while waiting, a pop and a livelier swirl when a message lands.
	const shown = $derived(thinking ? '' : error || reply || greeting);
	let speaking = $state(false);
	let firstMessage = true;
	$effect(() => {
		if (!shown) return;
		// The greeting shown on page load isn't a new message: no "speaking" burst on first render.
		if (firstMessage) return void (firstMessage = false);
		speaking = true;
		const t = setTimeout(() => (speaking = false), 1000);
		return () => clearTimeout(t);
	});
	const orbState = $derived(thinking ? 'thinking' : speaking ? 'speaking' : 'idle');
	/** Switch layouts, morphing the dock, orb and input between them where View Transitions are supported. */
	function setMode(next: DockMode) {
		if (next === mode) return;
		const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (!document.startViewTransition || reduce) return void (mode = next);
		document.startViewTransition(async () => {
			mode = next;
			await tick();
		});
	}
	/** One size smaller (`-1`) or larger (`1`), or undefined at either end. */
	const step = (by: -1 | 1) => MODES[MODES.indexOf(mode) + by];

	// Pull tab: drag down for one size smaller, up for one size larger. The size changes as soon as the drag passes
	// PULL_THRESHOLD, while the button is still held. One drag steps one size: pulling further the same way only gives
	// resistance (compact → expanded takes two pulls), but dragging back past the threshold undoes the step. While
	// dragging, the whole dock squeezes (down) or stretches (up) from its
	// bottom edge, with rubber-band resistance, and springs back on release. Pulling the way that wouldn't change
	// anything gives a quarter of the give. A drag swallows the click that follows it. Click (or Enter/Space) shows
	// more (compact → default → expanded) and goes back from expanded; arrow keys step either way.
	const PULL_THRESHOLD = 40;
	let pullStart = $state<number | null>(null);
	let pullY = $state(0);
	let pulled = false;
	/** The direction this drag last stepped in (1 up, -1 down), which it can't step in again until it steps the other
	 *  way; 0 before any step. So a drag only ever moves between its starting size and one neighbour. */
	let pullStepped = $state<-1 | 0 | 1>(0);
	/** The size a drag in `dir` would step to, if it may step that way. */
	const pullTarget = (dir: -1 | 1) => (dir === pullStepped ? undefined : step(dir));
	/** Vertical scale for the current drag: up to ±25%, easing off the further you pull. */
	const squeeze = $derived.by(() => {
		const towardChange = !!pullTarget(pullY > 0 ? -1 : 1);
		const give = 0.25 * (1 - Math.exp(-Math.abs(pullY) / 60)) * (towardChange ? 1 : 0.25);
		return pullY > 0 ? 1 - give : 1 + give;
	});
	/** The dock's `scale`: squeezing also widens it slightly (and stretching narrows it), like something soft. */
	const dockScale = $derived(squeeze === 1 ? undefined : `${1 + (1 - squeeze) * 0.1} ${squeeze}`);
	// The drag is followed on the window, not the tab: changing size swaps the dock's markup, tab included, mid-drag.
	function onpullstart(e: PointerEvent) {
		if (e.button !== 0) return;
		e.preventDefault(); // no text selection while dragging
		pullStart = e.clientY;
		pulled = false;
		pullStepped = 0;
		window.addEventListener('pointermove', onpullmove);
		window.addEventListener('pointerup', stopPull);
		window.addEventListener('pointercancel', stopPull);
	}
	function onpullmove(e: PointerEvent) {
		if (pullStart === null) return;
		const dy = e.clientY - pullStart;
		if (Math.abs(dy) > 4) pulled = true;
		const dir = dy > PULL_THRESHOLD ? -1 : dy < -PULL_THRESHOLD ? 1 : 0;
		const next = dir ? pullTarget(dir) : undefined;
		if (!next) return void (pullY = dy);
		setMode(next);
		pullStepped = dir;
		pullStart = e.clientY;
		pullY = 0;
	}
	function stopPull() {
		pullStart = null;
		pullY = 0;
		window.removeEventListener('pointermove', onpullmove);
		window.removeEventListener('pointerup', stopPull);
		window.removeEventListener('pointercancel', stopPull);
	}
	onMount(() => stopPull);
	function onpullclick() {
		if (pulled) return void (pulled = false);
		setMode(mode === 'expanded' ? 'default' : step(1)!);
	}
	function onpullkeydown(e: KeyboardEvent) {
		const next = e.key === 'ArrowUp' ? step(1) : e.key === 'ArrowDown' ? step(-1) : undefined;
		if (!next) return;
		e.preventDefault();
		setMode(next);
	}
	const pullLabel = $derived(
		mode === 'compact'
			? "Show Lumi's reply"
			: mode === 'default'
				? 'Show the whole conversation'
				: 'Show only the latest reply'
	);

	// Expanded: the conversation, with a status row at the end while Lumi thinks or after an error. With no history,
	// the latest reply (or the greeting) stands in. The live orb sits on the status row, else on Lumi's latest message,
	// which reveals word by word like in the default layout.
	const conversation = $derived<TranscriptMessage[]>(
		messages.length ? messages : [{ from: 'assistant', text: reply || greeting }]
	);
	const status = $derived(thinking || !!error);
	const liveIndex = $derived(
		status ? -1 : conversation.findLastIndex((m) => m.from === 'assistant')
	);
	let log = $state<HTMLElement | null>(null);
	// Keep the newest message in view: on opening, and whenever the conversation grows or Lumi starts thinking.
	$effect(() => {
		void [conversation.length, status];
		if (log) log.scrollTop = log.scrollHeight;
	});

	/** Natural height of the docked message, so its box can animate between heights. */
	let messageHeight = $state(0);

	/** A word (or the whitespace after it) of a reply; `i` numbers the words in reading order, -1 for whitespace. */
	type Word = { text: string; bold: boolean; i: number };

	/**
	 * The reply's paragraphs and lists (see reply-format.ts), split into words that reveal one after another. The delay
	 * step is quick for short replies and compressed so long ones finish within ~0.8s.
	 */
	function layout(text: string) {
		let n = 0;
		const toWords = (runs: Run[]): Word[] =>
			runs.flatMap((r) =>
				r.text
					.split(/(\s+)/)
					.filter(Boolean)
					.map((w) => ({ text: w, bold: r.bold, i: w.trim() ? n++ : -1 }))
			);
		const parts = blocks(text).map((b) =>
			b.kind === 'paragraph'
				? { kind: 'paragraph' as const, words: toWords(b.runs) }
				: { kind: 'list' as const, items: b.items.map(toWords) }
		);
		return { parts, delay: Math.min(35, 800 / Math.max(1, n)) };
	}

	/** Enter anywhere on the page focuses the prompt, unless the user is in another field or on a control. With
	 *  choices showing, number keys pick one (not while typing in a field). */
	function onkeydown(e: KeyboardEvent) {
		// The number after the last choice belongs to the "Something else…" field: it focuses it.
		const n = showChoices && /^[1-9]$/.test(e.key) ? Number(e.key) : 0;
		const pick = n && n <= choices.length + 1 ? (choices[n - 1] ?? 'field') : undefined;
		if (
			(e.key !== 'Enter' && !pick) ||
			e.defaultPrevented ||
			e.isComposing ||
			e.metaKey ||
			e.ctrlKey ||
			e.altKey ||
			e.shiftKey
		)
			return;
		const el = document.activeElement as HTMLElement | null;
		if (
			el &&
			el !== document.body &&
			!(pick && choiceList?.contains(el)) &&
			el.closest('input, textarea, select, button, a, [contenteditable], [role=button]')
		)
			return;
		if (thinking) return;
		e.preventDefault();
		if (pick && pick !== 'field') return send(pick);
		input?.focus();
	}
</script>

<svelte:window {onkeydown} />

{#snippet line(words: Word[], delay: number)}
	{#each words as w, k (k)}
		{#if w.i >= 0}<span
				class={['reveal-word', w.bold && 'font-medium']}
				style:animation-delay="{w.i * delay}ms">{w.text}</span
			>{:else}{w.text}{/if}
	{/each}
{/snippet}

{#snippet reveal(text: string)}
	<!-- Keyed on the text so every new message replays the reveal. -->
	{#key text}
		{@const { parts, delay } = layout(text)}
		<div class="flex flex-col gap-2">
			{#each parts as part, j (j)}
				{#if part.kind === 'paragraph'}
					<p>{@render line(part.words, delay)}</p>
				{:else}
					<ul class="flex list-disc flex-col gap-1 pl-5 text-left">
						{#each part.items as item, k (k)}<li>{@render line(item, delay)}</li>{/each}
					</ul>
				{/if}
			{/each}
		</div>
	{/key}
{/snippet}

{#snippet message()}
	{#if thinking}
		<span class="thinking text-muted-foreground">hmm, give me a sec..</span>
	{:else if error}
		<span class="text-destructive">{error}</span>
	{:else}
		{@render reveal(reply || greeting)}
	{/if}
{/snippet}

<!-- Centred in the dock's taller top padding, or just above the dock (`outside`, for compact, whose padding is even all
     round). Drag or arrow keys step the size; click shows more. -->
{#snippet pullTab(outside = false)}
	<button
		type="button"
		class={[
			'group absolute left-1/2 z-10 flex h-4 w-16 -translate-x-1/2 cursor-grab touch-none items-center justify-center active:cursor-grabbing',
			outside ? '-top-4' : 'top-0'
		]}
		aria-label={pullLabel}
		aria-keyshortcuts="ArrowUp ArrowDown"
		onpointerdown={onpullstart}
		onclick={onpullclick}
		onkeydown={onpullkeydown}
	>
		<span
			class="h-1 w-8 rounded-full bg-muted-foreground/30 transition-colors group-hover:bg-muted-foreground/60 group-focus-visible:bg-muted-foreground/60"
		></span>
	</button>
{/snippet}

{#snippet liveOrb()}
	<Orb
		size={40}
		state={orbState}
		pulse={shown}
		variant={orbVariant.current}
		transitionName="iris-avatar"
		label="Lumi"
	/>
{/snippet}

<!-- An earlier message: same formatting as the latest reply, without the word-by-word reveal. -->
{#snippet formatted(text: string)}
	<div class="no-reveal">{@render reveal(text)}</div>
{/snippet}

<!-- Compact: the orb beside the input, level with its first line so it stays put as the input grows or choices
     appear above. pl-1 puts it as far from the dock's left edge as from its top and bottom (12px). -->
{#snippet orbRow()}
	<div class="flex items-end gap-2">
		<div class="flex h-12 shrink-0 items-center pl-1">{@render liveOrb()}</div>
		<div class="min-w-0 flex-1">{@render prompt()}</div>
	</div>
{/snippet}

{#snippet fieldKey()}<Kbd aria-hidden="true">{choices.length + 1}</Kbd>{/snippet}

{#snippet prompt()}
	<div class="flex flex-col gap-1">
		{#if showSuggestions}
			<ul class="mb-3 grid grid-cols-3 gap-3" aria-label="Ways to start">
				{#each suggestions as s, i (s.label)}
					<li class="suggestion" style:--index={i}>
						<Tile
							onclick={() => send(s.label)}
							class="h-full w-full justify-between gap-3 rounded-lg text-body transition-[filter] hover:bg-muted hover:brightness-102 dark:hover:brightness-125"
						>
							<Icon icon={s.icon} class="text-muted-foreground" />
							{s.label}
						</Tile>
					</li>
				{/each}
			</ul>
		{/if}
		{#if showChoices}
			<ChoiceList bind:ref={choiceList} options={choices} onselect={send} />
		{/if}
		<!-- Same field in both cases, so focus and the draft survive choices appearing and going. -->
		<PromptInput
			bind:ref={input}
			bind:value={draft}
			placeholder={showChoices ? 'Something else…' : placeholder}
			focusedPlaceholder={showChoices ? 'Something else…' : 'What interests you?'}
			disabled={thinking}
			leading={showChoices ? fieldKey : undefined}
			submitOnFocus={showChoices}
			onsubmit={send}
		/>
	</div>
{/snippet}

<!-- The assistant's latest message only; answers worth looking at live in cards above. -->
{#if centered}
	<div
		data-dock
		bind:offsetHeight={height}
		{onfocusin}
		class={[
			'flex w-full max-w-2xl flex-col items-center gap-8 px-4', // wide enough for long replies; the input stays narrower
			inline ? 'mx-auto' : 'fixed top-1/2 left-1/2 -translate-1/2'
		]}
		style:view-transition-name="iris-dock"
	>
		<Orb
			size={80}
			state={orbState}
			pulse={shown}
			variant={orbVariant.current}
			transitionName="iris-avatar"
			label="Lumi"
		/>
		<div class="text-center text-heading" aria-live="polite">{@render message()}</div>
		<div class="w-full max-w-140">{@render prompt()}</div>
	</div>
{:else if mode === 'expanded'}
	<!-- Overlays the page: keeps reporting the default dock's height so cards don't reflow under it. -->
	<div
		data-dock
		{onfocusin}
		class="fixed bottom-8 left-1/2 flex w-full max-w-140 -translate-x-1/2 flex-col gap-5 rounded-xl bg-card p-2 pt-4 shadow-raised"
		class:pull-release={pullStart === null}
		style:scale={dockScale}
		style:view-transition-name="iris-dock"
	>
		{@render pullTab()}
		<!-- Laid out like the default dock, so switching only adds the earlier messages above: the orb sits beside Lumi's
		     latest message (or the status row) and every message of hers starts on the same edge. Each question sits
		     just above its answer (gap-3); turns are set apart (mt-5 before each later question). -m-3 p-3 so the
		     orb's glow (60px around the 40px orb) fits inside the scroll box instead of making it scroll; pl-5 sets the orb as far from the dock's
		     left edge as from its top (16px), like the default dock. -->
		<div
			bind:this={log}
			class="-m-3 flex flex-col gap-3 overflow-y-auto overscroll-contain p-3 pl-5"
			style:max-height="min(60svh, 40rem)"
			role="log"
			aria-label="Conversation with Lumi"
		>
			{#each conversation as m, i (i)}
				{#if m.from === 'user'}
					<!-- Your messages: right-aligned bubbles in the accent colour. Not in the design system yet. -->
					<div
						class={[
							'max-w-4/5 self-end rounded-lg bg-primary px-4 py-2 text-body-lg text-primary-foreground',
							i > 0 && 'mt-5'
						]}
					>
						{@render formatted(m.text)}
					</div>
				{:else if i === liveIndex}
					<ChatMessage>
						{#snippet avatar()}{@render liveOrb()}{/snippet}
						<div class="flex min-h-10 items-center">{@render reveal(m.text)}</div>
					</ChatMessage>
				{:else}
					<!-- No avatar on earlier messages; indented past its column (40px orb + gap-4). -->
					<div class="pl-14 text-body-lg">{@render formatted(m.text)}</div>
				{/if}
			{/each}
			{#if status}
				<ChatMessage>
					{#snippet avatar()}{@render liveOrb()}{/snippet}
					<div class="flex min-h-10 items-center">{@render message()}</div>
				</ChatMessage>
			{/if}
		</div>
		{@render prompt()}
	</div>
{:else if mode === 'compact'}
	<div
		data-dock
		bind:offsetHeight={height}
		{onfocusin}
		class="fixed bottom-8 left-1/2 flex w-full max-w-140 -translate-x-1/2 flex-col gap-3 rounded-xl bg-card p-2 shadow-raised"
		class:pull-release={pullStart === null}
		style:scale={dockScale}
		style:view-transition-name="iris-dock"
	>
		{@render pullTab(true)}
		{#if error && !thinking}
			<p class="px-3 pt-2 text-body text-destructive">{error}</p>
		{/if}
		<!-- The reply is hidden but still announced; the orb's state says when Lumi is thinking or has answered. -->
		<div class="sr-only" aria-live="polite">
			{#if thinking}Thinking…{:else if !error}{reply || greeting}{/if}
		</div>
		{@render orbRow()}
	</div>
{:else}
	<div
		data-dock
		bind:offsetHeight={height}
		{onfocusin}
		class="fixed bottom-8 left-1/2 flex w-full max-w-140 -translate-x-1/2 flex-col gap-5 rounded-xl bg-card p-2 pt-4 shadow-raised"
		class:pull-release={pullStart === null}
		style:scale={dockScale}
		style:view-transition-name="iris-dock"
	>
		{@render pullTab()}
		<!-- Height animates to the message's natural height (auto until first measured). The clip box extends 8px
		     past the content (-m-2 p-2) so the orb's blur isn't cut off; height includes that padding. pl-2 sets the
		     orb as far from the dock's left edge as from its top (16px). -->
		<div
			class="-m-2 overflow-hidden p-2 transition-[height] duration-300 ease-out"
			style:height={messageHeight ? `${messageHeight + 16}px` : 'auto'}
		>
			<div bind:offsetHeight={messageHeight} class="pl-2">
				<ChatMessage>
					{#snippet avatar()}
						{@render liveOrb()}
					{/snippet}
					<!-- At least orb height, centred: one line sits level with the orb; longer replies start at its top. -->
					<div class="flex min-h-10 items-center">
						<div aria-live="polite">{@render message()}</div>
					</div>
				</ChatMessage>
			</div>
		</div>
		{@render prompt()}
	</div>
{/if}

<style>
	/* Shared name so the input morphs between the centred and docked layouts (the orb sets its own). */
	[data-dock] :global([data-slot='prompt-input']) {
		view-transition-name: iris-prompt;
	}
	/* Words fade in out of a slight blur, one after another. */
	.reveal-word {
		display: inline-block;
		animation: reveal 420ms cubic-bezier(0.2, 0, 0, 1) both;
	}
	@keyframes reveal {
		from {
			opacity: 0;
			filter: blur(6px);
			transform: translateY(3px);
		}
	}
	/* Choices rise in one after another, once the reply has started revealing. */
	[data-dock] :global([data-slot='choice']),
	.suggestion {
		animation: reveal 420ms cubic-bezier(0.2, 0, 0, 1) both;
		animation-delay: calc(var(--index) * 40ms);
	}
	.no-reveal .reveal-word {
		animation: none;
	}
	.thinking {
		animation: thinking 1.6s ease-in-out infinite;
	}
	@keyframes thinking {
		50% {
			opacity: 0.45;
		}
	}
	/* Squeezed or stretched by the pull tab: follows the pointer while dragging, springs back (slight overshoot) on
	   release. Scaled from the bottom edge so the dock stays planted. */
	[data-dock] {
		transform-origin: bottom center;
	}
	.pull-release {
		transition: scale 400ms cubic-bezier(0.34, 1.56, 0.64, 1);
	}
	/* Focusing the input: a subtle pop of the whole box. Uses `scale`, not `transform`, so it doesn't fight the
	   translate that positions the dock. Added from script, hence :global. */
	:global([data-dock].dock-pop) {
		animation: dock-pop 380ms cubic-bezier(0.33, 1, 0.68, 1); /* gentle ease-out, no overshoot */
	}
	@keyframes dock-pop {
		40% {
			scale: 1.01;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.reveal-word,
		[data-dock] :global([data-slot='choice']),
		.suggestion,
		.thinking,
		:global([data-dock].dock-pop) {
			animation: none;
		}
	}
	:global(::view-transition-group(iris-dock)),
	:global(::view-transition-group(iris-avatar)),
	:global(::view-transition-group(iris-prompt)) {
		animation-duration: 450ms;
		animation-timing-function: cubic-bezier(0.2, 0, 0, 1);
	}
</style>
