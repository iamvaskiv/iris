<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Card } from '@latitudelabs/design-system';
	import type { Card as CardData } from './types';

	let { card, children }: { card: CardData; children: Snippet } = $props();
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>{card.title}</Card.Title>
		{#if card.subtitle}<Card.Description>{card.subtitle}</Card.Description>{/if}
	</Card.Header>
	<Card.Content class="flex flex-col gap-4">
		{@render children()}
	</Card.Content>
</Card.Root>
