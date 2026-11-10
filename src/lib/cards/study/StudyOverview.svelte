<script lang="ts">
	import { askable } from '#lib/ask-lumi.js';
	import Tooltip from '#lib/components/Tooltip.svelte';
	import TooltipGroup from '#lib/components/TooltipGroup.svelte';
	import { channelLeader, comparedVideos } from './insights';
	import { flatSteps, stepTitle } from './question-types';
	import type { StudyAsk } from './questions';
	import type { Question, SampleResults, StudyAnswer } from '../types';

	/**
	 * A study's results at a glance (the Overview tab), in four blocks, each fact once:
	 * 1. the verdict: the story in a line;
	 * 2. the answers: a tile per question behind the study, with its deciding figure (big), a few words of verdict, where
	 *    it comes from (links that open those questions) and how clear it is;
	 * 3. what to do next, beside a telling quote in full (linked to the theme it comes from);
	 * 4. only when it applies: which of the videos did better, and a channel's most opened videos.
	 */
	let {
		questions,
		results,
		ask,
		onpick
	}: {
		questions: Question[];
		results: SampleResults;
		ask?: StudyAsk;
		/** Opens a question on the Questions tab, with an option or theme picked when given. */
		onpick: (id: string, option?: number) => void;
	} = $props();

	const steps = $derived(flatSteps(questions));
	const stepOf = (id: string) => steps.find((s) => s.q.id === id);
	/** A step's number as links show it: "1", "1.2" (no trailing dot). */
	const numberOf = (id: string) => stepOf(id)?.number.replace(/\.$/, '');
	const compared = $derived(comparedVideos(questions, results));
	/** The better of compared videos: most stars, else most positive reactions. */
	const best = $derived(
		compared.length
			? compared.reduce((a, b) =>
					(b.stars ?? 0) > (a.stars ?? 0) ||
					((b.stars ?? 0) === (a.stars ?? 0) && b.positive > a.positive)
						? b
						: a
				)
			: null
	);
	const channels = $derived(
		steps.filter((s) => s.q.type === 'channel' && results.questions[s.q.id]?.responses)
	);
	const answers = $derived(results.answers ?? []);
	/** The quote's theme, when it's one of an open question's answers. */
	const quoteFrom = $derived.by(() => {
		const from = results.quote?.from;
		const theme = from && results.questions[from.id]?.themes?.[from.theme];
		return from && theme ? { ...from, label: theme.label, share: theme.share } : null;
	});
	/** The person behind the quote, as an initial ("Respondent, 24–32" → "R"). */
	const initial = $derived((results.quote?.who ?? 'R').trim().charAt(0).toUpperCase());

	/** How clear an answer is, in a word and a colour. */
	const CONFIDENCE: Record<StudyAnswer['confidence'], { label: string; dot: string }> = {
		high: { label: 'Clear', dot: 'bg-category-green' },
		medium: { label: 'Fairly clear', dot: 'bg-category-orange' },
		low: { label: 'Close call', dot: 'bg-chart-red' }
	};

	/** Recommendations opened to show their reason (a click, for touch and keyboard; hover shows it too). */
	let opened = $state(new Set<number>());
	const toggle = (i: number) => {
		const next = new Set(opened);
		if (!next.delete(i)) next.add(i);
		opened = next;
	};
</script>

<TooltipGroup>
	<div class="flex flex-col gap-10">
		<!-- 1 · The verdict. -->
		{#if results.headline || results.summary}
			<p
				class={['max-w-4xl text-heading', !results.headline && 'line-clamp-3']}
				title={results.headline ? results.summary : undefined}
				{@attach askable(ask?.summary())}
			>
				{results.headline ?? results.summary}
			</p>
		{/if}

		<!-- 2 · The answers, a tile each. -->
		{#if answers.length}
			<section class="flex flex-col gap-3" aria-label="What you wanted to know">
				<div class="grid grid-cols-[repeat(auto-fit,minmax(14rem,1fr))] gap-3">
					{#each answers as answer, i (i)}
						{@const c = CONFIDENCE[answer.confidence]}
						{@const figure = answer.figure ?? answer.evidence[0]?.figure}
						<article
							class="flex flex-col gap-2 rounded-xl bg-card p-5 shadow-hairline"
							{@attach askable(ask?.answer(answer))}
						>
							<span class="text-caption text-muted-foreground">{answer.question}</span>
							<!-- The figure, and the verdict in a few words; the whole sentence on hover. -->
							<Tooltip text={answer.answer} side="bottom">
								{#snippet children({ props })}
									<button
										{...props}
										type="button"
										class="flex flex-col gap-1 rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
										onclick={() => answer.evidence[0] && onpick(answer.evidence[0].id)}
									>
										{#if figure}<span class="truncate text-heading">{figure}</span>{/if}
										<span class="text-body">{answer.verdict ?? answer.answer}</span>
									</button>
								{/snippet}
							</Tooltip>
							<div
								class="mt-auto flex flex-wrap items-center gap-x-1.5 gap-y-1 pt-2 text-caption text-muted-foreground"
							>
								<span>from</span>
								{#each answer.evidence.filter((e, k, all) => all.findIndex((x) => x.id === e.id) === k && numberOf(e.id)) as e, k (e.id)}
									{#if k > 0}<span class="-ml-1.5" aria-hidden="true">,</span>{/if}
									{#if numberOf(e.id)}
										<Tooltip text={e.text}>
											{#snippet children({ props })}
												<button
													{...props}
													type="button"
													class="rounded-xs text-foreground underline decoration-foreground/20 underline-offset-2 outline-none hover:decoration-foreground focus-visible:ring-2 focus-visible:ring-ring"
													onclick={() => onpick(e.id)}>{numberOf(e.id)}</button
												>
											{/snippet}
										</Tooltip>
									{/if}
								{/each}
								<span aria-hidden="true">·</span>
								<span class="flex items-center gap-1.5">
									<span class={['size-2 rounded-full', c.dot]} aria-hidden="true"></span>{c.label}
								</span>
							</div>
						</article>
					{/each}
				</div>
			</section>
		{/if}

		<!-- 3 · What to do next, beside the voice of a viewer. -->
		{#if results.recommendations?.length || results.quote?.text}
			<div class="grid gap-6 lg:grid-cols-2">
				{#if results.recommendations?.length}
					<section class="flex flex-col gap-4 rounded-xl bg-muted p-5" aria-label="What to do next">
						<h3 class="text-body font-medium">What to do next</h3>
						<!-- Each as its title; why, on hover or a click. -->
						<ol class="flex flex-col gap-3">
							{#each results.recommendations as r, i (i)}
								<li {@attach askable(ask?.recommendation(r))}>
									<Tooltip text={r.body} side="right">
										{#snippet children({ props })}
											<button
												{...props}
												type="button"
												aria-expanded={opened.has(i)}
												class="flex w-full items-center gap-3 rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
												onclick={() => toggle(i)}
											>
												<span
													class="flex size-6 shrink-0 items-center justify-center rounded-full bg-card text-caption font-medium shadow-hairline"
													>{i + 1}</span
												>
												<span class="text-body-lg font-medium">{r.title}</span>
											</button>
										{/snippet}
									</Tooltip>
									{#if opened.has(i)}
										<p class="mt-1 pl-9 text-body text-muted-foreground">{r.body}</p>
									{/if}
								</li>
							{/each}
						</ol>
					</section>
				{/if}
				{#if results.quote?.text}
					<figure
						class="flex flex-col justify-between gap-4 rounded-xl bg-muted p-6"
						{@attach askable(ask?.quote(results.quote))}
					>
						<blockquote class="text-body-lg">“{results.quote.text}”</blockquote>
						<figcaption
							class="flex flex-wrap items-center gap-2 text-caption text-muted-foreground"
						>
							<span
								class="flex size-6 items-center justify-center rounded-full bg-card font-medium text-foreground shadow-hairline"
								aria-hidden="true">{initial}</span
							>
							{results.quote.who}
							{#if quoteFrom}
								<span aria-hidden="true">·</span>
								<button
									type="button"
									class="rounded-xs underline decoration-foreground/20 underline-offset-2 outline-none hover:text-foreground hover:decoration-foreground focus-visible:ring-2 focus-visible:ring-ring"
									onclick={() => onpick(quoteFrom.id, quoteFrom.theme)}
									>from “{quoteFrom.label}” · {quoteFrom.share}%</button
								>
							{/if}
						</figcaption>
					</figure>
				{/if}
			</div>
		{/if}

		<!-- 4 · Only when it applies: several videos compared, a channel's most opened videos. -->
		{#if (compared.length && best) || channels.length}
			<div class="grid gap-6 lg:grid-cols-2">
				{#if compared.length && best}
					<section class="flex flex-col gap-2" aria-label="Videos compared">
						<h3 class="text-body font-medium">Videos compared</h3>
						<ul class="flex flex-col gap-1">
							{#each compared as v (v.step.q.id)}
								{@const won = v === best}
								<li>
									<button
										type="button"
										class={[
											'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-body outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring',
											won ? 'bg-category-green/12' : 'bg-muted/50'
										]}
										onclick={() => onpick(v.step.q.id)}
										{@attach askable(ask?.compareVideo(v.step, won))}
									>
										<span class="min-w-0 flex-1 truncate">{stepTitle(v.step.q)}</span>
										{#if v.stars !== null}<span class="tabular-nums">{v.stars.toFixed(1)} ★</span
											>{/if}
										<span class="w-24 text-right text-caption text-muted-foreground tabular-nums"
											>{v.positive}% positive</span
										>
										<span
											class={[
												'w-16 rounded-full px-2 py-0.5 text-center text-caption',
												won ? 'bg-category-green/25 font-medium' : 'invisible'
											]}
											aria-hidden={!won}>Better</span
										>
									</button>
								</li>
							{/each}
						</ul>
					</section>
				{/if}
				{#each channels as channel (channel.q.id)}
					{@const a = results.questions[channel.q.id]}
					{@const top = channelLeader(channel.q, a)}
					{#if a && top}
						<section class="flex flex-col gap-3" aria-label="Most opened in {stepTitle(channel.q)}">
							<h3 class="text-body font-medium">
								Most opened in {stepTitle(channel.q)}
								<span class="font-normal text-muted-foreground">· {a.responses} visitors</span>
							</h3>
							<ol class="flex flex-col gap-2">
								{#each (channel.q.videos ?? [])
									.map((v, k) => ({ v, n: a.counts?.[k] ?? 0 }))
									.sort((x, y) => y.n - x.n) as { v, n } (v.id)}
									{@const share = Math.round((n / a.responses) * 100)}
									<li>
										<button
											type="button"
											class="flex w-full flex-col gap-1 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
											onclick={() => onpick(v.id)}
										>
											<span class="flex justify-between gap-2 text-caption">
												<span class="truncate">{stepTitle(v)}</span>
												<span class="text-muted-foreground tabular-nums">{share}% opened</span>
											</span>
											<span class="h-2 w-full overflow-hidden rounded-full bg-chart-blue/15">
												<span class="block h-full rounded-full bg-chart-blue" style:width="{share}%"
												></span>
											</span>
										</button>
									</li>
								{/each}
							</ol>
						</section>
					{/if}
				{/each}
			</div>
		{/if}
	</div>
</TooltipGroup>
