<script lang="ts">
	import CardShell from './CardShell.svelte';
	import { askable, quoted } from '#lib/ask-lumi.js';
	import ItemList from './ItemList.svelte';
	import type { Card } from './types';

	let { card }: { card: Card } = $props();
</script>

<CardShell {card}>
	{#if card.body}<p
			class="text-body whitespace-pre-wrap"
			{@attach askable(`Can you go deeper on ${quoted(card.title)}? What's it based on?`)}
		>
			{card.body}
		</p>{/if}
	{#if card.items?.length}<ItemList items={card.items} about={card.title} />{/if}
</CardShell>
