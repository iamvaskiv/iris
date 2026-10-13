<script lang="ts">
	import { Button, ChatMessage, PromptInput } from '@latitudelabs/design-system';
	import { Upload } from '@latitudelabs/design-system/icons';

	type Props = {
		reply?: string;
		thinking?: boolean;
		error?: string;
		draft?: string;
		placeholder?: string;
		onsubmit: (message: string) => void;
		/** Shows an upload button when set. */
		onupload?: (file: File) => void;
	};
	let {
		reply,
		thinking = false,
		error,
		draft = $bindable(''),
		placeholder = 'What are we analysing today..?',
		onsubmit,
		onupload
	}: Props = $props();

	let fileInput = $state<HTMLInputElement>();
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
	<div class="flex items-center gap-2">
		{#if onupload}
			<Button variant="ghost" size="icon" aria-label="Upload a video" onclick={() => fileInput?.click()}>
				<Upload />
			</Button>
			<input
				bind:this={fileInput}
				type="file"
				accept="video/*"
				class="hidden"
				onchange={(e) => {
					const file = e.currentTarget.files?.[0];
					if (file) onupload(file);
					e.currentTarget.value = '';
				}}
			/>
		{/if}
		<PromptInput bind:value={draft} {placeholder} disabled={thinking} {onsubmit} />
	</div>
</div>
