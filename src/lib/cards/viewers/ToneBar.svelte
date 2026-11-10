<script lang="ts">
	import { cn } from '@latitudelabs/design-system';
	import type { HTMLAttributes } from 'svelte/elements';
	import { TONES, TONE_DOT } from '../viewer';

	/**
	 * How responses split by tone, in the app's bright mark colours (green, grey, red) rather than the design system's
	 * darker text-safe ones: a bar of three segments sized by count, and the counts under it ("Reactions: 67 positive ·
	 * 19 neutral · 12 negative"), each with its colour's dot. Spread attributes (and Ask Lumi) onto the whole.
	 */
	let {
		positive,
		neutral,
		negative,
		label,
		class: className,
		...rest
	}: HTMLAttributes<HTMLDivElement> & {
		positive: number;
		neutral: number;
		negative: number;
		/** Before the counts, e.g. "Reactions:". */
		label?: string;
	} = $props();

	const counts = $derived({ positive, neutral, negative });
</script>

<div class={cn('flex flex-col gap-1.5', className)} {...rest}>
	<div class="flex h-2 gap-1" aria-hidden="true">
		{#each TONES as t (t)}
			{#if counts[t]}<div
					class={['rounded-full', TONE_DOT[t]]}
					style:flex-grow={counts[t]}
				></div>{/if}
		{/each}
	</div>
	<p class="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted-foreground">
		{#if label}<span>{label}</span>{/if}
		{#each TONES as t (t)}
			<span class="flex items-center gap-1.5">
				<span class={['size-2 rounded-full', TONE_DOT[t]]} aria-hidden="true"></span>{counts[t]}
				{t}
			</span>
		{/each}
	</p>
</div>
