<script lang="ts">
	import { Icon, LoaderCircle, CircleAlert } from '@latitudelabs/design-system/icons';
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
		<div
			class="h-2 flex-1 overflow-hidden rounded-full bg-muted"
			role="progressbar"
			aria-label="{phase === 'processing' ? 'Analysis' : 'Upload'} progress"
			aria-valuenow={progress}
			aria-valuemin={0}
			aria-valuemax={100}
		>
			<div class="h-full rounded-full bg-primary transition-[width]" style:width="{progress}%"></div>
		</div>
		<span class="w-10 text-right text-caption text-muted-foreground">{progress}%</span>
	</div>
	<p class="text-caption text-muted-foreground">
		{#if phase === 'uploading'}
			Sending the file to Lumiere.
		{:else if phase === 'processing'}
			Lumiere is transcribing and analysing the video. This can take a few minutes; you can leave this page.
		{:else}
			Something went wrong. Try uploading again.
		{/if}
	</p>
</CardShell>
