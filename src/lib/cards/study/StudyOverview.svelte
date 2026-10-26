<script lang="ts">
	import { Tile } from '@latitudelabs/design-system';
	import type { SampleResults } from '../types';

	/** Lumi's reading of a study's results: a summary, two key insights and a telling quote. */
	let { results }: { results: SampleResults } = $props();
</script>

<Tile class="gap-2 rounded-lg p-6">
	<h3 class="text-body font-medium">Summary of insights</h3>
	<p class="text-body-lg">{results.summary}</p>
</Tile>
<div class="grid grid-cols-2 gap-4">
	{#each results.insights as insight, i (i)}
		<Tile class="gap-2 rounded-lg p-6">
			<h3 class="text-body font-medium">{insight.title}</h3>
			<p class="text-body text-muted-foreground">{insight.body}</p>
		</Tile>
	{/each}
</div>
<Tile class="gap-2 rounded-lg p-6">
	<h3 class="text-body font-medium">Quote</h3>
	<blockquote class="text-body-lg">“{results.quote.text}”</blockquote>
	<p class="text-caption text-muted-foreground">{results.quote.who}</p>
</Tile>
