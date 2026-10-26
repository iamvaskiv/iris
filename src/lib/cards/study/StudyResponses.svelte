<script lang="ts">
	import { Button, Kbd } from '@latitudelabs/design-system';
	import { X } from '@latitudelabs/design-system/icons';
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
		<h3 class="text-body-lg font-medium">{question.text || 'Untitled question'}</h3>
		<p class="text-caption text-muted-foreground">
			Showing {people.length} of {filter === null
				? answers.responses
				: (answers.counts?.[filter] ?? 0)} responses
		</p>
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
					<span>Respondent {person.respondent} · {person.age}</span>
					<span>{person.when}</span>
				</div>
				{#if person.option !== undefined}
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
