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
					component: `Lumi introduces herself and Iris in three steps over the projects page, on someone's first visit
(and after restarting onboarding): her orb leads, her line types out, and a small looping scene shows what she
describes (ask → cards → cards update). Skip, Escape or Let's go close it, and her welcome is waiting underneath.
Arrow keys and Enter move between steps.`
				}
			}
		},
		args: { onclose: () => console.info('[intro] closed') }
	});
</script>

<Story name="Intro" />
