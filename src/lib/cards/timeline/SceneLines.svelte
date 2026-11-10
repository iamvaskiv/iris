<script lang="ts">
	import { along } from '../curve';

	/**
	 * The scene boundaries (and, with `time`, the playhead) running down through a column of lanes. Sits over the lanes
	 * column of its parent, which must be positioned and isolated (so the lines stay under Lumi's dock); the labels
	 * column on the left is w-48 (pass `class` with another left offset for a wider one).
	 */
	let {
		segments,
		duration,
		time,
		ghost,
		class: className = 'left-48'
	}: {
		segments: { start: number }[];
		duration: number;
		time?: number;
		/** Where the video really is while `time` shows a hovered moment: a faint line. */
		ghost?: number;
		/** The lanes column's left offset (the labels' width). */
		class?: string;
	} = $props();
</script>

<div class={['pointer-events-none absolute inset-y-0 right-0 z-10', className]} aria-hidden="true">
	{#each segments.slice(1) as s, i (i)}
		<div class="absolute inset-y-0 w-px bg-border" style:left="{along(s.start, duration)}%"></div>
	{/each}
	{#if ghost !== undefined}
		<div
			class="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-foreground/25"
			style:left="{along(ghost, duration)}%"
		></div>
	{/if}
	{#if time !== undefined}
		<div
			class="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-foreground"
			style:left="{along(time, duration)}%"
		></div>
	{/if}
</div>
