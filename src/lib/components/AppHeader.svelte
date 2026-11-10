<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import { Breadcrumb, cn, NavItem } from '@latitudelabs/design-system';
	import Logo from './Logo.svelte';
	import ProgressiveBlur from './ProgressiveBlur.svelte';

	type Crumb = { label: string; href?: string };
	/**
	 * Workspace pages (no `crumbs`): the logo on the left and the app nav, with the current page selected.
	 * Inside a project: pass `crumbs` for "Projects / name" and no nav.
	 */
	let {
		crumbs,
		end,
		class: className
	}: {
		crumbs?: Crumb[];
		/** Inside a project: what sits on the right, where the nav is on workspace pages. */
		end?: Snippet;
		class?: string;
	} = $props();

	const nav = [
		{ label: 'Projects', href: '/' },
		{ label: 'Assets', href: '/assets' },
		{ label: 'Settings', href: '/settings' }
	];
	const isCurrent = (href?: string) => href !== undefined && page.url.pathname === href;
</script>

<!-- Sticky by default; pages with their own scroll area pass a class to overlay it instead. -->
<header class={cn('sticky top-0 z-20 flex items-center justify-between px-8 py-8', className)}>
	<!-- Content scrolling under the header blurs, most at the top edge, clear at the bottom. -->
	<ProgressiveBlur class="-z-10" />
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
				<NavItem href={item.href} current={isCurrent(item.href)}>{item.label}</NavItem>
			{/each}
		{:else}
			{@render end?.()}
		{/if}
	</nav>
</header>
