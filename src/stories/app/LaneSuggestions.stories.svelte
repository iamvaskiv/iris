<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import LaneSuggestions from '#lib/components/LaneSuggestions.svelte';

	const { Story } = defineMeta({
		title: 'App/Lane suggestions',
		component: LaneSuggestions,
		tags: ['autodocs'],
		parameters: {
			docs: {
				description: {
					component: `The focused lane's next steps (experimental topic lanes), written as the user's request,
above Lumi's dock: a row of slides, one step each, that scrolls sideways (wheel too) and snaps to each. The row's edges
fade and slides ease back as they near them, so none looks cut off; when the focused lane changes, its steps leave and
the new lane's rise in one after another. Clicking a step sends it to Lumi. Lumi writes them after each message (\`src/lib/server/suggestions.ts\`), for lanes that
are new, changed, or whose suggestions have all been asked; there are no built-in ones. Ones already asked aren't
offered again. Disabled while Lumi is thinking.`
				}
			}
		},
		args: {
			topic: 'Videos',
			onselect: (s: string) => console.info('[Lane suggestions] send', s)
		}
	});
</script>

<Story
	name="One video"
	args={{ suggestions: ['What will people think about it?', 'Analyse video'] }}
/>

<Story
	name="Several videos"
	args={{
		suggestions: [
			'Which one did viewers like more?',
			'Compare these videos',
			'Test it with an audience'
		]
	}}
/>

<Story name="While Lumi thinks" args={{ suggestions: ['Analyse video'], disabled: true }} />
