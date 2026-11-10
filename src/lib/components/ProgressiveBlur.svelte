<script lang="ts">
	import { cn } from '@latitudelabs/design-system';
	import type { HTMLAttributes } from 'svelte/elements';

	/**
	 * Progressive blur: stacked backdrop blurs, each masked to fade out sooner than the last, so what passes under it is
	 * most blurred at the `from` edge and clear at the other. No background colour. Fills its positioned parent (or
	 * place it with `class`); it never takes clicks. The header blurs from the top; the lanes' left margin from the left.
	 */
	let {
		from = 'top',
		class: className,
		...rest
	}: HTMLAttributes<HTMLDivElement> & { from?: 'top' | 'left'; class?: string } = $props();

	// `solid` is where a layer is at full strength, `until` where it has faded out (both % of the area, from the edge).
	const layers = [
		{ blur: 1, solid: 60, until: 100 },
		{ blur: 2, solid: 50, until: 90 },
		{ blur: 4, solid: 40, until: 80 },
		{ blur: 8, solid: 30, until: 70 }
	];
	const direction = $derived(from === 'top' ? 'to bottom' : 'to right');
</script>

<div class={cn('pointer-events-none absolute inset-0', className)} aria-hidden="true" {...rest}>
	{#each layers as layer (layer.blur)}
		<div
			class="absolute inset-0"
			style:backdrop-filter="blur({layer.blur}px)"
			style:-webkit-backdrop-filter="blur({layer.blur}px)"
			style:mask-image="linear-gradient({direction}, black {layer.solid}%, transparent {layer.until}%)"
		></div>
	{/each}
</div>
