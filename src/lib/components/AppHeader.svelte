<script lang="ts">
	import { page } from '$app/state';
	import { Breadcrumb, Button, cn } from '@latitudelabs/design-system';
	import { newProject } from '#lib/new-project.js';
	import Logo from './Logo.svelte';

	type Crumb = { label: string; href?: string };
	/**
	 * Workspace pages (no `crumbs`): the logo on the left and the app nav, with the current page selected.
	 * Inside a project: pass `crumbs` for "Projects / name" and no nav.
	 */
	let { crumbs, class: className }: { crumbs?: Crumb[]; class?: string } = $props();

	const nav = [
		{ label: 'New', onclick: () => newProject() },
		{ label: 'Projects', href: '/' },
		{ label: 'Assets', href: '/assets' },
		{ label: 'Settings', href: '/settings' }
	];
	const isCurrent = (href?: string) => href !== undefined && page.url.pathname === href;

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
	{#if crumbs}
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
	{:else}
		<a href="/" class="rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
			<Logo class="h-14 w-auto" />
		</a>
	{/if}
	<!-- Fixed height (one button tall) so the left side sits at the same spot with or without nav items. -->
	<nav class="flex h-9 items-center gap-1" aria-label="App">
		{#if !crumbs}
			{#each nav as item (item.label)}
				{@const current = isCurrent(item.href)}
				<Button
					variant="ghost"
					href={item.href}
					onclick={item.onclick}
					aria-current={current ? 'page' : undefined}
					class={['text-title', current ? 'text-foreground' : 'text-muted-foreground']}
				>
					{item.label}
				</Button>
			{/each}
		{/if}
	</nav>
</header>
