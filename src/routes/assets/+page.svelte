<script lang="ts">
	import { Badge, Card, Separator } from '@latitudelabs/design-system';
	import { Icon, Video } from '@latitudelabs/design-system/icons';
	import AppHeader from '#lib/components/AppHeader.svelte';
	import { timecode } from '#lib/cards/format.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const statusLabel = {
		uploading: 'Uploading…',
		analysing: 'Analysing…',
		analysed: 'Analysed',
		'not-analysed': 'Not analysed',
		failed: 'Failed'
	} as const;
	const date = (iso?: string) =>
		iso
			? new Date(iso).toLocaleDateString(undefined, {
					day: 'numeric',
					month: 'short',
					year: 'numeric'
				})
			: '';
</script>

<svelte:head><title>Assets · Jinn</title></svelte:head>

<div class="min-h-dvh bg-background">
	<AppHeader />

	<main class="mx-auto mt-12 flex w-full max-w-[970px] flex-col gap-4 px-4 pb-16">
		<h1 class="text-heading">Assets</h1>

		{#if data.assets.length === 0}
			<Card.Root>
				<Card.Content>
					<div
						class="flex flex-col items-center gap-3 rounded-sm bg-background px-8 py-12 text-center"
					>
						<Icon icon={Video} size="lg" class="text-muted-foreground" />
						<p class="text-title">No videos yet</p>
						<p class="text-caption text-muted-foreground">
							Drop a video onto a project to upload it. It will show up here.
						</p>
					</div>
				</Card.Content>
			</Card.Root>
		{:else}
			<ul class="flex flex-col">
				{#each data.assets as asset, i (asset.id)}
					{#if i > 0}<li aria-hidden="true"><Separator class="my-3" /></li>{/if}
					<li class="flex items-center gap-4">
						{#if asset.thumbnail}
							<img
								src={asset.thumbnail}
								alt=""
								class="aspect-video w-28 shrink-0 rounded-sm object-cover"
							/>
						{:else}
							<div
								class="flex aspect-video w-28 shrink-0 items-center justify-center rounded-sm bg-muted"
							>
								<Icon icon={Video} class="text-muted-foreground" />
							</div>
						{/if}
						<div class="flex min-w-0 flex-1 flex-col gap-1">
							<p class="truncate text-body font-medium" title={asset.name}>{asset.name}</p>
							<p class="text-caption text-muted-foreground">
								{[asset.duration ? timecode(asset.duration) : '', date(asset.createdAt)]
									.filter(Boolean)
									.join(' · ')}
							</p>
							<p class="truncate text-caption text-muted-foreground">
								{#if asset.projects.length}
									Used in
									{#each asset.projects as p, j (p.id)}
										{j > 0 ? ', ' : ' '}<a
											href="/projects/{p.id}"
											class="text-foreground underline-offset-4 hover:underline">{p.name}</a
										>
									{/each}
								{:else}
									Not used in any project
								{/if}
							</p>
						</div>
						<Badge variant={asset.status === 'analysed' ? 'secondary' : 'outline'}
							>{statusLabel[asset.status]}</Badge
						>
					</li>
				{/each}
			</ul>
		{/if}
	</main>
</div>
