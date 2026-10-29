<script lang="ts">
	/**
	 * The edge to drag to resize a column on its left (ARIA's window splitter): drag it, or focus it and use the arrow
	 * keys (Home and End for the narrowest and widest); double-click goes back to `initial`. Sits in the middle of the
	 * 16px gap after the column (place it in the column, which must be positioned); a line shows on hover, focus and
	 * drag. The width is `value`, kept between `min` and `max`.
	 */
	let {
		value = $bindable(),
		min,
		max,
		initial,
		label,
		controls,
		onchange
	}: {
		value: number;
		min: number;
		max: number;
		initial: number;
		label: string;
		/** The id of what it resizes. */
		controls?: string;
		/** After each change, e.g. to remember it. */
		onchange?: (width: number) => void;
	} = $props();

	function set(width: number) {
		value = Math.round(Math.min(max, Math.max(min, width)));
		onchange?.(value);
	}

	let drag: { x: number; width: number } | null = null;
	function onpointerdown(e: PointerEvent) {
		drag = { x: e.clientX, width: value };
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	}
	function onpointermove(e: PointerEvent) {
		if (drag) set(drag.width + e.clientX - drag.x);
	}
	function onkeydown(e: KeyboardEvent) {
		const by = { ArrowLeft: -16, ArrowRight: 16 }[e.key];
		if (e.key === 'Home') set(min);
		else if (e.key === 'End') set(max);
		else if (by) set(value + by);
		else return;
		e.preventDefault();
	}
</script>

<!-- A focusable separator is ARIA's window splitter: interactive, though Svelte doesn't count it as such. -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
<div
	role="separator"
	aria-orientation="vertical"
	aria-label={label}
	aria-controls={controls}
	aria-valuemin={min}
	aria-valuemax={max}
	aria-valuenow={value}
	tabindex="0"
	class="group absolute inset-y-0 -right-3 z-10 flex w-2 cursor-col-resize touch-none justify-center outline-none"
	{onpointerdown}
	{onpointermove}
	onpointerup={() => (drag = null)}
	onpointercancel={() => (drag = null)}
	ondblclick={() => set(initial)}
	{onkeydown}
>
	<div
		class="h-full w-px bg-border opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 group-active:opacity-100 motion-reduce:transition-none"
	></div>
</div>
