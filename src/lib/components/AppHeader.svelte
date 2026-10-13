<script lang="ts">
	import { Breadcrumb, Button, cn } from '@latitudelabs/design-system';

	type Crumb = { label: string; href?: string };
	type NavItem = { label: string; href?: string; onclick?: () => void };
	let { crumbs, nav = [], class: className }: { crumbs: Crumb[]; nav?: NavItem[]; class?: string } = $props();

	// Progressive blur: stacked backdrop blurs, each masked to fade out sooner than the last, so content scrolling
	// under the header is most blurred at the top edge and clear at the bottom. No background colour.
	// `solid` is where a layer is at full strength, `until` where it has faded out (both % of header height).
	const layers = [
		{ blur: 1, solid: 60, until: 100 },
		{ blur: 2, solid: 50, until: 90 },
		{ blur: 4, solid: 40, until: 80 },
		{ blur: 8, solid: 30, until: 70 }
	];
</script>

<!-- Sticky by default; pages with their own scroll area pass a class to overlay it instead. -->
<header class={cn('sticky top-0 z-20 flex items-center justify-between px-8 py-8', className)}>
	<div class="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
		{#each layers as layer (layer.blur)}
			<div
				class="absolute inset-0"
				style:backdrop-filter="blur({layer.blur}px)"
				style:-webkit-backdrop-filter="blur({layer.blur}px)"
				style:mask-image="linear-gradient(to bottom, black {layer.solid}%, transparent {layer.until}%)"
			></div>
		{/each}
	</div>
	<Breadcrumb.Root>
		<Breadcrumb.List>
			{#each crumbs as crumb, i (i)}
				{#if i > 0}<Breadcrumb.Separator>/</Breadcrumb.Separator>{/if}
				<Breadcrumb.Item>
					{#if crumb.href}
						<Breadcrumb.Link href={crumb.href}>{crumb.label}</Breadcrumb.Link>
					{:else}
						<Breadcrumb.Page>{crumb.label}</Breadcrumb.Page>
					{/if}
				</Breadcrumb.Item>
			{/each}
		</Breadcrumb.List>
	</Breadcrumb.Root>
	<!-- Fixed height (one button tall) so the breadcrumb sits at the same spot with or without nav items. -->
	<nav class="flex h-9 items-center gap-1" aria-label="App">
		{#each nav as item (item.label)}
			<Button variant="ghost" href={item.href} onclick={item.onclick} class="text-title text-muted-foreground">
				{item.label}
			</Button>
		{/each}
	</nav>
</header>
