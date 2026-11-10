<script lang="ts">
	import type { Snippet } from 'svelte';
	import AskLumi from '#lib/components/AskLumi.svelte';

	/** The width a card gets in the project page's card stack (normal, wide or full); full cards also get a height. */
	let {
		wide = false,
		full = false,
		children
	}: { wide?: boolean; full?: boolean; children: Snippet } = $props();

	/** Ask Lumi works here too, minus Lumi: the question it would send shows under the card. */
	let asked = $state('');
</script>

<AskLumi onask={(q) => (asked = q)} />

<div class={full ? 'w-7xl [--card-height:--spacing(180)]' : wide ? 'w-5xl' : 'w-3xl'}>
	{@render children()}
	{#if asked}
		<p class="mt-4 text-body-sm text-muted-foreground" role="status">
			Would ask Lumi: <span class="text-foreground">{asked}</span>
		</p>
	{/if}
</div>
