<script lang="ts">
	import { askable, fractionAlong } from '#lib/ask-lumi.js';
	/**
	 * Smoothed curves along a video (paths in a 1000 × 100 box, from curve.ts). One curve with `fill` gets a soft area
	 * under its line, in its `color` (a text-* class); several (one per source) are lines in their own colours, laid
	 * over each other. `midline` draws a neutral line through the middle (sentiment): a filled curve there is green
	 * above it and red below, its area reaching to the line. With `onseek`, clicking goes to that moment.
	 */
	let {
		curves,
		label,
		duration,
		midline = false,
		ask,
		onseek
	}: {
		curves: ({
			paths: { line: string; area: string };
			stroke?: string;
			fill?: boolean;
			/** A filled curve's colour, as a text-* class (the foreground's by default). */
			color?: string;
		} | null)[];
		label: string;
		duration: number;
		midline?: boolean;
		/** The question for Lumi about the moment under the pointer (see ask-lumi.ts). */
		ask?: (time: number) => string | null | undefined;
		onseek?: (time: number) => void;
	} = $props();

	/** Unique per chart, for the gradients' ids. */
	const uid = $props.id();
	/** A curve's area down to the midline instead of the bottom, for a diverging (sentiment) chart. */
	const toMidline = (line: string) => `${line}L1000,50L0,50Z`;

	function onclick(e: MouseEvent) {
		if (!onseek) return;
		onseek(fractionAlong(e, e.currentTarget as HTMLElement) * duration);
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div
	class={['h-full flex-1 py-2 text-foreground', onseek && 'cursor-pointer']}
	{onclick}
	{@attach askable(ask && ((e, el) => ask(fractionAlong(e, el) * duration)))}
>
	<svg
		viewBox="0 0 1000 100"
		preserveAspectRatio="none"
		class="size-full overflow-visible"
		role="img"
		aria-label={label}
	>
		{#if midline}
			<line
				x1="0"
				y1="50"
				x2="1000"
				y2="50"
				class="stroke-border"
				vector-effect="non-scaling-stroke"
			/>
		{/if}
		{#each curves as c, i (i)}
			{#if c}
				{#if c.fill && midline}
					<!-- Green above the midline, red below: the area fades towards the line, the line is solid. -->
					<defs>
						<linearGradient
							id="{uid}-{i}-area"
							gradientUnits="userSpaceOnUse"
							x1="0"
							y1="0"
							x2="0"
							y2="100"
						>
							<stop
								offset="0"
								class="text-category-green"
								stop-color="currentColor"
								stop-opacity="0.5"
							/>
							<stop
								offset="0.5"
								class="text-category-green"
								stop-color="currentColor"
								stop-opacity="0.05"
							/>
							<stop
								offset="0.5"
								class="text-chart-red"
								stop-color="currentColor"
								stop-opacity="0.05"
							/>
							<stop
								offset="1"
								class="text-chart-red"
								stop-color="currentColor"
								stop-opacity="0.5"
							/>
						</linearGradient>
						<linearGradient
							id="{uid}-{i}-line"
							gradientUnits="userSpaceOnUse"
							x1="0"
							y1="0"
							x2="0"
							y2="100"
						>
							<stop offset="0.5" class="text-category-green" stop-color="currentColor" />
							<stop offset="0.5" class="text-chart-red" stop-color="currentColor" />
						</linearGradient>
					</defs>
					<path d={toMidline(c.paths.line)} fill="url(#{uid}-{i}-area)" />
					<path
						d={c.paths.line}
						fill="none"
						stroke="url(#{uid}-{i}-line)"
						stroke-width="2"
						vector-effect="non-scaling-stroke"
					/>
				{:else if c.fill}
					<g class={c.color ?? 'text-foreground'}>
						<defs>
							<linearGradient id="{uid}-{i}-area" x1="0" y1="0" x2="0" y2="1">
								<stop offset="0" stop-color="currentColor" stop-opacity="0.4" />
								<stop offset="1" stop-color="currentColor" stop-opacity="0" />
							</linearGradient>
						</defs>
						<path d={c.paths.area} fill="url(#{uid}-{i}-area)" />
						<path
							d={c.paths.line}
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							vector-effect="non-scaling-stroke"
						/>
					</g>
				{:else}
					<path
						d={c.paths.line}
						fill="none"
						class={c.stroke}
						stroke={c.stroke ? undefined : 'currentColor'}
						stroke-width="2"
						vector-effect="non-scaling-stroke"
					/>
				{/if}
			{/if}
		{/each}
	</svg>
</div>
