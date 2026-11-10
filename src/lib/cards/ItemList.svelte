<script lang="ts">
	import { Badge } from '@latitudelabs/design-system';
	import { askable, quoted } from '#lib/ask-lumi.js';
	import { timecode } from './format';
	import type { CardItem } from './types';

	/** `about`: the card's title, so each item can ask Lumi about itself (see ask-lumi.ts). */
	let { items, about }: { items: CardItem[]; about?: string } = $props();

	const question = (item: CardItem) =>
		about &&
		`Tell me more about ${quoted(item.title)}${
			item.time !== undefined ? ` (at ${timecode(item.time)})` : ''
		} from ${quoted(about)}. Why does it matter?`;
</script>

<ul class="flex flex-col gap-2">
	{#each items as item, i (i)}
		<li
			class="flex items-start gap-3 rounded-sm bg-background p-4"
			{@attach askable(question(item))}
		>
			<div class="flex min-w-0 flex-1 flex-col gap-1">
				<p class="text-body font-medium">{item.title}</p>
				{#if item.subtitle}<p class="text-caption text-muted-foreground">{item.subtitle}</p>{/if}
				{#if item.description}<p class="text-body-sm text-muted-foreground">
						{item.description}
					</p>{/if}
			</div>
			{#if item.time !== undefined}<Badge variant="secondary">{timecode(item.time)}</Badge>{/if}
		</li>
	{/each}
</ul>
