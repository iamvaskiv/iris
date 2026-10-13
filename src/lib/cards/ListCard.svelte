<script lang="ts">
	import CardShell from './CardShell.svelte';
	import ItemList from './ItemList.svelte';
	import type { Card } from './types';

	let { card }: { card: Card } = $props();
</script>

<CardShell {card}>
	{#if card.body}<p class="text-body text-muted-foreground">{card.body}</p>{/if}
	<ItemList items={card.items ?? []} />
</CardShell>
