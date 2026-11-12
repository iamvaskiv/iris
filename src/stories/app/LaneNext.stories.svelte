<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import LaneNext from '#lib/components/LaneNext.svelte';
	import { NEW_LANE_STARTERS } from '#lib/cards/suggestions.js';

	const { Story } = defineMeta({
		title: 'App/Lane next',
		component: LaneNext,
		tags: ['autodocs'],
		parameters: {
			docs: {
				description: {
					component: `The empty slot one step past a lane's last card (topic lanes): Lumi's next steps for the topic,
written as the user's request, in Lumi's dock colours. The empty lane below the last one uses it too, for starting something new. Picking a
step sends it to Lumi (only logged here).`
				}
			}
		},
		args: { onselect: (step: string) => console.info('[Lumi] send', step) }
	});
</script>

<Story
	name="After a lane's cards"
	args={{
		label: 'Next steps',
		suggestions: [
			'Why do so many people feel unsure what the film is about?',
			'Which age group is most interested in seeing the film?',
			'What made some viewers feel the trailer was too crowded?'
		]
	}}
/>

<Story
	name="New topic lane"
	args={{
		label: 'Something new',
		suggestions: NEW_LANE_STARTERS
	}}
/>

<Story name="No steps yet" args={{ label: 'Next steps', suggestions: [] }} />

<Story
	name="While Lumi is busy"
	args={{
		label: 'Next steps',
		suggestions: ['Compare the endings', 'What will people think about it?'],
		disabled: true
	}}
/>
