<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import VideoCard from '#lib/cards/VideoCard.svelte';
	import CardFrame from './CardFrame.svelte';
	import { fixture } from '../fixtures';
	import type { VideoCardData } from '#lib/cards/types.js';

	const { Story } = defineMeta({
		title: 'Cards/Video',
		tags: ['autodocs'],
		parameters: {
			docs: {
				description: {
					component: `A video with its analysis, as a wide card: the video across it, then its title and summary,
then Scenes, Characters, Themes and Brands (all open; each closes), each a design-system \`Card.Section\`. In the app
the server fills \`card.data\` (see \`src/lib/server/video-card.ts\`); here it's a captured project. The stream is
left out, so there's no Play button.

Under the video, a timeline of its scenes (click or drag to go to a moment). Pick a character, theme or brand to see
where it's on screen (from Lumiere's moments, about ten seconds each) and watch from its first appearance; pick it
again, or use the arrows, for the next one. While the video plays, its current scene is outlined.

**Timeline view** (the switch under the summary) makes the card full size, with the title beside a smaller video, and
shows everything as lanes along the video: the scenes across the top, then each character, theme and brand on its
own lane with bars where it's on screen and its share of screen time, longest first, coloured by kind.

When the video was shown to an audience (\`data.viewers\`, the insights card's data): its key numbers under the
summary (views, responses, rating, comment sentiment), a **Comments** section with each comment at its moment (click
to play from there), and a dot per comment on the timeline in its sentiment's colour. In Timeline view, a
**Sentiment** group (a curve of how positive the comments are along the video, then lanes of positive, neutral and
negative comments) and a **Rating** group with a curve of the average rating where ratings were given. **Source**
switches it between Lumiere (real viewers) and each of the project's studies that shows the video and has sample
results, named after its card: their watched count, reactions, open answers to questions popping up in the video (as
comments at their moments) and slider answers there (as ratings out of 10).`
				}
			}
		}
	});

	const womenTalking = fixture('Women Talking Trailer · Women Talking – Official Trailer');
	const insideOut = fixture('Inside Out 2 Clip · Inside Out 2 clip');
	const withViewers = fixture('Inside Out 2 Reception · Inside Out 2 trailer');
	const study = fixture('Inside Out 2 Reception · Inside Out 2 trailer study');
	// Its real ratings all come from one question at the end (one rise there). Made-up ratings spread along the video
	// stand in here, to show the chart's shape: high around the opening and the last scene.
	const viewers = (withViewers.data as VideoCardData).viewers!;
	const spreadRatings = {
		...withViewers,
		id: 'video-spread-ratings',
		data: {
			...withViewers.data,
			viewers: {
				...viewers,
				ratings: [5, 5, 4, 5, 3, 2, 3, 4, 2, 3, 5, 4, 5, 5, 4, 5].map((value, i) => ({
					time: 4 + i * 9,
					value,
					max: 5
				}))
			}
		}
	};
</script>

<Story name="Full analysis">
	<CardFrame wide><VideoCard card={womenTalking} /></CardFrame>
</Story>

<Story name="Where a character appears">
	<CardFrame wide
		><VideoCard
			card={womenTalking}
			initial={{ pick: { kind: 'character', index: 0 } }}
		/></CardFrame
	>
</Story>

<Story name="Timeline view">
	<CardFrame full
		><VideoCard
			card={womenTalking}
			initial={{ lanes: true, pick: { kind: 'character', index: 0 } }}
		/></CardFrame
	>
</Story>

<Story name="With viewer data">
	<CardFrame wide><VideoCard card={withViewers} /></CardFrame>
</Story>

<Story name="Timeline view with viewer data">
	<CardFrame full><VideoCard card={withViewers} initial={{ lanes: true }} /></CardFrame>
</Story>

<Story name="Viewer data from a study">
	<CardFrame full
		><VideoCard
			card={withViewers}
			studies={[study]}
			initial={{ lanes: true, source: study.id }}
		/></CardFrame
	>
</Story>

<Story name="Rating along the video">
	<CardFrame full><VideoCard card={spreadRatings} initial={{ lanes: true }} /></CardFrame>
</Story>

<Story name="Short clip">
	<CardFrame wide><VideoCard card={insideOut} /></CardFrame>
</Story>

<Story name="Not analysed">
	<CardFrame wide>
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
