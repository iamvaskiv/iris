<script lang="ts">
	import { Icon, LoaderCircle, CircleAlert } from '@latitudelabs/design-system/icons';
	import { Progress } from '@latitudelabs/design-system';
	import CardShell from './CardShell.svelte';
	import type { Card } from './types';

	let { card }: { card: Card } = $props();
	const phase = $derived(card.data?.phase as 'uploading' | 'processing' | 'failed');
	const progress = $derived(Number(card.data?.progress ?? 0));
</script>

<CardShell {card}>
	<div class="flex items-center gap-3">
		{#if phase === 'failed'}
			<Icon icon={CircleAlert} class="text-destructive" />
		{:else}
			<Icon icon={LoaderCircle} class="animate-spin text-muted-foreground" />
		{/if}
		<Progress
			class="flex-1"
			value={progress}
			aria-label="{phase === 'processing' ? 'Analysis' : 'Upload'} progress"
		/>
		<span class="w-10 text-right text-caption text-muted-foreground">{progress}%</span>
	</div>
	<p class="text-caption text-muted-foreground">
		{#if phase === 'uploading'}
			Uploading the file.
		{:else if phase === 'processing'}
			Transcribing and analysing the video. This can take a few minutes; you can leave this page.
		{:else}
			Something went wrong. Try uploading again.
		{/if}
	</p>
</CardShell>
