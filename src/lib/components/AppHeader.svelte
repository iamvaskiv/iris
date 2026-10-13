<script lang="ts">
	import { Breadcrumb, Button } from '@latitudelabs/design-system';

	type Crumb = { label: string; href?: string };
	type NavItem = { label: string; href?: string; onclick?: () => void };
	let { crumbs, nav = [] }: { crumbs: Crumb[]; nav?: NavItem[] } = $props();
</script>

<header class="flex items-center justify-between px-8 py-8">
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
