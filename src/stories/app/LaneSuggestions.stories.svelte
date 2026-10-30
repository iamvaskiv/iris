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
					component: `Next steps after a lane's last card (experimental topic lanes), written as the user's request:
clicking one sends it to Lumi. Lumi writes 2–3 for each lane a turn touched (\`suggest_next\`); a lane without any gets
rule-based ones from its cards (\`src/lib/cards/suggestions.ts\`). Ones already asked aren't offered again. Disabled
while Lumi is thinking.`
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
