<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import HowIrisWorks from '#lib/components/HowIrisWorks.svelte';

	const { Story } = defineMeta({
		title: 'App/How Iris works',
		component: HowIrisWorks,
		parameters: {
			layout: 'fullscreen',
			docs: {
				description: {
					component: `The three-step intro over the projects page on someone's first visit (and after restarting
onboarding): Ask → Lumi answers in cards → cards keep updating, each with a small looping animation. Skip, Escape or
Get started close it, and Lumi's welcome is waiting underneath. Arrow keys move between steps.`
				}
			}
		},
		args: { onclose: () => console.info('[intro] closed') }
	});
</script>

<Story name="Intro" />
