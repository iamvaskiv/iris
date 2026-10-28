<script lang="ts">
	import { Tooltip } from 'bits-ui';
	import type { Snippet } from 'svelte';

	type Props = {
		/** How long the pointer rests on a trigger before its tooltip opens (ms). */
		delay?: number;
		children: Snippet;
	};
	let { delay = 400, children }: Props = $props();
</script>

<!-- Shares timing between the tooltips inside it: once one has opened, moving straight to a neighbour opens its
     tooltip at once instead of waiting the delay again. Every Tooltip needs one of these above it. -->
<Tooltip.Provider delayDuration={delay} skipDelayDuration={300} disableHoverableContent>
	{@render children()}
</Tooltip.Provider>
