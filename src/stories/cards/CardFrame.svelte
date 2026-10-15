<script lang="ts">
	import type { Snippet } from 'svelte';

	/** The width a card gets in the project page's card stack (normal or wide). */
	let { wide = false, children }: { wide?: boolean; children: Snippet } = $props();
</script>

<div class={wide ? 'w-5xl' : 'w-3xl'}>{@render children()}</div>
