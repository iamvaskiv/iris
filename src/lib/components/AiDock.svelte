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
	import { ChoiceList, Icon, Kbd, Orb, PromptInput, Tile } from '@latitudelabs/design-system';
	import type { ComponentProps } from 'svelte';
	import { onMount } from 'svelte';
	import { slide } from 'svelte/transition';
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
	/** Change size. The dock is one layout for all three sizes, so this only changes the values that differ between
	 *  them (conversation height, padding, input offset, orb position); CSS transitions animate those (see below). */
	function setMode(next: DockMode) {
		if (next === mode) return;
		mode = next;
		if (viewport) viewport.scrollTop = 0; // newest message in view (the conversation scrolls from the bottom)
	}
	/** One size smaller (`-1`) or larger (`1`), or undefined at either end. */
	const step = (by: -1 | 1) => MODES[MODES.indexOf(mode) + by];

	// Pull tab: drag up for larger, down for smaller, through all three sizes in one drag if you like. The size changes
	// while the button is still held, at detents measured from where the drag started: one size at PULL_DETENTS[0],
	// two at PULL_DETENTS[1], far enough apart that a quick flick doesn't skip the middle size. Heading back, a size
	// lets go PULL_SLACK before its detent, so it doesn't flicker on and off right at the line. While dragging, the
	// whole dock squeezes (down) or stretches (up) from its bottom edge, measured from the last detent passed, with
	// rubber-band resistance, and springs back on release; pulling the way that wouldn't change anything gives a
	// quarter of the give. A drag swallows the click that follows it. Click (or Enter/Space) shows more (compact →
	// default → expanded) and goes back from expanded; arrow keys step either way.
	const PULL_DETENTS = [60, 200];
	const PULL_SLACK = 24;
	let pullStart = $state<number | null>(null);
	let pullY = $state(0);
	let pulled = false;
	/** Size the drag started at (index into MODES), and how many sizes it has moved from there (+ up, − down). */
	let pullFrom = 0;
	let pullSteps = $state(0);
	/** Drag distance (up positive) at which `steps` sizes are reached. */
	const detent = (steps: number) =>
		steps ? Math.sign(steps) * PULL_DETENTS[Math.abs(steps) - 1] : 0;
	/** Whether there's a size `steps` away from where the drag started. */
	const canStep = (steps: number) => !!MODES[pullFrom + steps];
	/** Vertical scale for the current drag: up to ±25%, easing off the further you pull. */
	const squeeze = $derived.by(() => {
		const towardChange = canStep(pullSteps + (pullY > 0 ? -1 : 1));
		const give = 0.25 * (1 - Math.exp(-Math.abs(pullY) / 60)) * (towardChange ? 1 : 0.25);
		return pullY > 0 ? 1 - give : 1 + give;
	});
	/** The dock's `scale`: squeezing also widens it slightly (and stretching narrows it), like something soft. */
	const dockScale = $derived(squeeze === 1 ? undefined : `${1 + (1 - squeeze) * 0.1} ${squeeze}`);
	// The drag is followed on the window rather than captured by the tab, so it carries on wherever the pointer goes
	// as the dock changes size under it.
	function onpullstart(e: PointerEvent) {
		if (e.button !== 0) return;
		e.preventDefault(); // no text selection while dragging
		pullStart = e.clientY;
		pulled = false;
		pullFrom = MODES.indexOf(mode);
		pullSteps = 0;
		window.addEventListener('pointermove', onpullmove);
		window.addEventListener('pointerup', stopPull);
		window.addEventListener('pointercancel', stopPull);
	}
	function onpullmove(e: PointerEvent) {
		if (pullStart === null) return;
		const up = pullStart - e.clientY;
		if (Math.abs(up) > 4) pulled = true;
		let steps = pullSteps;
		// Back toward the start: once PULL_SLACK short of the current detent.
		while (steps > 0 && up < detent(steps) - PULL_SLACK) steps--;
		while (steps < 0 && up > detent(steps) + PULL_SLACK) steps++;
		// Outward: past the next detent, if there's a size there.
		while (steps >= 0 && canStep(steps + 1) && up >= detent(steps + 1)) steps++;
		while (steps <= 0 && canStep(steps - 1) && up <= detent(steps - 1)) steps--;
		if (steps !== pullSteps) {
			pullSteps = steps;
			setMode(MODES[pullFrom + steps]);
		}
		pullY = detent(steps) - up;
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

	// The conversation, oldest first, ending with Lumi's latest message: her latest reply (or the greeting, before
	// there is one), or a status row while she thinks or after an error. With no history, that last row is all there
	// is. The reply prop wins over the history's copy of it (scripted mode adds a note to it).
	const conversation = $derived.by<TranscriptMessage[]>(() => {
		if (thinking || error) return messages;
		const last = messages.at(-1);
		if (last?.from === 'assistant')
			return [...messages.slice(0, -1), { from: 'assistant', text: reply || last.text }];
		return [...messages, { from: 'assistant', text: reply || greeting }];
	});
	const status = $derived(thinking || !!error);
	/** Lumi's latest message, the one that reveals word by word (−1 while a status row stands in for it). */
	const liveIndex = $derived(status ? -1 : conversation.length - 1);

	// One layout for all three docked sizes. The conversation sits in a viewport that scrolls from the bottom; its
	// height is what changes: nothing (compact), the last row (default), or the whole conversation up to a maximum
	// (expanded). Growing uncovers earlier messages from the top, like a drawer. The orb is a single element laid over
	// the dock, moved between the last row and the input, so it never remounts mid-change. Everything that differs
	// between sizes is a plain value, animated by CSS transitions over --dock-duration (see resizeDuration).
	let viewport = $state<HTMLElement | null>(null);
	let content = $state<HTMLElement | null>(null);
	let promptBox = $state<HTMLElement | null>(null);
	let compactError = $state<HTMLElement | null>(null);
	/** Measured heights: the whole conversation, its last row, the input (with any choices), compact's error line. */
	let contentHeight = $state(0);
	let lastRowHeight = $state(0);
	let promptHeight = $state(0);
	let compactErrorHeight = $state(0);
	let viewHeight = $state(800);
	function measure() {
		contentHeight = content?.offsetHeight ?? 0;
		lastRowHeight = (content?.lastElementChild as HTMLElement | null)?.offsetHeight ?? 0;
		promptHeight = promptBox?.offsetHeight ?? 0;
		compactErrorHeight = compactError?.offsetHeight ?? 0;
		viewHeight = window.innerHeight;
	}
	// Measured right after each render (before paint) and whenever anything resizes, e.g. a reply arriving or the
	// input growing a line.
	$effect(() => {
		const els = [content, promptBox, compactError].filter((el): el is HTMLElement => !!el);
		measure();
		const observer = new ResizeObserver(measure);
		for (const el of els) observer.observe(el);
		window.addEventListener('resize', measure);
		return () => {
			observer.disconnect();
			window.removeEventListener('resize', measure);
		};
	});
	/** The viewport's padding around the rows: room for the orb's glow above, and the gap to the input below. */
	const VIEWPORT_PAD = 12;
	const VIEWPORT_PAD_BOTTOM = 20;
	const maxViewport = $derived(Math.min(viewHeight * 0.6, 640));
	const viewportHeight = $derived(
		mode === 'compact'
			? 0
			: mode === 'default'
				? VIEWPORT_PAD + lastRowHeight + VIEWPORT_PAD_BOTTOM
				: Math.min(contentHeight, maxViewport)
	);
	const scrolls = $derived(mode === 'expanded' && contentHeight > maxViewport);
	/** The orb's distance from the dock's bottom edge: level with the input (compact), or at the top of the last row. */
	const orbBottom = $derived(
		mode === 'compact' ? 12 : 8 + promptHeight + VIEWPORT_PAD_BOTTOM + lastRowHeight - 40
	);
	// Scrolled back through the conversation, the latest row is out of view, so the orb beside it steps aside too.
	let scrolledBack = $state(false);
	/** The viewport's height is mid-change. Then (and when scrolled back) its top edge fades out, so earlier messages
	 *  slide in or out softly instead of showing a hard cut right under the pull tab. */
	let resizingNow = $state(false);
	function onviewportscroll() {
		scrolledBack = !!viewport && viewport.scrollTop < -4;
	}
	$effect(() => {
		if (!scrolls) scrolledBack = false;
	});

	/** Transition time for a change of `px` in height: short hops stay quick, big ones get time to read as movement. */
	const resizeDuration = (px: number) => Math.round(Math.min(560, Math.max(240, 200 + px)));
	let duration = $state(300);
	let previousHeight: number | undefined;
	$effect.pre(() => {
		const h = viewportHeight;
		if (previousHeight !== undefined) duration = resizeDuration(Math.abs(h - previousHeight));
		previousHeight = h;
	});
	// No transitions until the first measurement has landed, so the dock doesn't animate into place on load.
	let ready = $state(false);
	onMount(() => {
		const frame = requestAnimationFrame(() => (ready = true));
		return () => cancelAnimationFrame(frame);
	});

	/** Height the page keeps clear for the dock. Expanded overlays the page, so it reports the default size, and each
	 *  size reports its final height straight away rather than every frame of the change. */
	$effect(() => {
		if (centered) return;
		height =
			mode === 'compact'
				? 16 + compactErrorHeight + promptHeight
				: 16 + lastRowHeight + VIEWPORT_PAD_BOTTOM + promptHeight + 8;
	});

	/** The message whose word-by-word reveal has already played. Showing it again (moving from the centred layout to
	 *  the docked one remounts it) shows it straight away, so it doesn't blank out and fade back in. Set after each render, and
	 *  deliberately not reactive: updating it must not re-render the message it was just set from. */
	// svelte-ignore non_reactive_update
	let revealedText: string | undefined;
	$effect(() => {
		revealedText = error || reply || greeting;
	});

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
	<!-- Keyed on the text so every new message plays the reveal (once: see revealedText). -->
	{#key text}
		{@const { parts, delay } = layout(text)}
		<div class={['flex flex-col gap-2', text === revealedText && 'no-reveal']}>
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

<!-- An earlier message: same formatting as the latest reply, without the word-by-word reveal. -->
{#snippet formatted(text: string)}
	<div class="no-reveal">{@render reveal(text)}</div>
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
{:else}
	<!-- Docked: one layout for all three sizes (see the script). The values that differ between sizes are set inline and
	     animated by the dock-* transitions in the styles. -->
	<div
		data-dock
		{onfocusin}
		class={[
			'fixed bottom-8 left-1/2 flex w-full max-w-140 -translate-x-1/2 flex-col rounded-xl bg-card px-2 pb-2 shadow-raised',
			ready && 'dock-animate'
		]}
		class:pull-release={pullStart === null}
		style:padding-top="{mode === 'compact' ? 8 : 16}px"
		style:scale={dockScale}
		style:--dock-duration="{duration}ms"
		style:view-transition-name="iris-dock"
	>
		<!-- In the taller top padding, or just above the dock when compact, whose padding is even all round. Drag or
		     arrow keys step the size; click shows more. -->
		<button
			type="button"
			class="group dock-move absolute left-1/2 z-10 flex h-4 w-16 -translate-x-1/2 cursor-grab touch-none items-center justify-center active:cursor-grabbing"
			style:top="{mode === 'compact' ? -16 : 0}px"
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

		<!-- The conversation, scrolling from the bottom (column-reverse), so changing its height uncovers or covers earlier
		     messages from the top. -mx-3 and the rows' 12px padding leave room for the orb's glow; the 20px below is the gap to the input. Each question sits just
		     above its answer (gap-3); turns are set apart (mt-5 before each later question). Lumi's rows start past the
		     orb's column (pl-16: 16px to the orb + 40px orb + 16px gap, less the 8px the dock's padding gives). -->
		<div
			bind:this={viewport}
			class={[
				'dock-size -mx-3 flex flex-col-reverse overscroll-contain',
				scrolls ? 'overflow-y-auto' : 'overflow-hidden',
				(resizingNow || scrolledBack) && 'fade-top'
			]}
			style:height="{viewportHeight}px"
			style:margin-top="{mode === 'compact' ? 0 : -VIEWPORT_PAD}px"
			onscroll={onviewportscroll}
			ontransitionrun={(e) =>
				e.target === viewport && e.propertyName === 'height' && (resizingNow = true)}
			ontransitionend={(e) =>
				e.target === viewport && e.propertyName === 'height' && (resizingNow = false)}
			ontransitioncancel={(e) =>
				e.target === viewport && e.propertyName === 'height' && (resizingNow = false)}
			role="log"
			aria-label="Conversation with Lumi"
		>
			<div bind:this={content} class="flex shrink-0 flex-col gap-3 px-3 pt-3 pb-5">
				<!-- Rows before the latest only show when expanded, fading in as the box opens. Otherwise they'd peek into
				     the glow room above the latest row. -->
				{#each conversation as m, i (i)}
					{#if m.from === 'user'}
						<!-- Your messages: right-aligned bubbles in the accent colour. Not in the design system yet. -->
						<div
							class={[
								'dock-fade max-w-4/5 self-end rounded-lg bg-primary px-4 py-2 text-body-lg text-primary-foreground',
								i > 0 && 'mt-5',
								mode !== 'expanded' && 'opacity-0'
							]}
						>
							{@render formatted(m.text)}
						</div>
					{:else if i === liveIndex}
						<!-- At least orb height, centred: one line sits level with the orb; longer replies start at its top. -->
						<div class="flex min-h-10 items-center pl-16 text-body-lg">
							{@render reveal(m.text)}
						</div>
					{:else}
						<div class={['dock-fade pl-16 text-body-lg', mode !== 'expanded' && 'opacity-0']}>
							{@render formatted(m.text)}
						</div>
					{/if}
				{/each}
				{#if status}
					<div class="flex min-h-10 items-center pl-16 text-body-lg">{@render message()}</div>
				{/if}
			</div>
		</div>

		{#if mode === 'compact' && error && !thinking}
			<p
				bind:this={compactError}
				transition:slide={{ duration: 200 }}
				class="px-3 pt-2 pb-3 text-body text-destructive"
			>
				{error}
			</p>
		{/if}

		<!-- Compact moves the input right to make room for the orb beside it (12px + 40px orb). -->
		<div
			bind:this={promptBox}
			class="dock-size"
			style:margin-left="{mode === 'compact' ? 52 : 0}px"
		>
			{@render prompt()}
		</div>

		<!-- The one orb: beside the latest row, or beside the input when compact (16px or 12px from the dock's edges, as
		     far as from its top). -->
		<div
			class="dock-move pointer-events-none absolute"
			class:opacity-0={scrolledBack}
			style:left="{mode === 'compact' ? 12 : 16}px"
			style:bottom="{orbBottom}px"
		>
			<div class="pointer-events-auto">
				<Orb
					size={40}
					state={orbState}
					pulse={shown}
					variant={orbVariant.current}
					transitionName="iris-avatar"
					label="Lumi"
				/>
			</div>
		</div>
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
	/* Changing size: every value that differs between sizes eases over --dock-duration (set from how far the height
	   changes), responding at once and settling softly. Off until the dock has been measured, so it doesn't animate
	   into place on load. */
	.dock-animate {
		--dock-ease: cubic-bezier(0.3, 0, 0, 1);
		transition: padding-top var(--dock-duration) var(--dock-ease);
	}
	.dock-animate.pull-release {
		transition:
			padding-top var(--dock-duration) var(--dock-ease),
			scale 400ms cubic-bezier(0.34, 1.56, 0.64, 1);
	}
	.dock-animate .dock-size {
		transition-property: height, margin;
		transition-duration: var(--dock-duration);
		transition-timing-function: var(--dock-ease);
	}
	.dock-animate .dock-fade {
		transition: opacity var(--dock-duration) var(--dock-ease);
	}
	.fade-top {
		mask-image: linear-gradient(to bottom, transparent, black 16px);
	}
	.dock-animate .dock-move {
		transition-property: top, left, bottom, opacity;
		transition-duration: var(--dock-duration);
		transition-timing-function: var(--dock-ease);
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
		.dock-animate,
		.dock-animate .dock-size,
		.dock-animate .dock-move,
		.dock-animate .dock-fade {
			transition: none;
		}
	}
	:global(::view-transition-group(iris-dock)),
	:global(::view-transition-group(iris-avatar)),
	:global(::view-transition-group(iris-prompt)) {
		animation-duration: 450ms;
		animation-timing-function: cubic-bezier(0.2, 0, 0, 1);
	}
	/* The orb moves rather than cross-fades: the default fade blends old and new with plus-lighter, and two bright
	   orbs on top of each other add up to a white flash. Only the new, live orb is shown, travelling from the old
	   one's place. */
	:global(::view-transition-old(iris-avatar)) {
		display: none;
	}
	:global(::view-transition-new(iris-avatar)) {
		animation: none;
	}
</style>
