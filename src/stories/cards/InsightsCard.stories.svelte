<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import InsightsCard from '#lib/cards/InsightsCard.svelte';
	import CardFrame from './CardFrame.svelte';
	import { fixture } from '../fixtures';
	import type { Insights } from '#lib/cards/types.js';

	const { Story } = defineMeta({
		title: 'Cards/Insights',
		tags: ['autodocs'],
		parameters: {
			docs: {
				description: {
					component: `What an audience made of a video: views, responses, rating and positive share (\`Stat\`), comment
sentiment (\`SentimentBar\`), answers to on-video questions and the most liked and criticised comments (\`Tile\`s in
\`Card.Section\`s). Data from \`src/lib/server/insights.ts\`.`
				}
			}
		}
	});

	const full = fixture('Inside Out 2 Clip · Trailer 1 viewer insights');
	const data = full.data as Insights;
	const sparse = {
		...full,
		id: 'insights-sparse',
		title: 'A Man Called Otto viewer insights',
		body: 'Only two responses so far.',
		data: {
			...data,
			views: 0,
			responses: 2,
			rating: undefined,
			sentiment: { positive: 1, neutral: 1, negative: 0 },
			questions: [],
			liked: data.liked.slice(0, 1),
			disliked: []
		}
	};
</script>

<Story name="Lots of responses">
	<CardFrame><InsightsCard card={full} /></CardFrame>
</Story>

<Story name="Few responses">
	<CardFrame><InsightsCard card={sparse} /></CardFrame>
</Story>
