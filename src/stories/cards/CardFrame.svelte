<script lang="ts">
	import type { Snippet } from 'svelte';

	/**
	 * The width a card gets in the project page's card stack (normal, wide or full). Full and wide also get a height, for
	 * the cards that fill it (full ones, and a study's insights in lanes).
	 */
	let {
		wide = false,
		full = false,
		children
	}: { wide?: boolean; full?: boolean; children: Snippet } = $props();
</script>

<div
	class={full
		? 'w-7xl [--card-height:--spacing(180)]'
		: wide
			? 'w-5xl [--card-height:--spacing(180)]'
			: 'w-3xl'}
>
	{@render children()}
</div>
