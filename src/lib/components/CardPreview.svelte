<script lang="ts">
	import { cardComponent, cardSize } from '#lib/cards/registry.js';
	import type { Card } from '#lib/cards/types.js';
	import type { ClassValue } from 'svelte/elements';

	type Props = {
		card: Card;
		/** Width on screen (px): every card is scaled to it, whatever its size on the project page. */
		width?: number;
		class?: ClassValue;
	};
	let { card, width: shown = 224, class: className }: Props = $props();

	/** The card's width on the project page, by its size (max-w-3xl, max-w-5xl, or a typical full page). */
	const WIDTHS = { normal: 768, wide: 1024, full: 1200 };
	/** Full-size cards (studies) fill the page's height; here they get a typical one. */
	const FULL_HEIGHT = 760;

	const CardView = $derived(cardComponent(card.type));
	const width = $derived(WIDTHS[cardSize(card)]);
	const scale = $derived(shown / width);
	let height = $state(0);
</script>

<!-- A card as it looks in its project, in miniature: rendered at its real width (so nothing reflows) and scaled down.
     The corners scale with it, so a frame or shadow given here follows the card's own rounded edge.
     It's a picture, not the card: inert, so nothing in it can be clicked or focused. -->
<div
	class={['pointer-events-none', className]}
	style:width="{shown}px"
	style:height="{height * scale}px"
	style:border-radius="calc(var(--radius-xl) * {scale})"
	aria-hidden="true"
>
	<div
		inert
		bind:offsetHeight={height}
		class="origin-top-left"
		style:width="{width}px"
		style:scale
		style:--card-height="{FULL_HEIGHT}px"
	>
		<CardView {card} />
	</div>
</div>
