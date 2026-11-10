<script lang="ts">
	import type { SVGAttributes } from 'svelte/elements';

	let { zoom = 'out', ...props }: SVGAttributes<SVGSVGElement> & { zoom?: 'in' | 'out' } = $props();
</script>

<!-- A magnifier with a minus (zoom out: to bird's eye) or a plus (zoom in: back to the cards). Drawn like the design
     system's Lucide icons (it has no zoom icons): a 24px grid, 2px strokes, round ends; takes the text colour. -->
<svg
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 24 24"
	width="24"
	height="24"
	fill="none"
	stroke="currentColor"
	stroke-width="2"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
	{...props}
>
	<circle cx="11" cy="11" r="8" />
	<path d="m21 21-4.35-4.35" />
	<path d="M8 11h6" />
	{#if zoom === 'in'}<path d="M11 8v6" />{/if}
</svg>
