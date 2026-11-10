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

<Story name="1 · Video analysis" exportName="Step1VideoAnalysis" args={{ step: 1 }} />
<Story name="2 · Viewer studies" exportName="Step2ViewerStudies" args={{ step: 2 }} />
<Story name="3 · Insights" exportName="Step3Insights" args={{ step: 3 }} />
<Story name="4 · Comparison" exportName="Step4Comparison" args={{ step: 4 }} />
