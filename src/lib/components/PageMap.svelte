<script lang="ts">
	import { cardSize } from '#lib/cards/registry.js';
	import type { Lane, Slot } from '#lib/cards/lanes.js';
	import Tooltip from './Tooltip.svelte';
	import TooltipGroup from './TooltipGroup.svelte';

	/**
	 * A map of the project's cards, for getting around: a row per lane (top to bottom, as on the page) and a tiny card per
	 * card in it (left to right), each in its whole card's proportions (a tall card that scrolls in its lane is drawn
	 * tall), all at one scale (a lane's height is 18px), top-aligned like the cards. The card in focus is white and
	 * raised (a shadow and a hairline edge), at full size; the rest are one grey, drawn smaller (60%) so they pack to the
	 * left. Clicking one goes to it; hovering names it.
	 */
	let {
		lanes,
		focused,
		size,
		laneHeight,
		onselect
	}: {
		lanes: Lane[];
		/** The focused slot's key. */
		focused: string | undefined;
		/** A card's whole rendered size (0 before it's measured), however much of it its lane shows. */
		size: (slot: Slot) => { width: number; height: number };
		/** How tall a lane's cards can be: the map's scale. */
		laneHeight: number;
		onselect: (key: string) => void;
	} = $props();

	/** A lane's full height on the map. */
	const ROW = 18;
	const scale = $derived(ROW / Math.max(1, laneHeight));
	/** Before a card is measured, a guess from its size class. */
	const GUESS = { normal: 768, wide: 1024, full: 1400 } as const;
	/** Cards not in focus are drawn at this share of their size (so they pack to the left, and the focused one stands out). */
	const SMALL = 0.6;
	function box(slot: Slot, on: boolean) {
		const { width, height } = size(slot);
		const k = scale * (on ? 1 : SMALL);
		return {
			width: Math.max(4, Math.round((width || GUESS[cardSize(slot.card)]) * k)),
			height: Math.max(4, Math.round((height || laneHeight * 0.75) * k))
		};
	}
	/**
	 * The map's width: its widest row with any one of that row's cards in focus (full size), so the map, and the page's
	 * left gutter that follows it, doesn't shift as focus moves.
	 */
	const GAP = 4;
	const width = $derived(
		Math.max(
			0,
			...lanes.map((lane) => {
				const small = lane.slots.map((slot) => box(slot, false).width);
				const full = lane.slots.map((slot) => box(slot, true).width);
				const sum = small.reduce((n, w) => n + w, 0) + GAP * (lane.slots.length - 1);
				return sum + Math.max(0, ...full.map((w, i) => w - small[i]));
			})
		)
	);
	const label = (lane: Lane, slot: Slot) =>
		`${lane.title}: ${slot.card.title}${slot.part === 'insights' ? ' (insights)' : ''}`;
</script>

<nav aria-label="Cards" class="flex flex-col gap-1.5" style:width="{width}px">
	<TooltipGroup>
		{#each lanes as lane (lane.key)}
			<ul class="flex items-start gap-1" aria-label={lane.title}>
				{#each lane.slots as slot (slot.key)}
					{@const on = slot.key === focused}
					{@const b = box(slot, on)}
					<li class="flex">
						<Tooltip text={label(lane, slot)} side="right" describes={false}>
							{#snippet children({ props })}
								<button
									{...props}
									type="button"
									aria-label={label(lane, slot)}
									aria-current={on ? 'true' : undefined}
									onclick={() => onselect(slot.key)}
									class="group flex rounded-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
								>
									<span
										class={[
											'origin-left rounded-xs transition-[background-color,width,height,scale] duration-200 motion-reduce:transition-none',
											// The focused card full size; the others smaller (see box), growing a little on hover.
											on
												? 'bg-card shadow-raised ring-1 ring-foreground/15'
												: 'bg-foreground/25 group-hover:scale-125 group-hover:bg-foreground/45'
										]}
										style:width="{b.width}px"
										style:height="{b.height}px"
									></span>
								</button>
							{/snippet}
						</Tooltip>
					</li>
				{/each}
			</ul>
		{/each}
	</TooltipGroup>
</nav>
