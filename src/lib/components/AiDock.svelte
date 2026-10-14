<script lang="ts" module>
	export function timeOfDayGreeting() {
		const hour = new Date().getHours();
		return hour < 12 ? 'Good morning!' : hour < 18 ? 'Good afternoon!' : 'Good evening!';
	}
</script>

<script lang="ts">
	import { Button, ChatMessage } from '@latitudelabs/design-system';
	import PromptField from './PromptField.svelte';
	import Orb from './Orb.svelte';
	import { onMount } from 'svelte';
	import { loadOrbVariant, orbVariant } from '#lib/orb-variant.svelte.js';

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
		/** Empty-state layout: in the middle of the screen, large avatar above a larger, centered message. */
		centered?: boolean;
		/** With `centered`: sit in the page flow (e.g. above the projects grid) instead of fixed in the middle of the screen. */
		inline?: boolean;
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
		centered = false,
		inline = false,
		onsubmit
	}: Props = $props();

	let input = $state<HTMLTextAreaElement | null>(null);
	let choiceList = $state<HTMLElement | null>(null);

	// Choices sit above the input, which stays for typing something else.
	const showChoices = $derived(choices.length > 0 && !thinking && !error);
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
	/** Natural height of the docked message, so its box can animate between heights. */
	let messageHeight = $state(0);

	/** Splits text into words and the whitespace between them; words reveal one after another. */
	const words = (text: string) => text.split(/(\s+)/).filter(Boolean);
	/** Delay step per word: quick for short replies, compressed so long ones finish within ~0.8s. */
	const step = (text: string) => Math.min(35, 800 / Math.max(1, words(text).length));

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

{#snippet reveal(text: string)}
	<!-- Keyed on the text so every new message replays the reveal. -->
	{#key text}
		{@const delay = step(text)}
		{#each words(text) as word, i (i)}
			{#if word.trim()}<span class="reveal-word" style:animation-delay="{i * delay}ms">{word}</span
				>{:else}{word}{/if}
		{/each}
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

{#snippet key(n: number)}
	<kbd
		class="flex size-6 shrink-0 items-center justify-center rounded-sm border border-border font-sans text-caption text-muted-foreground"
		aria-hidden="true">{n}</kbd
	>
{/snippet}

{#snippet fieldKey()}{@render key(choices.length + 1)}{/snippet}

{#snippet prompt()}
	<div class="flex flex-col gap-1">
		{#if showChoices}
			<div
				bind:this={choiceList}
				role="group"
				aria-label="Suggested answers"
				class="choices flex flex-col gap-1"
			>
				{#each choices as choice, i (choice)}
					<Button
						variant="secondary"
						size="lg"
						class="choice h-12 w-full justify-start gap-6 rounded-lg border-0 pl-2 text-body-lg font-normal"
						style="animation-delay: {i * 40}ms"
						onclick={() => send(choice)}
					>
						{@render key(i + 1)}
						<span class="truncate">{choice}</span>
					</Button>
				{/each}
			</div>
		{/if}
		<!-- Same field in both cases, so focus and the draft survive choices appearing and going. -->
		<PromptField
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
		/>
		<p class="text-center text-heading" aria-live="polite">{@render message()}</p>
		<div class="w-full max-w-md">{@render prompt()}</div>
	</div>
{:else}
	<div
		data-dock
		bind:offsetHeight={height}
		{onfocusin}
		class="fixed bottom-8 left-1/2 flex w-full max-w-md -translate-x-1/2 flex-col gap-5 rounded-xl bg-card p-2 shadow-raised"
		style:view-transition-name="iris-dock"
	>
		<!-- Height animates to the message's natural height (auto until first measured). The clip box extends 8px
		     past the content (-m-2 p-2) so the orb's blur isn't cut off; height includes that padding. -->
		<div
			class="-m-2 overflow-hidden p-2 transition-[height] duration-300 ease-out"
			style:height={messageHeight ? `${messageHeight + 16}px` : 'auto'}
		>
			<div bind:offsetHeight={messageHeight}>
				<!-- Our animated orb + ChatMessage's text-only mode (its built-in avatar can't be animated). -->
				<div class="flex items-start gap-4">
					<Orb
						size={40}
						state={orbState}
						pulse={shown}
						variant={orbVariant.current}
						transitionName="iris-avatar"
					/>
					<ChatMessage from="user" class="min-w-0 flex-1" aria-live="polite">
						<!-- At least orb height, centred: one line sits level with the orb; longer replies start at its top. -->
						<div class="flex min-h-10 items-center"><p>{@render message()}</p></div>
					</ChatMessage>
				</div>
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
	.choices :global(.choice) {
		animation: reveal 420ms cubic-bezier(0.2, 0, 0, 1) both;
	}
	.thinking {
		animation: thinking 1.6s ease-in-out infinite;
	}
	@keyframes thinking {
		50% {
			opacity: 0.45;
		}
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
		.choices :global(.choice),
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
