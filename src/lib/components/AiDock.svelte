<script lang="ts">
	import { ChatMessage, PromptInput } from '@latitudelabs/design-system';

	type Props = {
		reply?: string;
		thinking?: boolean;
		error?: string;
		draft?: string;
		placeholder?: string;
		onsubmit: (message: string) => void;
	};
	let {
		reply,
		thinking = false,
		error,
		draft = $bindable(''),
		placeholder = 'What are we analysing today..?',
		onsubmit
	}: Props = $props();
</script>

<!-- The assistant's latest message only; answers worth looking at live in cards above. -->
<div
	class="fixed bottom-8 left-1/2 flex w-full max-w-md -translate-x-1/2 flex-col gap-5 rounded-xl bg-card p-2 shadow-raised"
>
	{#if thinking || reply || error}
		<ChatMessage class="items-center" aria-live="polite">
			{#if thinking}
				<span class="text-muted-foreground">hmm, give me a sec..</span>
			{:else if error}
				<span class="text-destructive">{error}</span>
			{:else}
				{reply}
			{/if}
		</ChatMessage>
	{/if}
	<PromptInput bind:value={draft} {placeholder} disabled={thinking} {onsubmit} />
</div>
