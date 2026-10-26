<script lang="ts">
	import { ChoiceList, Progress, SentimentBar, Steps } from '@latitudelabs/design-system';
	import {
		SCALE_MAX,
		SCALE_MIN,
		flatSteps,
		stepDescription,
		stepTitle,
		typeColor
	} from './question-types';
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

	/** Questions inside a video are listed right after it, indented. */
	const steps = $derived(flatSteps(questions));
	const percent = (n: number, total: number) => (total ? (n / total) * 100 : 0);
	const optionLabel = (q: Question, k: number) => q.options?.[k] || `Option ${k + 1}`;
	/** A slider's average from its counts per value. */
	const average = (counts: number[] = []) => {
		const n = counts.reduce((a, b) => a + b, 0);
		return n ? counts.reduce((sum, c, k) => sum + c * (SCALE_MIN + k), 0) / n : 0;
	};
</script>

<Steps
	aria-label="Answers per question"
	class="gap-4"
	current={steps.findIndex((s) => s.q.id === focused)}
	onselect={(i: number) => onpick(steps[i].q.id)}
	steps={steps.map((s) => ({
		title: stepTitle(s.q),
		description: stepDescription(s),
		color: typeColor(s.q.type),
		indent: !!s.parent,
		number: s.number,
		meta: `${results.questions[s.q.id]?.responses ?? 0} ${s.q.type === 'video' ? 'views' : 'answers'}`
	}))}
>
	{#snippet after(_: unknown, i: number)}
		{@const q = steps[i].q}
		{@const a = results.questions[q.id]}
		{#if q.type === 'choice'}
			<ChoiceList
				label="Answers to question {steps[i].number}"
				options={(q.options ?? []).map((_, k) => optionLabel(q, k))}
				shares={(q.options ?? []).map((_, k) => percent(a?.counts?.[k] ?? 0, a?.responses ?? 0))}
				selected={focused === q.id ? filter : null}
				onselect={(_: string, k: number) => onpick(q.id, k)}
			/>
		{:else if q.type === 'video'}
			{@const [positive = 0, neutral = 0, negative = 0] = a?.counts ?? []}
			<SentimentBar {positive} {neutral} {negative} label="Reactions:" />
		{:else if q.type === 'scale'}
			{@const avg = average(a?.counts)}
			<div class="flex items-center gap-4">
				<Progress
					class="flex-1"
					value={avg - SCALE_MIN}
					max={SCALE_MAX - SCALE_MIN}
					aria-label="Average answer to question {steps[i].number}"
				/>
				<span class="text-body-lg"
					>{avg.toFixed(1)}&nbsp;<span class="text-muted-foreground">/ {SCALE_MAX}</span></span
				>
			</div>
		{:else if a?.people?.length}
			<ul class="flex flex-col gap-1" aria-label="Some answers to question {steps[i].number}">
				{#each a.people.slice(0, 3) as person (person.respondent)}
					<li class="text-body text-muted-foreground">“{person.text}”</li>
				{/each}
			</ul>
		{/if}
	{/snippet}
</Steps>
