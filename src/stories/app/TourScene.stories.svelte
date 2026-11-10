<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import TourScene from '#lib/components/TourScene.svelte';

	const { Story } = defineMeta({
		title: 'App/Tour scenes',
		component: TourScene,
		tags: ['autodocs'],
		parameters: {
			docs: {
				description: {
					component: `The looping scenes under Lumi's dock during the first-visit tour on the projects page
(TOUR_STEPS in src/lib/intro.ts), one per thing Iris does.`
				}
			}
		}
	});
</script>

<Story name="1 · Video analysis" args={{ step: 0 }} />
<Story name="2 · Viewer studies" args={{ step: 1 }} />
<Story name="3 · Insights" args={{ step: 2 }} />
<Story name="4 · Comparison" args={{ step: 3 }} />
