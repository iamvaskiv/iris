<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import ViewersCard from '#lib/cards/ViewersCard.svelte';
	import CardFrame from './CardFrame.svelte';
	import { fixture } from '../fixtures';
	import type { ViewersData } from '#lib/cards/types.js';

	const { Story } = defineMeta({
		title: 'Cards/Viewers',
		tags: ['autodocs'],
		parameters: {
			docs: {
				description: {
					component: `How viewers reacted to two to four videos, compared. A row per video in its colour: its poster (play
opens it across the card, with a playhead along the curves), a Source picker (Lumiere's real viewers, or any of the
project's studies that shows the video and has sample results) and that source's key numbers. Then, along each video
(0–100% of its own length, so videos of different lengths line up), every video's sentiment and rating curves laid
over each other, and a lane of comments per video. Data from \`src/lib/server/viewers.ts\`; the studies come from the
project's other cards (\`studies\` here).`
				}
			}
		}
	});

	const card = fixture('Trailer Reactions · How viewers reacted');
	const study = fixture('Trailer Reactions · Trailer reactions study');
	const [first, second] = (card.data as ViewersData).videos;
</script>

<Story name="Real viewers">
	<CardFrame wide><ViewersCard {card} studies={[study]} /></CardFrame>
</Story>

<Story name="One video from a study">
	<CardFrame wide>
		<ViewersCard {card} studies={[study]} initial={{ sources: { [second.videoId]: study.id } }} />
	</CardFrame>
</Story>

<Story name="Both from a study">
	<CardFrame wide>
		<ViewersCard
			{card}
			studies={[study]}
			initial={{ sources: { [first.videoId]: study.id, [second.videoId]: study.id } }}
		/>
	</CardFrame>
</Story>

<Story name="No studies">
	<CardFrame wide><ViewersCard {card} studies={[]} /></CardFrame>
</Story>
