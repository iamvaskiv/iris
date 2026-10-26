<script lang="ts">
	import { Button, Kbd } from '@latitudelabs/design-system';
	import { X } from '@latitudelabs/design-system/icons';
	import type { Question, SampleResults } from './types';

	/**
	 * A study's (sample) results: key numbers, Lumi's reading of them, and the answers per question. Picking a question
	 * slides the overview off to the left (a sliver stays, to come back) and shows that question's individual responses
	 * on the right; picking an option filters them.
	 */
	let { questions, results }: { questions: Question[]; results: SampleResults } = $props();

	const percent = (n: number, total: number) => (total ? Math.round((n / total) * 100) : 0);

	let focused = $state<string | null>(null);
	let filter = $state<number | null>(null);
	/** What the responses pane shows: kept while it slides away, so it doesn't empty mid-slide. */
	let shown = $state<string | null>(null);

	function open(id: string, option: number | null = null) {
		if (focused === id && option === null) return back();
		focused = shown = id;
		filter = option !== null && filter === option ? null : option;
	}
	function back() {
		focused = null;
		filter = null;
	}

	const question = $derived(questions.find((q) => q.id === shown));
	const answers = $derived(shown ? results.questions[shown] : undefined);
	const people = $derived(
		(answers?.people ?? []).filter((p) => filter === null || p.option === filter)
	);
	const sentimentDot = {
		positive: 'bg-success',
		neutral: 'bg-muted-foreground',
		negative: 'bg-destructive'
	};
</script>

<svelte:window
	onkeydown={(e) => {
		if (focused && e.key === 'Escape' && !e.defaultPrevented) back();
	}}
/>

<div class="flex min-h-0 flex-1 flex-col gap-6">
	<dl class="flex flex-wrap gap-5">
		<div class="flex w-26 flex-col-reverse">
			<dt class="text-caption text-muted-foreground">Views</dt>
			<dd class="text-body-lg font-medium">{results.views}</dd>
		</div>
		<div class="flex w-26 flex-col-reverse">
			<dt class="text-caption text-muted-foreground">Sentiment</dt>
			<dd class="flex gap-2 text-body-lg font-medium">
				<span class="text-success"
					>{results.sentiment.positive}<span class="sr-only">% positive,</span></span
				>
				<span class="text-muted-foreground"
					>{results.sentiment.neutral}<span class="sr-only">% neutral,</span></span
				>
				<span class="text-destructive"
					>{results.sentiment.negative}<span class="sr-only">% negative</span></span
				>
			</dd>
		</div>
		<div class="flex w-26 flex-col-reverse">
			<dt class="text-caption text-muted-foreground">Rating, avg.</dt>
			<dd class="text-body-lg font-medium">{results.rating}%</dd>
		</div>
		<div class="flex w-26 flex-col-reverse">
			<dt class="text-caption text-muted-foreground">Completion</dt>
			<dd class="text-body-lg font-medium">{results.completion}%</dd>
		</div>
	</dl>

	<!-- Three half-width panes on a track: overview | questions | responses. Focusing a question slides the track left
	     by half, less 2rem, so the overview's edge stays in view. Clipped (not hidden), so focus can't scroll it. It runs
	     to the card's edges (out of its padding); the panes pad their content back in, with room at the bottom to scroll
	     the last items up above Lumi's dock. -->
	<div class="relative -mx-4 -mb-4 min-h-0 flex-1 overflow-clip">
		<div
			class="flex h-full transition-[translate] duration-300 ease-out motion-reduce:transition-none"
			style:translate={focused ? 'calc(-50% + 2rem) 0' : '0 0'}
		>
			<!-- Lumi's reading of the results. -->
			<div
				class="flex h-full w-1/2 shrink-0 flex-col gap-4 overflow-y-auto pr-4 pb-24 pl-4"
				inert={!!focused}
			>
				<section class="flex flex-col gap-2 rounded-lg bg-muted p-6">
					<h3 class="text-body font-medium">Summary of insights</h3>
					<p class="text-body-lg">{results.summary}</p>
				</section>
				<div class="grid grid-cols-2 gap-4">
					{#each results.insights as insight, i (i)}
						<section class="flex flex-col gap-2 rounded-lg bg-muted p-6">
							<h3 class="text-body font-medium">{insight.title}</h3>
							<p class="text-body text-muted-foreground">{insight.body}</p>
						</section>
					{/each}
				</div>
				<figure class="flex flex-col gap-2 rounded-lg bg-muted p-6">
					<h3 class="text-body font-medium">Quote</h3>
					<blockquote class="text-body-lg">“{results.quote.text}”</blockquote>
					<figcaption class="text-caption text-muted-foreground">{results.quote.who}</figcaption>
				</figure>
			</div>

			<!-- Answers per question: pick one to see its responses. -->
			<ol
				class="flex h-full w-1/2 shrink-0 flex-col gap-8 overflow-y-auto pr-4 pb-24 pl-4"
				aria-label="Answers per question"
			>
				{#each questions as q, i (q.id)}
					{@const a = results.questions[q.id]}
					{@const active = focused === q.id}
					<li class="flex flex-col gap-4">
						<button
							type="button"
							aria-pressed={active}
							onclick={() => open(q.id)}
							class="flex gap-3 rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
						>
							<span
								class={[
									'flex size-6 shrink-0 items-center justify-center rounded-full text-body font-medium transition-colors',
									active && 'bg-primary text-primary-foreground'
								]}>{i + 1}.</span
							>
							<span class="flex min-w-0 flex-1 flex-col">
								<span class="text-body-lg font-medium">{q.text || 'Untitled question'}</span>
								<span class="flex justify-between gap-4 text-caption text-muted-foreground">
									<span>{q.type === 'choice' ? 'Multiple choice' : 'Open question'}</span>
									<span>{a?.responses ?? 0} answers</span>
								</span>
							</span>
						</button>
						{#if q.type === 'choice'}
							<ol class="flex flex-col gap-1 pl-9" aria-label="Answers to question {i + 1}">
								{#each q.options ?? [] as option, k (k)}
									{@const share = percent(a?.counts?.[k] ?? 0, a?.responses ?? 0)}
									{@const picked = active && filter === k}
									<li>
										<button
											type="button"
											aria-pressed={picked}
											aria-label="{option || `Option ${k + 1}`}, {share}%: show who picked it"
											onclick={() => open(q.id, k)}
											class={[
												'relative flex h-12 w-full items-center gap-6 overflow-hidden rounded-lg bg-secondary pr-5 pl-2 text-left text-body-lg outline-none focus-visible:ring-2 focus-visible:ring-ring',
												picked && 'ring-2 ring-foreground'
											]}
										>
											<!-- Filled to the option's share of the answers. -->
											<span
												class="absolute inset-y-0 left-0 bg-foreground/8"
												style:width="{share}%"
												aria-hidden="true"
											></span>
											<Kbd aria-hidden="true" class="relative">{k + 1}</Kbd>
											<span class="relative min-w-0 flex-1 truncate"
												>{option || `Option ${k + 1}`}</span
											>
											<span class="relative">{share}%</span>
										</button>
									</li>
								{/each}
							</ol>
						{:else if a?.people?.length}
							<ul class="flex flex-col gap-1 pl-9" aria-label="Some answers to question {i + 1}">
								{#each a.people.slice(0, 3) as person (person.respondent)}
									<li class="text-body text-muted-foreground">“{person.text}”</li>
								{/each}
							</ul>
						{/if}
					</li>
				{/each}
			</ol>

			<!-- The picked question's individual responses. -->
			<section
				class="flex h-full w-1/2 shrink-0 flex-col gap-4 overflow-y-auto pr-12 pb-24 pl-4"
				aria-label="Responses"
				inert={!focused}
			>
				{#if question && answers}
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
							<Button variant="secondary" size="sm" onclick={() => (filter = null)}>
								{question.options?.[filter] || `Option ${filter + 1}`}
								<X data-icon="inline-end" />
								<span class="sr-only">(show all)</span>
							</Button>
						{/if}
					</div>
					{#if answers.people}
						<ul class="flex flex-col gap-2">
							{#each people as person (person.respondent)}
								<li class="flex flex-col gap-2 rounded-lg bg-muted p-4">
									<div class="flex justify-between gap-4 text-caption text-muted-foreground">
										<span>Respondent {person.respondent} · {person.age}</span>
										<span>{person.when}</span>
									</div>
									{#if person.option !== undefined}
										<p class="flex items-center gap-3 text-body-lg">
											<Kbd aria-hidden="true">{person.option + 1}</Kbd>
											{question.options?.[person.option] || `Option ${person.option + 1}`}
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
								<li class="text-body text-muted-foreground">
									Nobody in this sample picked that option.
								</li>
							{/each}
						</ul>
					{:else}
						<p class="text-body text-muted-foreground">
							These sample results have no individual responses yet.
						</p>
					{/if}
				{/if}
			</section>
		</div>

		{#if focused}
			<!-- The overview's visible edge: back to it. -->
			<button
				type="button"
				aria-label="Back to the overview"
				onclick={back}
				class="absolute inset-y-0 left-0 w-8 cursor-w-resize outline-none focus-visible:ring-2 focus-visible:ring-ring"
			></button>
		{/if}
	</div>
</div>
