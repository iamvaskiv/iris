<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import StudyCard from '#lib/cards/StudyCard.svelte';
	import CardFrame from './CardFrame.svelte';
	import { fixture } from '../fixtures';
	import type { StudyData } from '#lib/cards/types.js';

	const { Story } = defineMeta({
		title: 'Cards/Study',
		tags: ['autodocs'],
		parameters: {
			docs: {
				description: {
					component: `Questions to share with people (a study, survey or quiz); for now only their setup. The question
list (\`Steps\`) with **New** on the left; on the right the selected question as people will see it, edited in place:
its text, an open answer field (\`PromptInput\`) or multiple-choice options. The gear at the preview's top right
toggles a **question settings** sidebar on the right (its type, its time inside a video, delete), which stays open
or closed as you move between questions. Lumi drafts the first questions; edits save to the project (not in Storybook).

**Share** can't share yet: it offers **Fake responses**, which swaps the setup for (made-up) results Lumi writes from
the questions, labelled **Sample data**, with a green **Fielding in progress** badge beside Share. Pick a question there to slide the overview aside and read its individual
responses; pick an option to see who chose it.`
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
	const empty = { ...study, id: 'study-empty', title: 'New study', data: { questions: [] } };
	const sampled = fixture('Women Talking Study · Women Talking trailer: short version');
</script>

<Story name="Multiple choice">
	<CardFrame full><StudyCard card={study} /></CardFrame>
</Story>

<Story name="Question settings open">
	<CardFrame full><StudyCard card={study} settings /></CardFrame>
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
