<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import VideoCard from '#lib/cards/VideoCard.svelte';
	import CardFrame from './CardFrame.svelte';
	import { fixture } from '../fixtures';

	const { Story } = defineMeta({
		title: 'Cards/Video',
		tags: ['autodocs'],
		parameters: {
			docs: {
				description: {
					component: `A video with its analysis: poster, title, summary, then Scenes and Characters (open) and Themes and
Brands (collapsed), each a design-system \`Card.Section\`. In the app the server fills \`card.data\` (see
\`src/lib/server/video-card.ts\`); here it's a captured project. The stream is left out, so there's no Play button.`
				}
			}
		}
	});

	const womenTalking = fixture('Women Talking Trailer · Women Talking – Official Trailer');
	const insideOut = fixture('Inside Out 2 Clip · Inside Out 2 clip');
</script>

<Story name="Full analysis">
	<CardFrame><VideoCard card={womenTalking} /></CardFrame>
</Story>

<Story name="Short clip">
	<CardFrame><VideoCard card={insideOut} /></CardFrame>
</Story>

<Story name="Not analysed">
	<CardFrame>
		<VideoCard
			card={{
				id: 'v-plain',
				type: 'video',
				title: 'Inside Out 2 | Trailer 1',
				body: 'No analysis yet, so there are no scenes or characters.',
				data: { videoId: 'vuvIanfCkI8R', duration: 144.6, scenes: [], characters: [] }
			}}
		/>
	</CardFrame>
</Story>
