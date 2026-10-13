<script lang="ts">
	import CardShell from './CardShell.svelte';
	import ItemList from './ItemList.svelte';
	import type { Card } from './types';

	let { card }: { card: Card } = $props();
</script>

<CardShell {card}>
	{#if card.body}<p class="text-body whitespace-pre-wrap">{card.body}</p>{/if}
	{#if card.items?.length}<ItemList items={card.items} />{/if}
</CardShell>
