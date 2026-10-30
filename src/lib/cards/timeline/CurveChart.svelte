<script lang="ts">
	/**
	 * Smoothed curves along a video (paths in a 1000 × 100 box, from curve.ts). One curve with `fill` gets a soft area
	 * under its line; several (one per source) are lines in their own colours, laid over each other. `midline` draws a
	 * neutral line through the middle (sentiment). With `onseek`, clicking goes to that moment.
	 */
	let {
		curves,
		label,
		duration,
		midline = false,
		onseek
	}: {
		curves: ({ paths: { line: string; area: string }; stroke?: string; fill?: boolean } | null)[];
		label: string;
		duration: number;
		midline?: boolean;
		onseek?: (time: number) => void;
	} = $props();

	/** Unique per chart, for the fill's gradient id. */
	const uid = $props.id();

	function onclick(e: MouseEvent) {
		if (!onseek) return;
		const box = (e.currentTarget as HTMLElement).getBoundingClientRect();
		onseek(Math.min(1, Math.max(0, (e.clientX - box.left) / box.width)) * duration);
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class={['h-full flex-1 py-2 text-foreground', onseek && 'cursor-pointer']} {onclick}>
	<svg
		viewBox="0 0 1000 100"
		preserveAspectRatio="none"
		class="size-full overflow-visible"
		role="img"
		aria-label={label}
	>
		<defs>
			<linearGradient id="{uid}-fill" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0" stop-color="currentColor" stop-opacity="0.35" />
				<stop offset="1" stop-color="currentColor" stop-opacity="0" />
			</linearGradient>
		</defs>
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
				{#if c.fill}<path d={c.paths.area} fill="url(#{uid}-fill)" />{/if}
				<path
					d={c.paths.line}
					fill="none"
					class={c.stroke}
					stroke={c.stroke ? undefined : 'currentColor'}
					stroke-width={c.fill ? 1.5 : 2}
					vector-effect="non-scaling-stroke"
				/>
			{/if}
		{/each}
	</svg>
</div>
