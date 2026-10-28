<script lang="ts">
	import Tooltip from '#lib/components/Tooltip.svelte';
	import TooltipGroup from '#lib/components/TooltipGroup.svelte';

	type Props = {
		/** The project's cards in page order, with their size on the page (px). */
		cards: { id: string; title: string; width: number; height: number }[];
		/** The card in focus, drawn solid. */
		current?: string;
		/** Room for the whole map (px); it scales down further to fit. */
		maxHeight?: number;
		onselect: (id: string) => void;
		class?: string;
	};
	let { cards, current, maxHeight = Infinity, onselect, class: className }: Props = $props();

	/** The map's width: the widest card is drawn this wide (w-12). */
	const WIDTH = 48;
	/** Space between blocks, as padding on each button (py-1), so it's part of the click target. */
	const GAP = 8;
	/** Blocks never get smaller than this either way, so tiny or not-yet-measured cards still show. */
	const MIN_SIZE = 6;

	// One scale for every card, so the map keeps their real proportions: the widest card fills the map's width,
	// unless the stack would then be taller than there's room for.
	const scale = $derived.by(() => {
		const widest = Math.max(1, ...cards.map((c) => c.width));
		const tallest = cards.reduce((sum, c) => sum + c.height, 0);
		const room = maxHeight - GAP * cards.length;
		return Math.min(WIDTH / widest, tallest > 0 && room > 0 ? room / tallest : Infinity);
	});
</script>

<!-- A map of the project's cards: each card as a block with its proportions, scaled down and lined up on the left.
     Each block is a button that brings its card into focus, with the card's title in a tooltip beside it (the
     button's label already names the card, so the tooltip doesn't describe it again). Not in the design system yet. -->
<TooltipGroup>
	<nav aria-label="Cards" class={['flex w-12 flex-col items-start', className]}>
		{#each cards as card, i (card.id)}
			<Tooltip text={card.title} side="right" describes={false}>
				{#snippet children({ props })}
					<button
						{...props}
						type="button"
						class="group flex w-full py-1"
						aria-label="Card {i + 1}: {card.title}"
						aria-current={card.id === current ? 'true' : undefined}
						onclick={() => onselect(card.id)}
					>
						<span
							class={[
								'block rounded-sm transition-[width,height,background-color] duration-300 ease-out',
								card.id === current
									? 'bg-foreground'
									: 'bg-muted-foreground/40 group-hover:bg-muted-foreground/70 group-focus-visible:bg-muted-foreground/70'
							]}
							style:width="{Math.max(MIN_SIZE, card.width * scale)}px"
							style:height="{Math.max(MIN_SIZE, card.height * scale)}px"
						></span>
					</button>
				{/snippet}
			</Tooltip>
		{/each}
	</nav>
</TooltipGroup>
