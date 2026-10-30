<script lang="ts">
	import { Button } from '@latitudelabs/design-system';
	import { ArrowRight } from '@latitudelabs/design-system/icons';

	type Props = {
		/** Next steps, written as the user's request. */
		suggestions: string[];
		/** The lane's name, for the group's label. */
		topic: string;
		onselect?: (suggestion: string) => void;
		disabled?: boolean;
	};

	let { suggestions, topic, onselect, disabled = false }: Props = $props();
</script>

<!-- Next steps after a lane's last card (experimental lanes): pills stacked down, each sent to Lumi when clicked. -->
{#if suggestions.length}
	<div
		role="group"
		aria-label="Next steps for {topic}"
		class="flex shrink-0 flex-col items-start gap-2"
	>
		{#each suggestions as suggestion (suggestion)}
			<Button
				variant="ghost"
				size="lg"
				{disabled}
				class="h-12 gap-4 rounded-full bg-card px-5 text-body-lg font-normal shadow-hairline"
				onclick={() => onselect?.(suggestion)}
			>
				{suggestion}
				<ArrowRight data-icon="inline-end" class="text-muted-foreground" />
			</Button>
		{/each}
	</div>
{/if}
