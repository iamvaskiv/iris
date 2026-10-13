<script lang="ts" module>
	export function timeOfDayGreeting() {
		const hour = new Date().getHours();
		return hour < 12 ? 'Good morning!' : hour < 18 ? 'Good afternoon!' : 'Good evening!';
	}
</script>

<script lang="ts">
	import { ChatMessage, PromptInput } from '@latitudelabs/design-system';
	import Orb from './Orb.svelte';
	import { onMount } from 'svelte';
	import { loadOrbVariant, orbVariant } from '#lib/orb-variant.svelte.js';

	type Props = {
		reply?: string;
		/** Shown when there's no reply yet, so Jinn always has something to say. Defaults to a time-of-day hello. */
		greeting?: string;
		thinking?: boolean;
		error?: string;
		draft?: string;
		placeholder?: string;
		/** Rendered height, bindable (the project page keeps cards clear of the dock). */
		height?: number;
		/** Empty-state layout: in the middle of the screen, large avatar above a larger, centered message. */
		centered?: boolean;
		onsubmit: (message: string) => void;
	};
	let {
		reply,
		greeting = timeOfDayGreeting(),
		thinking = false,
		error,
		draft = $bindable(''),
		placeholder = 'Press Enter to ask Jinn...',
		height = $bindable(0),
		centered = false,
		onsubmit
	}: Props = $props();

	let input = $state<HTMLInputElement | null>(null);
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

	/** Enter anywhere on the page focuses the prompt, unless the user is in another field or on a control. */
	function onkeydown(e: KeyboardEvent) {
		if (
			e.key !== 'Enter' ||
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
			el.closest('input, textarea, select, button, a, [contenteditable], [role=button]')
		)
			return;
		if (!input || input.disabled) return;
		e.preventDefault();
		input.focus();
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

<!-- The assistant's latest message only; answers worth looking at live in cards above. -->
{#if centered}
	<div
		data-dock
		bind:offsetHeight={height}
		class="fixed top-1/2 left-1/2 flex w-full max-w-md -translate-1/2 flex-col items-center gap-8 px-4"
		style:view-transition-name="jinn-dock"
	>
		<Orb
			size={80}
			state={orbState}
			pulse={shown}
			variant={orbVariant.current}
			transitionName="jinn-avatar"
		/>
		<p class="text-center text-heading" aria-live="polite">{@render message()}</p>
		<PromptInput bind:ref={input} bind:value={draft} {placeholder} disabled={thinking} {onsubmit} />
	</div>
{:else}
	<div
		data-dock
		bind:offsetHeight={height}
		class="fixed bottom-8 left-1/2 flex w-full max-w-md -translate-x-1/2 flex-col gap-5 rounded-xl bg-card p-2 shadow-raised"
		style:view-transition-name="jinn-dock"
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
						transitionName="jinn-avatar"
					/>
					<ChatMessage from="user" class="min-w-0 flex-1" aria-live="polite">
						<!-- At least orb height, centred: one line sits level with the orb; longer replies start at its top. -->
						<div class="flex min-h-10 items-center"><p>{@render message()}</p></div>
					</ChatMessage>
				</div>
			</div>
		</div>
		<PromptInput bind:ref={input} bind:value={draft} {placeholder} disabled={thinking} {onsubmit} />
	</div>
{/if}

<style>
	/* Shared name so the input morphs between the centred and docked layouts (the orb sets its own). */
	[data-dock] :global([data-slot='prompt-input']) {
		view-transition-name: jinn-prompt;
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
	.thinking {
		animation: thinking 1.6s ease-in-out infinite;
	}
	@keyframes thinking {
		50% {
			opacity: 0.45;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.reveal-word,
		.thinking {
			animation: none;
		}
	}
	:global(::view-transition-group(jinn-dock)),
	:global(::view-transition-group(jinn-avatar)),
	:global(::view-transition-group(jinn-prompt)) {
		animation-duration: 450ms;
		animation-timing-function: cubic-bezier(0.2, 0, 0, 1);
	}
</style>
