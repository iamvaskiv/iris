<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import SourcesCard from '#lib/cards/SourcesCard.svelte';
	import CardFrame from './CardFrame.svelte';
	import { fixture } from '../fixtures';

	const { Story } = defineMeta({
		title: 'Cards/Sources',
		tags: ['autodocs'],
		parameters: {
			docs: {
				description: {
					component: `One video's viewer data compared across its sources: Lumiere (real viewers) and each of the project's
studies that shows the video and has sample results, named after the study. A row per source in its colour, with its
key numbers (viewers, rating, positive and negative shares, comments); then along the video, under its scenes, every
source's sentiment and rating curves laid over each other on one scale, and a lane of comments per source. Data from
\`src/lib/server/sources.ts\`; the studies come from the project's other cards (\`studies\` here).`
				}
			}
		}
	});

	const card = fixture('Inside Out 2 Reception · Real vs sample viewers');
	const study = fixture('Inside Out 2 Reception · Inside Out 2 trailer study');
</script>

<Story name="Real vs sample">
	<CardFrame wide><SourcesCard {card} studies={[study]} /></CardFrame>
</Story>

<Story name="One source">
	<CardFrame wide><SourcesCard {card} studies={[]} /></CardFrame>
</Story>
