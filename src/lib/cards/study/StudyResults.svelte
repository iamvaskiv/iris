<script lang="ts">
	import { Button, SegmentedControl } from '@latitudelabs/design-system';
	import { X } from '@latitudelabs/design-system/icons';
	import { fly } from 'svelte/transition';
	import StudyOverview from './StudyOverview.svelte';
	import StudyQuestions from './StudyQuestions.svelte';
	import StudyResponses from './StudyResponses.svelte';
	import { flatSteps } from './question-types';
	import { studyQuestions } from './questions';
	import type { Question, SampleResults } from '../types';

	/**
	 * A study's (sample) results, in two tabs. **Overview**: the dashboard (StudyOverview), the study's answers at a
	 * glance. **Questions**: the answers per question, full width; clicking one opens its individual responses in a panel
	 * beside it (picking an option or theme filters them; clicking it again, ×, or Escape closes it). A headline number or a piece of evidence on the Overview opens its
	 * question on the Questions tab.
	 */
	let {
		title,
		questions,
		results
	}: { title: string; questions: Question[]; results: SampleResults } = $props();

	/** What the results can ask Lumi (see ask-lumi.ts). */
	const ask = $derived(studyQuestions(title, results));

	const steps = $derived(flatSteps(questions));
	let tab = $state<'overview' | 'questions'>('overview');
	let focused = $state<string | null>(null);
	let filter = $state<number | null>(null);

	/** Opens a question (and an option or theme in it), on the Questions tab; picking the open one again closes it. */
	function pick(id: string, option: number | null = null) {
		if (tab === 'questions' && focused === id && option === null) {
			focused = null;
			filter = null;
			return;
		}
		tab = 'questions';
		focused = id;
		filter = option !== null && filter === option ? null : option;
	}
	function show(next: 'overview' | 'questions') {
		tab = next;
	}
	/** Closes the responses panel. */
	function close() {
		focused = null;
		filter = null;
	}

	const step = $derived(steps.find((s) => s.q.id === focused));
	const answers = $derived(focused ? results.questions[focused] : undefined);
	let pane = $state<HTMLElement>();
	let list = $state<HTMLElement>();
	// A newly picked question's responses start from the top, and the list brings that question into view.
	$effect(() => {
		void focused;
		pane?.scrollTo({ top: 0 });
		list?.querySelector('[aria-current=step]')?.scrollIntoView({ block: 'nearest' });
	});
</script>

<svelte:window
	onkeydown={(e) => {
		// Escape closes the responses panel first, then goes back to the Overview.
		if (tab !== 'questions' || e.key !== 'Escape' || e.defaultPrevented) return;
		if (focused) close();
		else show('overview');
	}}
/>

<div class="flex min-h-0 flex-1 flex-col gap-5">
	<SegmentedControl
		aria-label="Results"
		options={[
			{ value: 'overview', label: 'Overview' },
			{ value: 'questions', label: `Questions · ${steps.length}` }
		]}
		value={tab}
		onValueChange={(v) => show(v as 'overview' | 'questions')}
	/>

	{#if tab === 'overview'}
		<!-- Room at the bottom lets the last items scroll up above Lumi's dock. -->
		<div class="-mx-6 min-h-0 flex-1 overflow-y-auto px-6 pb-32">
			<StudyOverview
				{questions}
				{results}
				{ask}
				onpick={(id, option) => pick(id, option ?? null)}
			/>
		</div>
	{:else}
		<!-- The answers per question, full width; clicking one opens its responses in a panel beside it (each scrolls on
		     its own). -->
		<div class="flex min-h-0 flex-1 gap-8">
			<div
				bind:this={list}
				class={['min-h-0 overflow-y-auto pb-32', focused ? 'w-1/2' : 'w-full']}
			>
				<StudyQuestions {questions} {results} {focused} {filter} {ask} onpick={pick} />
			</div>
			{#if focused}
				<section
					bind:this={pane}
					transition:fly={{ x: 24, duration: 200 }}
					class="relative flex min-h-0 w-1/2 flex-col gap-4 overflow-y-auto rounded-xl bg-muted/50 p-5 pr-12 pb-32"
					aria-label="Responses"
				>
					<Button
						variant="ghost"
						size="icon-sm"
						class="absolute top-3 right-3"
						aria-label="Close responses"
						onclick={close}><X /></Button
					>
					{#if step && answers}
						<StudyResponses {step} {answers} {filter} {ask} onclearfilter={() => (filter = null)} />
					{/if}
				</section>
			{/if}
		</div>
	{/if}
</div>
