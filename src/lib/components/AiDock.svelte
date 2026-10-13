<script lang="ts" module>
	export function timeOfDayGreeting() {
		const hour = new Date().getHours();
		return hour < 12 ? 'Good morning!' : hour < 18 ? 'Good afternoon!' : 'Good evening!';
	}
</script>

<script lang="ts">
	import { ChatMessage, PromptInput } from '@latitudelabs/design-system';

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

{#snippet message()}
	{#if thinking}
		<span class="text-muted-foreground">hmm, give me a sec..</span>
	{:else if error}
		<span class="text-destructive">{error}</span>
	{:else}
		{reply || greeting}
	{/if}
{/snippet}

<!-- The assistant's latest message only; answers worth looking at live in cards above. -->
{#if centered}
	<div
		data-dock
		bind:offsetHeight={height}
		class="fixed top-1/2 left-1/2 flex w-full max-w-md -translate-1/2 flex-col items-center gap-8 px-4"
	>
		<div class="relative size-20 shrink-0" role="img" aria-label="AI assistant">
			<div class="absolute inset-0 rounded-full bg-brand blur-sm"></div>
		</div>
		<p class="text-center text-heading" aria-live="polite">{@render message()}</p>
		<PromptInput bind:ref={input} bind:value={draft} {placeholder} disabled={thinking} {onsubmit} />
	</div>
{:else}
	<div
		data-dock
		bind:offsetHeight={height}
		class="fixed bottom-8 left-1/2 flex w-full max-w-md -translate-x-1/2 flex-col gap-5 rounded-xl bg-card p-2 shadow-raised"
	>
		<ChatMessage class="items-center" aria-live="polite">{@render message()}</ChatMessage>
		<PromptInput bind:ref={input} bind:value={draft} {placeholder} disabled={thinking} {onsubmit} />
	</div>
{/if}
