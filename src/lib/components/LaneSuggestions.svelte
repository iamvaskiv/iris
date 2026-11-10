<script lang="ts">
	import { ArrowRight } from '@latitudelabs/design-system/icons';
	import { cubicOut } from 'svelte/easing';
	import { fly } from 'svelte/transition';

	type Props = {
		/** Next steps, written as the user's request. */
		suggestions: string[];
		/** The lane's name, for the group's label. */
		topic: string;
		/** Changes when the focused lane does: the steps slide out and the new lane's slide in. */
		key?: string;
		onselect?: (suggestion: string) => void;
		disabled?: boolean;
	};

	let { suggestions, topic, key = topic, onselect, disabled = false }: Props = $props();

	/**
	 * The focused lane's next steps, above Lumi's dock and as wide as it: a row of slides, one step each on one line,
	 * that scrolls sideways and snaps to each. Slides shrink a little as they near either edge (and the row's edges
	 * softly fade) so none looks cut off. When the focused lane changes, its steps leave and the new ones rise in one
	 * after another.
	 */
	let row = $state<HTMLElement>();
	let atStart = $state(true);
	let atEnd = $state(true);

	function measure() {
		if (!row) return;
		atStart = row.scrollLeft <= 1;
		atEnd = row.scrollLeft + row.clientWidth >= row.scrollWidth - 1;
	}
	$effect(() => {
		if (!row) return;
		const observer = new ResizeObserver(measure);
		observer.observe(row);
		return () => observer.disconnect();
	});
	// A new lane's steps start from the first one.
	$effect(() => {
		void key;
		row?.scrollTo({ left: 0 });
		measure();
	});

	/** The wheel scrolls the row sideways too (most mice only have a vertical wheel). */
	function onwheel(e: WheelEvent) {
		if (!row || Math.abs(e.deltaX) > Math.abs(e.deltaY) || (atStart && atEnd)) return;
		e.preventDefault();
		row.scrollBy({ left: e.deltaY, behavior: 'smooth' });
	}
</script>

{#if suggestions.length}
	<!-- Keyed by lane: the old steps fade out where they are while the new ones rise in. -->
	<div class="grid grid-cols-1">
		{#key key}
			<div
				role="group"
				aria-label="Next steps for {topic}"
				class="col-start-1 row-start-1 min-w-0"
				out:fly={{ y: 8, duration: 160 }}
			>
				<ul
					bind:this={row}
					onscroll={measure}
					{onwheel}
					class="slides flex snap-x snap-mandatory [scrollbar-width:none] gap-2 overflow-x-auto py-2"
					style:--fade-start={atStart ? '0px' : '20px'}
					style:--fade-end={atEnd ? '0px' : '20px'}
				>
					{#each suggestions as suggestion, i (suggestion)}
						<li
							class="slide max-w-full shrink-0 snap-start"
							in:fly={{ y: 16, duration: 320, delay: 60 + i * 50, easing: cubicOut }}
						>
							<button
								type="button"
								{disabled}
								class="group flex h-10 max-w-full items-center gap-2 rounded-full bg-card px-4 text-left text-body whitespace-nowrap shadow-raised transition-[translate,box-shadow] outline-none hover:-translate-y-0.5 focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
								onclick={() => onselect?.(suggestion)}
							>
								<span class="min-w-0 truncate">{suggestion}</span>
								<ArrowRight
									class="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
									aria-hidden="true"
								/>
							</button>
						</li>
					{/each}
				</ul>
			</div>
		{/key}
	</div>
{/if}

<style>
	/* The row's edges fade out (a narrow strip) where there's more to scroll to, so a slide passing the edge softens
	   rather than being sliced. */
	.slides {
		mask-image: linear-gradient(
			to right,
			transparent 0,
			#000 var(--fade-start) /* audit-ignore: a mask's alpha, not a colour anyone sees */,
			#000 calc(100% - var(--fade-end)) /* audit-ignore: a mask's alpha, not a colour anyone sees */,
			transparent 100%
		);
	}
	/* Slides ease back a little as they near either edge of the row, and come forward as they reach the middle (where
	   scroll-driven animations are supported). They stay solid: see-through pills over the cards read as grey. */
	@supports (animation-timeline: view()) {
		@media (prefers-reduced-motion: no-preference) {
			.slide {
				animation: slide-edge linear both;
				animation-timeline: view(inline);
			}
		}
	}
	@keyframes slide-edge {
		0% {
			scale: 0.9;
		}
		22%,
		78% {
			scale: 1;
		}
		100% {
			scale: 0.9;
		}
	}
</style>
