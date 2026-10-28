<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button } from '@latitudelabs/design-system';
	import { ArrowRight, Icon, Video, X } from '@latitudelabs/design-system/icons';
	import { assetStatusLabel, type ProjectAsset } from '#lib/assets.js';
	import { timecode } from '#lib/cards/format.js';
	import type { ClassValue } from 'svelte/elements';

	type Props = {
		assets: ProjectAsset[];
		/** How many cards show each video (by asset id); 0 or missing: none. */
		usage: Record<string, number>;
		/** Videos the card in focus shows: their rows are marked current (for screen readers; no fill). */
		current?: string[];
		/** Brings the first card showing a video into focus (the pane stays open). */
		onselect: (id: string) => void;
		onclose: () => void;
		/** Bindable: the pane, so the page can move focus into it when it opens. */
		ref?: HTMLElement | null;
		class?: ClassValue;
	};
	let {
		assets,
		usage,
		current = [],
		onselect,
		onclose,
		ref = $bindable(null),
		class: className
	}: Props = $props();

	const meta = (a: ProjectAsset) =>
		[a.duration ? timecode(a.duration) : '', assetStatusLabel[a.status]]
			.filter(Boolean)
			.join(' · ');
	const usedIn = (n = 0) => (n ? `In ${n} ${n === 1 ? 'card' : 'cards'}` : 'Not in a card yet');
</script>

{#snippet row(asset: ProjectAsset)}
	{#if asset.thumbnail}
		<img src={asset.thumbnail} alt="" class="aspect-video w-24 shrink-0 rounded-sm object-cover" />
	{:else}
		<span class="flex aspect-video w-24 shrink-0 items-center justify-center rounded-sm bg-muted">
			<Icon icon={Video} class="text-muted-foreground" />
		</span>
	{/if}
	<span class="flex min-w-0 flex-col gap-1">
		<span class="line-clamp-2 text-body font-medium">{asset.name}</span>
		<span class="text-caption text-muted-foreground">{meta(asset)}</span>
		<span class="text-caption text-muted-foreground">{usedIn(usage[asset.id])}</span>
	</span>
{/snippet}

<!-- The project's videos, in a pane on the right. Each row brings the card showing that video into focus; a video no
     card shows yet links to Assets. Rows have no fill of their own, only on hover. Not in the design system yet. -->
<aside
	bind:this={ref}
	tabindex="-1"
	aria-labelledby="assets-sidebar-title"
	class={['flex flex-col gap-4 bg-card p-4 shadow-raised outline-none', className]}
>
	<header class="flex items-center justify-between gap-2 pl-2">
		<h2 id="assets-sidebar-title" class="text-title">Assets used in this project</h2>
		<Button variant="ghost" size="icon-sm" aria-label="Close assets" onclick={onclose}>
			<X />
		</Button>
	</header>

	{#if assets.length}
		<ul class="-mx-2 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-2">
			{#each assets as asset (asset.id)}
				{@const isCurrent = current.includes(asset.id)}
				<li>
					{#if usage[asset.id]}
						<button
							type="button"
							class="flex w-full items-start gap-3 rounded-md p-2 text-left transition-colors outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50"
							aria-current={isCurrent ? 'true' : undefined}
							onclick={() => onselect(asset.id)}
						>
							{@render row(asset)}
						</button>
					{:else}
						<a
							href={resolve('/assets')}
							class="flex w-full items-start gap-3 rounded-md p-2 transition-colors outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50"
						>
							{@render row(asset)}
						</a>
					{/if}
				</li>
			{/each}
		</ul>
	{:else}
		<p class="flex-1 px-2 text-body text-muted-foreground">
			Here you'll find all the videos and documents used in this project.
		</p>
	{/if}

	<a
		href={resolve('/assets')}
		class="flex items-center gap-2 self-start rounded-sm px-2 text-body text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
	>
		All assets <Icon icon={ArrowRight} size="sm" />
	</a>
</aside>
