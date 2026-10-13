<script lang="ts">
	import { toggleMode } from 'mode-watcher';
	import { Breadcrumb, Button } from '@latitudelabs/design-system';
	import { Moon, Sun } from '@latitudelabs/design-system/icons';

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
	<nav class="flex items-center gap-1" aria-label="App">
		{#each nav as item (item.label)}
			<Button variant="ghost" href={item.href} onclick={item.onclick} class="text-title text-muted-foreground">
				{item.label}
			</Button>
		{/each}
		<Button variant="ghost" size="icon" onclick={toggleMode} aria-label="Toggle theme">
			<Sun class="dark:hidden" />
			<Moon class="hidden dark:block" />
		</Button>
	</nav>
</header>
