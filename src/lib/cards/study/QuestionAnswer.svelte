<script lang="ts">
	import { Button, ChoiceList, PromptInput, Slider } from '@latitudelabs/design-system';
	import { SCALE_MAX, SCALE_MIN } from './question-types';
	import type { Question } from '../types';

	/**
	 * A question as a respondent answers it: an answer field, the options, or a slider with Continue. Used for the
	 * questions that pop up over a video. Nothing is collected yet; answering or skipping just continues.
	 */
	let { question, oncontinue }: { question: Question; oncontinue: () => void } = $props();

	let answer = $state('');
	let value = $state(5);
</script>

<div class="flex flex-col gap-4">
	<p class="text-title">{question.text || 'Untitled question'}</p>
	{#if question.type === 'choice'}
		<ChoiceList
			label="Answers"
			options={(question.options ?? []).map((o, k) => o || `Option ${k + 1}`)}
			onselect={oncontinue}
		/>
	{:else if question.type === 'scale'}
		<div class="flex items-center gap-4">
			<Slider
				type="single"
				bind:value
				min={SCALE_MIN}
				max={SCALE_MAX}
				step={1}
				aria-label="Answer"
				class="flex-1"
			/>
			<span class="w-8 text-right text-body-lg font-medium">{value}</span>
		</div>
		<Button class="self-end" onclick={oncontinue}>Continue</Button>
	{:else}
		<PromptInput
			bind:value={answer}
			placeholder={question.placeholder || 'Type your answer…'}
			label="Answer"
			onsubmit={oncontinue}
		/>
	{/if}
	<Button variant="ghost" size="sm" class="self-start text-muted-foreground" onclick={oncontinue}>
		Skip
	</Button>
</div>
