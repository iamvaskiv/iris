<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import ComparisonCard from '#lib/cards/ComparisonCard.svelte';
	import CardFrame from './CardFrame.svelte';
	import { fixture } from '../fixtures';

	const { Story } = defineMeta({
		title: 'Cards/Comparison',
		tags: ['autodocs'],
		parameters: {
			docs: {
				description: {
					component: `Two to four videos side by side: rows from the analysis and from audience data, then Lumi's own rows.
The best number in a row is emphasised; empty cells say whether the video isn't analysed or has no viewers. Three or
more videos make the card wide (\`cardSize\` in \`src/lib/cards/registry.ts\`).`
				}
			}
		}
	});
</script>

<Story name="Content and audience">
	<CardFrame
		><ComparisonCard
			card={fixture('Trailer Comparison · Women Talking vs Inside Out 2 trailer')}
		/></CardFrame
	>
</Story>

<Story name="Audience only, three videos (wide)">
	<CardFrame wide
		><ComparisonCard
			card={fixture('Trailer Comparison · Audience Response Comparison')}
		/></CardFrame
	>
</Story>
