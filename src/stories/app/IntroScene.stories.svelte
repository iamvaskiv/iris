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
					component: `The looping scenes under Lumi's dock during "How Iris works", the first time someone opens a
project (INTRO_STEPS in src/lib/intro.ts), one per step:
a question typing itself, her cards popping in, a card updating instead of a second one appearing.`
				}
			}
		}
	});
</script>

<Story name="1 · Ask anything" exportName="Step1AskAnything" args={{ step: 0 }} />
<Story name="2 · Answers in cards" exportName="Step2AnswersInCards" args={{ step: 1 }} />
<Story name="3 · Cards keep up" exportName="Step3CardsKeepUp" args={{ step: 2 }} />
