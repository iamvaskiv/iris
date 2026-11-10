<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import IntroScene from '#lib/components/IntroScene.svelte';

	const { Story } = defineMeta({
		title: 'App/Intro scenes',
		component: IntroScene,
		tags: ['autodocs'],
		parameters: {
			docs: {
				description: {
					component: `The looping scenes under Lumi's dock during "How Iris works" (src/lib/intro.ts), one per step:
a question typing itself, her cards popping in, a card updating instead of a second one appearing.`
				}
			}
		}
	});
</script>

<Story name="1 · Ask anything" args={{ step: 0 }} />
<Story name="2 · Answers in cards" args={{ step: 1 }} />
<Story name="3 · Cards keep up" args={{ step: 2 }} />
