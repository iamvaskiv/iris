<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import BrandButton from '#lib/components/BrandButton.svelte';

	const { Story } = defineMeta({
		title: 'App/Brand button',
		component: BrandButton,
		tags: ['autodocs'],
		parameters: {
			docs: {
				description: {
					component: `The onboarding's main button (Next, Let's go, Got it), dressed like the Getting started card:
a pastel brand wash with purple text in light mode, the full colours with white text in dark mode. Its colours drift a
little on hover.`
				}
			}
		}
	});
</script>

<Story name="Next">
	{#snippet template()}<div class="p-8"><BrandButton>Next</BrandButton></div>{/snippet}
</Story>
