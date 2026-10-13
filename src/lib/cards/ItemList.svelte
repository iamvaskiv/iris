<script lang="ts">
	import { Badge } from '@latitudelabs/design-system';
	import { timecode } from './format';
	import type { CardItem } from './types';

	let { items }: { items: CardItem[] } = $props();
</script>

<ul class="flex flex-col gap-2">
	{#each items as item, i (i)}
		<li class="flex items-start gap-3 rounded-sm bg-background p-4">
			<div class="flex min-w-0 flex-1 flex-col gap-1">
				<p class="text-body font-medium">{item.title}</p>
				{#if item.subtitle}<p class="text-caption text-muted-foreground">{item.subtitle}</p>{/if}
				{#if item.description}<p class="text-body-sm text-muted-foreground">{item.description}</p>{/if}
			</div>
			{#if item.time !== undefined}<Badge variant="secondary">{timecode(item.time)}</Badge>{/if}
		</li>
	{/each}
</ul>
