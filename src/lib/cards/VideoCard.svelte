<script lang="ts">
	import CardShell from './CardShell.svelte';
	import type { Card } from './types';

	let { card }: { card: Card } = $props();
	const src = $derived(card.data?.streamUrl as string | undefined);
</script>

<CardShell {card}>
	<div class="flex flex-col gap-4 sm:flex-row">
		{#if src}
			<!-- svelte-ignore a11y_media_has_caption -->
			<video {src} controls class="aspect-video w-full rounded-sm bg-muted sm:w-80"></video>
		{:else}
			<div class="aspect-video w-full rounded-sm bg-muted sm:w-80"></div>
		{/if}
		{#if card.body}<p class="flex-1 text-body text-muted-foreground">{card.body}</p>{/if}
	</div>
</CardShell>
