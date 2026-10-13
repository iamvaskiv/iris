<script lang="ts">
	import CardShell from './CardShell.svelte';
	import { timecode } from './format';
	import type { Card } from './types';

	let { card }: { card: Card } = $props();
</script>

<CardShell {card}>
	{#if card.body}<p class="text-body text-muted-foreground">{card.body}</p>{/if}
	<ul class="flex flex-col gap-4">
		{#each card.items ?? [] as quote, i (i)}
			<li class="flex flex-col gap-1">
				<p class="text-body-lg">“{quote.title}”</p>
				<p class="text-caption text-muted-foreground">
					{quote.subtitle}{#if quote.time !== undefined}{quote.subtitle ? ' · ' : ''}{timecode(quote.time)}{/if}
				</p>
			</li>
		{/each}
	</ul>
</CardShell>
