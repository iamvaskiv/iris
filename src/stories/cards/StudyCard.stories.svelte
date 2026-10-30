<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import StudyCard from '#lib/cards/StudyCard.svelte';
	import CardFrame from './CardFrame.svelte';
	import { fixture } from '../fixtures';
	import type { Question, StudyData } from '#lib/cards/types.js';

	const { Story } = defineMeta({
		title: 'Cards/Study',
		tags: ['autodocs'],
		parameters: {
			docs: {
				description: {
					component: `Questions to share with people (a study, survey or quiz); for now only their setup. The question
list (\`Steps\`) with **New** on the left; on the right the selected question as people will see it, edited in place:
its text, an open answer field (\`PromptInput\`), multiple-choice options, or a **channel**: a collection of videos
people browse as a grid (the channel's name above it; a tile opens that video's step, its ▶ plays it full screen and × removes it) and open full screen (with **Vertical sliding**, sliding up and
down between them like a short-video feed). A channel's videos are listed under it and work like video steps, with their own questions. A video step shows only its video; its picker and **Add question at m:ss** are in the settings, and with vertical sliding a channel's videos get up and down arrows to their neighbours. The gear at the preview's top right
toggles a **question settings** sidebar on the right (its type, its time inside a video, delete), which stays open
or closed as you move between questions. Lumi drafts the first questions; edits save to the project (not in Storybook).

**Share** can't share yet: it offers **Fake responses**, which swaps the setup for (made-up) results Lumi writes from
the questions, labelled **Sample data**, with a green **Fielding in progress** badge beside Share. Pick a question there to slide the overview aside and read its individual
responses; pick an option to see who chose it.

With **topic lanes** on (Settings → Experimental), a study takes two places in its lane: its setup (\`part="setup"\`,
shown even while fielding) and, to the right of it, its insights (\`part="insights"\`): the results, or until there are
some, an empty state with the **Fake responses** switch.`
				}
			}
		}
	});

	const study = fixture('Women Talking Study · Women Talking trailer: viewer reactions');
	const questions = (study.data as StudyData).questions;
	const openFirst = {
		...study,
		id: 'study-open',
		data: {
			questions: [
				...questions.filter((q) => q.type === 'open'),
				...questions.filter((q) => q.type !== 'open')
			]
		}
	};
	// A channel of two videos (one with a question), first so it's selected. Storybook has no server, so the videos'
	// posters come from their video cards (`media`), and they don't play.
	const channelVideos = [
		fixture('Women Talking Trailer · Women Talking – Official Trailer'),
		fixture('Inside Out 2 Clip · Inside Out 2 clip')
	];
	const media = Object.fromEntries(
		channelVideos.map((v) => {
			const { videoId, poster } = v.data as { videoId: string; poster?: string };
			return [videoId, { streamUrl: null, poster: poster ?? null }];
		})
	);
	const channel = {
		...study,
		id: 'study-channel',
		data: {
			questions: [
				{
					id: 'channel-1',
					type: 'channel',
					text: 'All things mystery',
					videos: channelVideos.map((v, i) => ({
						id: `channel-video-${i}`,
						type: 'video',
						text: '',
						videoId: (v.data as { videoId: string }).videoId,
						videoName: v.title,
						...(i === 0
							? {
									questions: [
										{ id: 'channel-q', type: 'open', text: 'Would you keep watching?', time: 12 }
									]
								}
							: {})
					}))
				},
				...questions.filter((q) => q.type !== 'video')
			]
		}
	};
	const channelSteps = (channel.data.questions as Question[]).slice(0, 1);
	const verticalChannel = {
		...channel,
		id: 'study-channel-vertical',
		data: {
			questions: [
				{ ...channelSteps[0], vertical: true },
				...questions.filter((q) => q.type !== 'video')
			]
		}
	};

	// Sample results with the channel in front of the short study's questions: of the 132 who reached it, 84 opened
	// the first video and 51 the second.
	const sampledData = fixture('Women Talking Study · Women Talking trailer: short version')
		.data as StudyData;
	const reaction = (
		respondent: number,
		text: string,
		sentiment: 'positive' | 'neutral' | 'negative'
	) => ({
		respondent,
		age: '24–32',
		when: 'Today',
		text,
		sentiment
	});
	const channelResults = {
		...channel,
		id: 'study-channel-sampled',
		data: {
			questions: [...channelSteps, ...sampledData.questions],
			sample: {
				enabled: true,
				results: {
					...sampledData.sample!.results!,
					questions: {
						...sampledData.sample!.results!.questions,
						'channel-1': { responses: 132, counts: [84, 51], people: [] },
						'channel-video-0': {
							responses: 84,
							counts: [46, 22, 16],
							people: [
								reaction(12, 'Gripping from the first line.', 'positive'),
								reaction(31, 'Slow, but I wanted to know more.', 'neutral'),
								reaction(47, 'Too heavy for me.', 'negative')
							]
						},
						'channel-q': {
							responses: 76,
							people: [
								reaction(12, 'Yes, I would watch the whole film.', 'positive'),
								reaction(58, 'Maybe, if a friend came along.', 'neutral')
							]
						},
						'channel-video-1': {
							responses: 51,
							counts: [30, 14, 7],
							people: [reaction(8, 'Fun, my kids would love it.', 'positive')]
						}
					}
				}
			}
		}
	};
	const empty = { ...study, id: 'study-empty', title: 'New study', data: { questions: [] } };
	const sampled = fixture('Women Talking Study · Women Talking trailer: short version');
</script>

<Story name="Multiple choice">
	<CardFrame full><StudyCard card={study} /></CardFrame>
</Story>

<Story name="Question settings open">
	<CardFrame full><StudyCard card={study} settings /></CardFrame>
</Story>

<Story name="Channel">
	<CardFrame full><StudyCard card={channel} settings {media} /></CardFrame>
</Story>

<Story name="Channel, watching full screen">
	<CardFrame full><StudyCard card={verticalChannel} watch={0} {media} /></CardFrame>
</Story>

<Story name="Video in a vertical channel">
	<CardFrame full
		><StudyCard card={verticalChannel} select="channel-video-0" settings {media} /></CardFrame
	>
</Story>

<Story name="Sample results with a channel">
	<CardFrame full><StudyCard card={channelResults} /></CardFrame>
</Story>

<Story name="Open question">
	<CardFrame full><StudyCard card={openFirst} /></CardFrame>
</Story>

<Story name="No questions yet">
	<CardFrame full><StudyCard card={empty} /></CardFrame>
</Story>

<Story name="Sample results">
	<CardFrame full><StudyCard card={sampled} /></CardFrame>
</Story>

<Story name="Lanes: insights, no responses yet">
	<CardFrame wide><StudyCard card={study} part="insights" /></CardFrame>
</Story>

<Story name="Lanes: insights">
	<CardFrame wide><StudyCard card={sampled} part="insights" /></CardFrame>
</Story>

<Story name="Lanes: setup while fielding">
	<CardFrame full><StudyCard card={sampled} part="setup" /></CardFrame>
</Story>
