<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import GettingStarted from '#lib/components/GettingStarted.svelte';

	const { Story } = defineMeta({
		title: 'App/Getting started',
		component: GettingStarted,
		tags: ['autodocs'],
		parameters: {
			docs: {
				description: {
					component: `The "Getting started" checklist: the first tile on the projects page, and a pill pinned at the
top right of every project page that opens the whole list. Steps tick off as people do them in their own projects;
restarting onboarding clears it.`
				},
				story: { inline: false, iframeHeight: 420 }
			}
		}
	});
</script>

<Story name="Tile, new" args={{ variant: 'tile', checklist: { done: [], dismissed: false } }}>
	{#snippet template(args)}<div class="w-md p-4"><GettingStarted {...args} /></div>{/snippet}
</Story>

<Story
	name="Tile, halfway"
	args={{ variant: 'tile', checklist: { done: ['upload', 'review'], dismissed: false } }}
>
	{#snippet template(args)}<div class="w-md p-4"><GettingStarted {...args} /></div>{/snippet}
</Story>

<Story
	name="Tile, all done"
	args={{
		variant: 'tile',
		checklist: { done: ['upload', 'review', 'ask', 'study', 'feedback'], dismissed: false }
	}}
>
	{#snippet template(args)}<div class="w-md p-4"><GettingStarted {...args} /></div>{/snippet}
</Story>

<Story
	name="Pill (project page)"
	args={{ variant: 'pill', checklist: { done: ['upload', 'review'], dismissed: false } }}
>
	{#snippet template(args)}<div class="flex justify-end p-4">
			<GettingStarted {...args} />
		</div>{/snippet}
</Story>
