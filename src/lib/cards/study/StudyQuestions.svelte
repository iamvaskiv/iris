<script lang="ts">
	import { ChoiceList, Steps } from '@latitudelabs/design-system';
	import type { Question, SampleResults } from '../types';

	/**
	 * Answers per question: each question as a step (its type and number of answers), with how people answered below:
	 * multiple choice as bars, open questions as a few sample answers. Picking a question or an option is `onpick`.
	 */
	let {
		questions,
		results,
		focused,
		filter,
		onpick
	}: {
		questions: Question[];
		results: SampleResults;
		/** The open question's id, and the option its responses are filtered to. */
		focused: string | null;
		filter: number | null;
		onpick: (id: string, option?: number) => void;
	} = $props();

	const percent = (n: number, total: number) => (total ? (n / total) * 100 : 0);
	const optionLabel = (q: Question, k: number) => q.options?.[k] || `Option ${k + 1}`;
</script>

<Steps
	aria-label="Answers per question"
	class="gap-4"
	current={questions.findIndex((q) => q.id === focused)}
	onselect={(i: number) => onpick(questions[i].id)}
	steps={questions.map((q) => ({
		title: q.text || 'Untitled question',
		description: q.type === 'choice' ? 'Multiple choice' : 'Open question',
		meta: `${results.questions[q.id]?.responses ?? 0} answers`
	}))}
>
	{#snippet after(_: unknown, i: number)}
		{@const q = questions[i]}
		{@const a = results.questions[q.id]}
		{#if q.type === 'choice'}
			<ChoiceList
				label="Answers to question {i + 1}"
				options={(q.options ?? []).map((_, k) => optionLabel(q, k))}
				shares={(q.options ?? []).map((_, k) => percent(a?.counts?.[k] ?? 0, a?.responses ?? 0))}
				selected={focused === q.id ? filter : null}
				onselect={(_: string, k: number) => onpick(q.id, k)}
			/>
		{:else if a?.people?.length}
			<ul class="flex flex-col gap-1" aria-label="Some answers to question {i + 1}">
				{#each a.people.slice(0, 3) as person (person.respondent)}
					<li class="text-body text-muted-foreground">“{person.text}”</li>
				{/each}
			</ul>
		{/if}
	{/snippet}
</Steps>
