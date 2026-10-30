<script lang="ts">
	import { Button, Kbd } from '@latitudelabs/design-system';
	import { X } from '@latitudelabs/design-system/icons';
	import { SCALE_MAX, stepTitle, timecode } from './question-types';
	import type { Question, SampleResults } from '../types';

	/** One question's individual responses, newest first; filtered to an option when one is picked. */
	let {
		question,
		answers,
		filter,
		onclearfilter
	}: {
		question: Question;
		answers: SampleResults['questions'][string];
		filter: number | null;
		onclearfilter: () => void;
	} = $props();

	const people = $derived(
		(answers.people ?? []).filter((p) => filter === null || p.option === filter)
	);
	const optionLabel = (k: number) => question.options?.[k] || `Option ${k + 1}`;
	const sentimentDot = {
		positive: 'bg-success',
		neutral: 'bg-muted-foreground',
		negative: 'bg-destructive'
	};
</script>

<div class="flex items-start justify-between gap-4">
	<div class="flex flex-col">
		<h3 class="text-body-lg font-medium">{stepTitle(question)}</h3>
		{#if question.type === 'channel'}
			<!-- A channel has no answers of its own: what people did there is which videos they opened. -->
			<p class="text-caption text-muted-foreground">
				{answers.responses} views. Pick a video under it to read its reactions.
			</p>
		{:else}
			<p class="text-caption text-muted-foreground">
				Showing {people.length} of {filter === null
					? answers.responses
					: (answers.counts?.[filter] ?? 0)}
				{question.type === 'video' ? 'reactions' : 'responses'}
			</p>
		{/if}
	</div>
	{#if filter !== null}
		<Button variant="secondary" size="sm" onclick={onclearfilter}>
			{optionLabel(filter)}
			<X data-icon="inline-end" />
			<span class="sr-only">(show all)</span>
		</Button>
	{/if}
</div>
{#if answers.people}
	<ul class="flex flex-col gap-5">
		{#each people as person (person.respondent)}
			<!-- Who answered and when, above their answer. -->
			<li class="flex flex-col gap-1">
				<div class="flex justify-between gap-4 text-caption text-muted-foreground">
					<!-- A video's viewers also say where they commented and how many stars they gave it. -->
					<span
						>{[
							`Respondent ${person.respondent}`,
							person.age,
							person.time !== undefined && `at ${timecode(person.time)}`,
							person.rating !== undefined && `${person.rating} / 5 stars`
						]
							.filter(Boolean)
							.join(' · ')}</span
					>
					<span>{person.when}</span>
				</div>
				{#if person.value !== undefined}
					<p class="text-body-lg">
						{person.value}&nbsp;<span class="text-muted-foreground">/ {SCALE_MAX}</span>
					</p>
				{:else if person.option !== undefined}
					<p class="flex items-center gap-3 text-body-lg">
						<Kbd aria-hidden="true">{person.option + 1}</Kbd>
						{optionLabel(person.option)}
					</p>
				{:else}
					<p class="flex items-start gap-2 text-body-lg">
						<span
							class={[
								'mt-1.5 size-2 shrink-0 rounded-full',
								sentimentDot[person.sentiment ?? 'neutral']
							]}
							aria-hidden="true"
						></span>
						<span>{person.text}<span class="sr-only"> ({person.sentiment})</span></span>
					</p>
				{/if}
			</li>
		{:else}
			<li class="text-body text-muted-foreground">Nobody in this sample picked that option.</li>
		{/each}
	</ul>
{:else}
	<p class="text-body text-muted-foreground">
		These sample results have no individual responses yet.
	</p>
{/if}
