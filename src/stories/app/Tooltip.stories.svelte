<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import type { ComponentProps } from 'svelte';
	import { Button } from '@latitudelabs/design-system';
	import Tooltip from '#lib/components/Tooltip.svelte';
	import TooltipGroup from '#lib/components/TooltipGroup.svelte';

	const { Story } = defineMeta({
		title: 'App/Tooltip',
		component: Tooltip,
		tags: ['autodocs'],
		parameters: {
			docs: {
				description: {
					component: `A short label for a control, shown on hover (after a short delay) or keyboard focus; Escape closes
it. Wrap tooltips in a \`TooltipGroup\`: once one has opened, its neighbours open straight away. Built on bits-ui, like
the design system's Popover, and styled with its tokens.`
				}
			}
		},
		args: { text: 'Shrooms quiz', side: 'top' }
	});
</script>

{#snippet button(args: Omit<ComponentProps<typeof Tooltip>, 'children'>)}
	<TooltipGroup>
		<Tooltip {...args}>
			{#snippet children({ props })}<Button {...props} variant="secondary">Hover me</Button
				>{/snippet}
		</Tooltip>
	</TooltipGroup>
{/snippet}

<Story name="Top" template={button} />

<Story name="Right" args={{ side: 'right' }} template={button} />

<Story name="Group">
	{#snippet template()}
		<TooltipGroup>
			<div class="flex gap-2">
				{#each ['Video', 'Themes', 'Viewer insights'] as text (text)}
					<Tooltip {text}>
						{#snippet children({ props })}<Button {...props} variant="secondary">{text}</Button
							>{/snippet}
					</Tooltip>
				{/each}
			</div>
		</TooltipGroup>
	{/snippet}
</Story>
