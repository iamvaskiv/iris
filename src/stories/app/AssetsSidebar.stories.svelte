<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import AssetsSidebar from '#lib/components/AssetsSidebar.svelte';
	import type { ProjectAsset } from '#lib/assets.js';

	// No thumbnails in Storybook (they're signed Lumiere URLs), so each shows the placeholder.
	const assets: ProjectAsset[] = [
		{
			id: 'a',
			name: 'A Man Called Otto – Official Trailer (HD)',
			duration: 159,
			status: 'analysed'
		},
		{ id: 'b', name: 'Inside Out 2 – 14s clip', duration: 14, status: 'analysed' },
		{ id: 'c', name: 'Women Talking – short cut', duration: 62, status: 'analysing' }
	];

	const { Story } = defineMeta({
		title: 'App/Assets sidebar',
		component: AssetsSidebar,
		tags: ['autodocs'],
		parameters: {
			layout: 'fullscreen',
			docs: {
				description: {
					component: `A project's videos, in a pane that opens from the **Assets** pull tab on the window's right edge (the
pane slides in over the page; a click outside, or Escape, closes it). Each row shows the thumbnail, name, length,
analysis status and how many cards show it; clicking brings the first of those cards into focus. A video no card shows yet
links to Assets.`
				},
				story: { inline: false, iframeHeight: 560 }
			}
		},
		args: {
			assets,
			usage: { a: 2, b: 1 },
			onselect: (id: string) => console.info('[Assets] select', id),
			onclose: () => console.info('[Assets] close')
		}
	});
</script>

{#snippet pane(args: Omit<import('svelte').ComponentProps<typeof AssetsSidebar>, 'ref'>)}
	<div class="flex h-[560px] justify-end bg-background p-2">
		<AssetsSidebar {...args} class="w-80 rounded-xl" />
	</div>
{/snippet}

<Story name="Focused card shows one video" args={{ current: ['a'] }} template={pane} />

<Story name="No videos yet" args={{ assets: [], usage: {} }} template={pane} />
