<script lang="ts">
	import { Tooltip } from 'bits-ui';
	import type { Snippet } from 'svelte';

	type Props = {
		/** What the tooltip says: a short label, a few words. */
		text: string;
		/** Which side of the trigger it opens on (it flips if there's no room). */
		side?: 'top' | 'right' | 'bottom' | 'left';
		/**
		 * Whether the tooltip also becomes the trigger's accessible description. Turn it off when the trigger's own
		 * label already says the same thing, so screen readers don't read it twice.
		 */
		describes?: boolean;
		/** The trigger: spread `props` on the element (a button or link) the tooltip belongs to. */
		children: Snippet<[{ props: Record<string, unknown> }]>;
	};
	let { text, side = 'top', describes = true, children }: Props = $props();
</script>

<!-- A short label for a control, on hover (after the group's delay) or keyboard focus; Escape closes it. Built on
     bits-ui, like the design system's Popover, and styled with its tokens: a candidate for the design system. Needs
     a TooltipGroup above it. -->
<Tooltip.Root>
	<Tooltip.Trigger>
		{#snippet child({ props })}
			{@render children({ props: describes ? props : { ...props, 'aria-describedby': undefined } })}
		{/snippet}
	</Tooltip.Trigger>
	<Tooltip.Portal>
		<Tooltip.Content
			{side}
			sideOffset={8}
			collisionPadding={8}
			class="z-50 max-w-64 animate-in rounded-sm bg-primary px-3 py-2 text-body-sm text-primary-foreground shadow-raised duration-150 fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-1 data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1 data-[side=top]:slide-in-from-bottom-1"
		>
			{text}
		</Tooltip.Content>
	</Tooltip.Portal>
</Tooltip.Root>
