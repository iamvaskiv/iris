<script lang="ts">
	import type { SVGAttributes } from 'svelte/elements';

	let props: SVGAttributes<SVGSVGElement> = $props();
</script>

<!-- Bird's eye: five portrait cards, three over two, aligned top left like the view itself. Drawn on a 24px grid to
     sit with the design system's Lucide icons (it has no grid icon); takes the text colour and the button's size. -->
<svg
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 24 24"
	width="24"
	height="24"
	fill="currentColor"
	aria-hidden="true"
	{...props}
>
	<rect x="3" y="3.5" width="5" height="7.5" rx="1.5" />
	<rect x="9.5" y="3.5" width="5" height="7.5" rx="1.5" />
	<rect x="16" y="3.5" width="5" height="7.5" rx="1.5" />
	<rect x="3" y="13" width="5" height="7.5" rx="1.5" />
	<rect x="9.5" y="13" width="5" height="7.5" rx="1.5" />
</svg>
