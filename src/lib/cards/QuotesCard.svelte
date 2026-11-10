<script lang="ts">
	import CardShell from './CardShell.svelte';
	import { askable, quoted } from '#lib/ask-lumi.js';
	import { timecode } from './format';
	import type { Card, CardItem } from './types';

	let { card }: { card: Card } = $props();

	/** What a quote can ask Lumi (see ask-lumi.ts): what's behind it. */
	const question = (q: CardItem) =>
		`${q.subtitle || 'Someone'} said ${quoted(q.title)}${
			q.time !== undefined ? ` at ${timecode(q.time)}` : ''
		} (from ${quoted(card.title)}). What's behind that, and do others feel the same?`;
</script>

<CardShell {card}>
	{#if card.body}<p class="text-body text-muted-foreground">{card.body}</p>{/if}
	<ul class="flex flex-col gap-4">
		{#each card.items ?? [] as quote, i (i)}
			<li class="flex flex-col gap-1" {@attach askable(question(quote))}>
				<p class="text-body-lg">“{quote.title}”</p>
				<p class="text-caption text-muted-foreground">
					{quote.subtitle}{#if quote.time !== undefined}{quote.subtitle ? ' · ' : ''}{timecode(
							quote.time
						)}{/if}
				</p>
			</li>
		{/each}
	</ul>
</CardShell>
