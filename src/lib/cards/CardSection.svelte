<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Button } from '@latitudelabs/design-system';
	import { ChevronDown, ChevronLeft, ChevronRight } from '@latitudelabs/design-system/icons';

	/** A collapsible card section whose items sit in one row that scrolls sideways when it overflows. */
	let { title, count, children }: { title: string; count?: number; children: Snippet } = $props();

	let open = $state(true);
	let row = $state<HTMLUListElement>();
	let atStart = $state(true);
	let atEnd = $state(true);
	const id = $props.id();

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

	const page = (dir: 1 | -1) =>
		row?.scrollBy({ left: dir * row.clientWidth * 0.8, behavior: 'smooth' });
</script>

<section class="flex flex-col gap-2">
	<div class="flex items-center justify-between gap-2">
		<button
			type="button"
			aria-expanded={open}
			aria-controls={id}
			onclick={() => (open = !open)}
			class="flex items-center gap-1 rounded-sm text-body text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
		>
			{title}{#if count !== undefined}<span>&nbsp;· {count}</span>{/if}
			<ChevronDown class="size-4 transition-transform {open ? '' : '-rotate-90'}" />
		</button>
		{#if open && !(atStart && atEnd)}
			<div class="flex gap-1">
				<Button
					variant="ghost"
					size="icon-xs"
					aria-label="Scroll {title} back"
					disabled={atStart}
					onclick={() => page(-1)}
				>
					<ChevronLeft />
				</Button>
				<Button
					variant="ghost"
					size="icon-xs"
					aria-label="Scroll {title} forward"
					disabled={atEnd}
					onclick={() => page(1)}
				>
					<ChevronRight />
				</Button>
			</div>
		{/if}
	</div>
	{#if open}
		<ul {id} bind:this={row} onscroll={measure} class="flex snap-x gap-3 overflow-x-auto pb-1">
			{@render children()}
		</ul>
	{/if}
</section>
