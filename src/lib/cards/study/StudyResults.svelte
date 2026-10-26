<script lang="ts">
	import { SentimentCounts, Stat } from '@latitudelabs/design-system';
	import StudyOverview from './StudyOverview.svelte';
	import StudyQuestions from './StudyQuestions.svelte';
	import StudyResponses from './StudyResponses.svelte';
	import { flatSteps } from './question-types';
	import type { Question, SampleResults } from '../types';

	/**
	 * A study's (sample) results: key numbers, Lumi's reading of them, and the answers per question. Picking a question
	 * slides the overview off to the left (a sliver stays, to come back) and shows that question's individual responses
	 * on the right; picking an option filters them.
	 */
	let { questions, results }: { questions: Question[]; results: SampleResults } = $props();

	let focused = $state<string | null>(null);
	let filter = $state<number | null>(null);
	/** What the responses pane shows: kept while it slides away, so it doesn't empty mid-slide. */
	let shown = $state<string | null>(null);

	function pick(id: string, option: number | null = null) {
		if (focused === id && option === null) return back();
		focused = shown = id;
		filter = option !== null && filter === option ? null : option;
	}
	function back() {
		focused = null;
		filter = null;
	}

	const question = $derived(flatSteps(questions).find((s) => s.q.id === shown)?.q);
	const answers = $derived(shown ? results.questions[shown] : undefined);

	// The panes fill the whole card (Card.Root is their positioned parent) and start their content below the header and
	// the key numbers: `top` is where those end, in card coordinates.
	let stats = $state<HTMLElement | null>(null);
	let top = $state(0);
	$effect(() => {
		const card = stats?.offsetParent as HTMLElement | null;
		if (!stats || !card) return;
		const measure = () => (top = stats!.offsetTop + stats!.offsetHeight + 24);
		const observer = new ResizeObserver(measure);
		observer.observe(card);
		observer.observe(stats);
		return () => observer.disconnect();
	});
</script>

<svelte:window
	onkeydown={(e) => {
		if (focused && e.key === 'Escape' && !e.defaultPrevented) back();
	}}
/>

<div bind:this={stats} class="relative z-20 flex flex-wrap gap-5">
	<Stat variant="plain" value={results.views} label="Views" />
	<Stat variant="plain" label="Sentiment">
		<SentimentCounts {...results.sentiment} unit="%" />
	</Stat>
	<Stat variant="plain" value="{results.rating}%" label="Rating, avg." />
	<Stat variant="plain" value="{results.completion}%" label="Completion" />
</div>

<!-- Three half-width panes on a track: overview | questions | responses. Focusing a question slides the track left by
     half, less 2rem, so the overview's edge stays in view. Clipped (not hidden), so focus can't scroll it. It fills the
     whole card: the panes start their content below the header and numbers (`top`), and on the right they scroll up to
     the card's top edge, under Share; on the left a card-coloured backdrop hides what scrolls under the title and
     numbers. Room at the bottom lets the last items scroll up above Lumi's dock. -->
<div class="absolute inset-0 overflow-clip" style:--top="{top}px">
	<div
		class="absolute top-0 left-0 z-10 bg-card transition-[width] duration-300 ease-out motion-reduce:transition-none"
		style:height="{top}px"
		style:width={focused ? 'calc(50% + 2rem)' : '50%'}
		aria-hidden="true"
	></div>
	<div
		class="flex h-full transition-[translate] duration-300 ease-out motion-reduce:transition-none"
		style:translate={focused ? 'calc(-50% + 2rem) 0' : '0 0'}
	>
		<div
			class="flex h-full w-1/2 shrink-0 flex-col gap-4 overflow-y-auto pt-(--top) pr-4 pb-24 pl-4"
			inert={!!focused}
		>
			<StudyOverview {results} />
		</div>

		<!-- Steps pad their own items, which lines the numbers up with the key numbers above. -->
		<div class="h-full w-1/2 shrink-0 overflow-y-auto pt-(--top) pb-24">
			<StudyQuestions {questions} {results} {focused} {filter} onpick={pick} />
		</div>

		<section
			class="flex h-full w-1/2 shrink-0 flex-col gap-4 overflow-y-auto pt-(--top) pr-12 pb-24 pl-4"
			aria-label="Responses"
			inert={!focused}
		>
			{#if question && answers}
				<StudyResponses {question} {answers} {filter} onclearfilter={() => (filter = null)} />
			{/if}
		</section>
	</div>

	{#if focused}
		<!-- The overview's visible edge: back to it. -->
		<button
			type="button"
			aria-label="Back to the overview"
			onclick={back}
			class="absolute inset-y-0 left-0 z-10 w-8 cursor-w-resize outline-none focus-visible:ring-2 focus-visible:ring-ring"
		></button>
	{/if}
</div>
