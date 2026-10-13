<script lang="ts">
	import { ArrowUp } from '@latitudelabs/design-system/icons';

	/**
	 * The design system's PromptInput, but multi-line: same look and tokens, with a textarea that grows with the text
	 * up to `maxLines`, then scrolls; the send button stretches to the field's height. Enter sends, Shift+Enter adds a line. (Candidate for the design system:
	 * PromptInput is single-line only.)
	 */
	let {
		value = $bindable(''),
		ref = $bindable(null),
		placeholder,
		disabled = false,
		label,
		submitLabel = 'Send',
		maxLines = 4,
		onsubmit
	}: {
		value?: string;
		ref?: HTMLTextAreaElement | null;
		placeholder?: string;
		/** Blocks typing and sending (e.g. while the assistant is thinking) but keeps focus: the field is made read-only
		 *  rather than disabled, because browsers drop focus from disabled fields. */
		disabled?: boolean;
		/** Accessible name for the field. Defaults to the placeholder, then "Message". */
		label?: string;
		submitLabel?: string;
		maxLines?: number;
		/** Called with the current value on Enter or the send button. Not called when empty. */
		onsubmit?: (value: string) => void;
	} = $props();

	const canSubmit = $derived(!disabled && value.trim().length > 0);

	function submit() {
		if (canSubmit) onsubmit?.(value);
	}

	function onkeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
			e.preventDefault();
			submit();
		}
	}

	// Grow with the content up to maxLines; beyond that the textarea scrolls.
	function resize() {
		if (!ref) return;
		const style = getComputedStyle(ref);
		const line = parseFloat(style.lineHeight);
		const padding = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
		ref.style.height = 'auto';
		ref.style.height = `${Math.min(ref.scrollHeight, line * maxLines + padding)}px`;
	}
	$effect(() => {
		void value; // also shrinks back after the value is cleared on send
		resize();
	});
</script>

<form
	data-slot="prompt-input"
	class={[
		'flex min-h-12 w-full items-stretch gap-2 rounded-lg bg-input py-1 pr-1 pl-5 transition-[box-shadow,opacity] focus-within:ring-3 focus-within:ring-ring/50',
		disabled && 'opacity-50'
	]}
	onsubmit={(e) => {
		e.preventDefault();
		submit();
	}}
>
	<textarea
		bind:this={ref}
		bind:value
		rows="1"
		{placeholder}
		readonly={disabled}
		aria-disabled={disabled}
		{onkeydown}
		aria-label={label ?? placeholder ?? 'Message'}
		class={[
			'min-w-0 flex-1 resize-none self-center bg-transparent py-2 text-body-lg outline-none placeholder:text-placeholder',
			disabled && 'cursor-not-allowed'
		]}></textarea>
	<button
		type="submit"
		aria-label={submitLabel}
		disabled={!canSubmit}
		class="flex min-h-10 w-16 shrink-0 items-center justify-center rounded-md bg-card text-placeholder transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 enabled:cursor-pointer enabled:hover:text-foreground"
	>
		<ArrowUp class="size-4" />
	</button>
</form>
