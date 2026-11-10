<script lang="ts">
	import { ChoiceList, Steps } from '@latitudelabs/design-system';
	import ToneBar from '../viewers/ToneBar.svelte';
	import {
		SCALE_MAX,
		SCALE_MIN,
		flatSteps,
		extendSteps,
		stepDescription,
		stepTitle,
		timecode,
		typeColor
	} from './question-types';
	import { askable } from '#lib/ask-lumi.js';
	import Tooltip from '#lib/components/Tooltip.svelte';
	import TooltipGroup from '#lib/components/TooltipGroup.svelte';
	import { childAt, type StudyAsk } from './questions';
	import { choiceLeader, dropOff, sliderSpread, videoScore } from './insights';
	import CurveChart from '../timeline/CurveChart.svelte';
	import { sentimentCurves } from '../curve';
	import { TONE_DOT } from '../viewer';
	import type { Question, SampleResults } from '../types';

	/**
	 * Answers per question: each question as a step (its type and number of answers, and how many fewer got there when
	 * that's noticeable), with Lumi's takeaway and how people answered below: multiple choice as bars and its leader,
	 * sliders as their spread (7+ in full colour), open questions as their themes (or a few answers), videos as their
	 * reactions, stars and how reactions move along them, with the questions popping up marked. Picking a question or an option is `onpick`.
	 */
	let {
		questions,
		results,
		focused,
		filter,
		ask,
		onpick
	}: {
		questions: Question[];
		results: SampleResults;
		/** The open question's id, and the option its responses are filtered to. */
		focused: string | null;
		filter: number | null;
		/** What the answers can ask Lumi (see ask-lumi.ts). */
		ask?: StudyAsk;
		onpick: (id: string, option?: number) => void;
	} = $props();

	/** Questions inside a video are listed right after it, indented. */
	const steps = $derived(flatSteps(questions));
	const percent = (n: number, total: number) => (total ? (n / total) * 100 : 0);
	/**
	 * How many answered, or watched; a channel's video adds the share of the channel's visitors who opened it (people
	 * open several, so these don't add up to 100%).
	 */
	const drops = $derived(dropOff(steps, results));
	function meta({ q, parent }: (typeof steps)[number]) {
		const n = results.questions[q.id]?.responses ?? 0;
		// A noticeable drop from the step before: some stopped here.
		const drop = drops.get(q.id);
		if (q.type !== 'video' && q.type !== 'channel')
			return drop ? `${n} answers · ${drop}% fewer` : `${n} answers`;
		const reached =
			parent?.type === 'channel' ? results.questions[parent.id]?.responses : undefined;
		return reached ? `${n} views · ${Math.round(percent(n, reached))}% opened it` : `${n} views`;
	}
	const optionLabel = (q: Question, k: number) => q.options?.[k] || `Option ${k + 1}`;
	/** Age notes opened by a click (hover shows them too). */
	let ages = $state(new Set<string>());
	const toggleAge = (id: string) => {
		const next = new Set(ages);
		if (!next.delete(id)) next.add(id);
		ages = next;
	};
	/**
	 * Only a question's count ("94 answers") opens its responses; the rest of its header isn't clickable. The design
	 * system's Steps can only make the whole header a button, so this turns its count into one (a candidate for Steps:
	 * a clickable meta), with the keyboard too.
	 */
	const countOpens = (list: typeof steps) => (el: HTMLElement) => {
		const counts = [...el.querySelectorAll<HTMLElement>(':scope > li')].map((li) =>
			li.querySelector<HTMLElement>(':scope > div > span:nth-child(2) span.shrink-0')
		);
		counts.forEach((count, i) => {
			if (!count) return;
			count.classList.add('step-count');
			count.setAttribute('role', 'button');
			count.setAttribute('tabindex', '0');
			count.setAttribute('aria-label', `${count.textContent?.trim()}: show the responses`);
			count.setAttribute('aria-pressed', String(list[i]?.q.id === focused));
		});
		const open = (e: Event) => {
			const i = counts.indexOf((e.target as HTMLElement).closest<HTMLElement>('.step-count'));
			if (i < 0 || !list[i]) return;
			if (e instanceof KeyboardEvent && e.key !== 'Enter' && e.key !== ' ') return;
			e.preventDefault();
			onpick(list[i].q.id);
		};
		el.addEventListener('click', open);
		el.addEventListener('keydown', open);
		return () => {
			el.removeEventListener('click', open);
			el.removeEventListener('keydown', open);
		};
	};
	/** A response's tone as a number (-1 to 1), for the curve along a video. */
	const SCORE = { positive: 0.6, neutral: 0, negative: -0.6 } as const;
	/** A theme's tone, in the comment colours. */
	const TONE = TONE_DOT;
</script>

<TooltipGroup>
	<Steps
		aria-label="Answers per question"
		{@attach extendSteps(steps)}
		{@attach countOpens(steps)}
		{@attach askable(
			ask &&
				((e, el) => {
					const step = steps[childAt(e, el)];
					return step && ask.resultStep(step);
				})
		)}
		class="study-steps"
		current={steps.findIndex((s) => s.q.id === focused)}
		steps={steps.map((s) => ({
			title: stepTitle(s.q),
			description: stepDescription(s),
			color: typeColor(s.q.type),
			indent: !!s.parent,
			number: s.number,
			meta: meta(s)
		}))}
	>
		{#snippet after(_: unknown, i: number)}
			{@const step = steps[i]}
			{@const q = step.q}
			{@const a = results.questions[q.id]}
			<div class="flex flex-col gap-3">
				<!-- Lumi's reading of the answers, and an age band that stood out. -->
				{#if a?.takeaway}<p class="text-body">{a.takeaway}</p>{/if}
				{#if a?.ageNote}
					<!-- An age band that answered differently: a pill, its note on hover (or a click). -->
					<Tooltip text={a.ageNote} side="right">
						{#snippet children({ props })}
							<button
								{...props}
								type="button"
								aria-expanded={ages.has(q.id)}
								class="self-start rounded-full bg-muted px-2.5 py-0.5 text-caption text-muted-foreground outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
								onclick={() => toggleAge(q.id)}>By age</button
							>
						{/snippet}
					</Tooltip>
					{#if ages.has(q.id)}<p class="text-caption text-muted-foreground">{a.ageNote}</p>{/if}
				{/if}

				{#if q.type === 'choice'}
					{@const lead = choiceLeader(q, a?.counts)}
					<ChoiceList
						label="Answers to question {step.number}"
						options={(q.options ?? []).map((_, k) => optionLabel(q, k))}
						shares={(q.options ?? []).map((_, k) =>
							percent(a?.counts?.[k] ?? 0, a?.responses ?? 0)
						)}
						selected={focused === q.id ? filter : null}
						onselect={(_: string, k: number) => onpick(q.id, k)}
						{@attach askable(
							ask &&
								((e, el) => {
									const k = childAt(e, el, '[data-slot="choice"]');
									return k >= 0 && ask.option(step, k);
								})
						)}
					/>
					{#if lead && (q.options?.length ?? 0) > 1}
						<p class="text-caption text-muted-foreground">
							<span class="font-medium text-foreground">{lead.label}</span>
							{lead.lead >= 10 ? 'leads clearly' : lead.lead >= 4 ? 'leads' : 'is only just ahead'},
							by
							{lead.lead} points
						</p>
					{/if}
				{:else if q.type === 'video'}
					{@const [positive = 0, neutral = 0, negative = 0] = a?.counts ?? []}
					{@const score = videoScore(a)}
					{@const moments = (a?.people ?? []).flatMap((p) =>
						p.time !== undefined
							? [{ text: p.text ?? '', time: p.time, sentiment: SCORE[p.sentiment ?? 'neutral'] }]
							: []
					)}
					{@const duration = a?.duration ?? Math.max(10, ...moments.map((m) => m.time + 5))}
					{@const popUps = steps.filter((s) => s.parent?.id === q.id && s.q.time !== undefined)}
					<div class="flex items-center gap-4">
						<ToneBar
							class="flex-1"
							{positive}
							{neutral}
							{negative}
							label="Reactions:"
							{@attach askable(ask?.reactions(step))}
						/>
						{#if score.stars !== null}
							<span class="text-body-lg tabular-nums" title="Average stars from viewers"
								>{score.stars.toFixed(1)}&nbsp;<span class="text-muted-foreground">★</span></span
							>
						{/if}
					</div>
					{#if moments.length >= 3}
						<!-- How reactions move along the video (above the line: positive), with the questions that pop up in it. -->
						<div class="flex flex-col gap-1">
							<div class="relative h-14">
								<CurveChart
									curves={[{ paths: sentimentCurves([moments], duration)[0], fill: true }]}
									label="Reactions along the video"
									{duration}
									midline
									ask={(t) => ask?.videoMoment(step, t)}
								/>
								{#each popUps as p (p.q.id)}
									<span
										class="pointer-events-none absolute inset-y-0 w-px bg-category-magenta/50"
										style:left="{Math.min(100, ((p.q.time ?? 0) / duration) * 100)}%"
										aria-hidden="true"
									></span>
								{/each}
							</div>
							<div class="relative h-4 text-caption text-muted-foreground">
								<span class="absolute left-0">0:00</span>
								{#each popUps as p (p.q.id)}
									<span
										class="absolute -translate-x-1/2"
										style:left="{Math.min(100, ((p.q.time ?? 0) / duration) * 100)}%"
										>{p.number}</span
									>
								{/each}
								<span class="absolute right-0">{timecode(duration)}</span>
							</div>
						</div>
					{/if}
				{:else if q.type === 'scale'}
					{@const spread = sliderSpread(a?.counts)}
					{@const peak = Math.max(1, ...(a?.counts ?? []))}
					<!-- The spread of answers, 0 to 10, with the 7+ bars in full colour. -->
					<div
						class="flex items-end gap-4"
						{@attach askable(ask?.spread(step, spread.high, spread.split))}
					>
						<div
							class="flex h-12 flex-1 items-end gap-1"
							role="img"
							aria-label="Answers from 0 to 10"
						>
							{#each a?.counts ?? [] as c, k (k)}
								<span
									class={[
										'flex-1 rounded-xs',
										SCALE_MIN + k >= 7 ? 'bg-category-magenta' : 'bg-category-magenta/30'
									]}
									style:height="{Math.max(4, (c / peak) * 100)}%"
									title="{SCALE_MIN + k}: {c}"
								></span>
							{/each}
						</div>
						<div class="flex flex-col items-end">
							<span class="text-body-lg tabular-nums"
								>{spread.average.toFixed(1)}&nbsp;<span class="text-muted-foreground"
									>/ {SCALE_MAX}</span
								></span
							>
							<span class="text-caption text-muted-foreground">{spread.high}% gave 7+</span>
						</div>
					</div>
					{#if spread.split}
						<p class="text-caption text-muted-foreground">
							<span class="font-medium text-foreground">Split opinions:</span>
							{spread.low}% gave 3 or less
						</p>
					{/if}
				{:else if a?.themes?.length}
					<!-- What open answers have in common: a theme each, with its share (click to read its answers). -->
					<ul
						class="flex flex-col gap-2"
						aria-label="Themes in the answers to question {step.number}"
					>
						{#each a.themes as theme, k (k)}
							{@const example = a.people?.find((p) => p.theme === k)}
							<li>
								<button
									type="button"
									aria-pressed={focused === q.id && filter === k}
									class="flex w-full flex-col gap-1 rounded-md p-1 text-left outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring aria-pressed:bg-accent"
									onclick={() => onpick(q.id, k)}
									{@attach askable(ask?.theme(step, theme))}
								>
									<span class="flex items-center justify-between gap-2 text-body">
										<span class="flex items-center gap-2">
											<span
												class={['size-2 shrink-0 rounded-full', TONE[theme.sentiment]]}
												aria-hidden="true"
											></span>{theme.label}
										</span>
										<span class="text-caption text-muted-foreground tabular-nums"
											>{theme.share}%</span
										>
									</span>
									<span class="h-1.5 w-full overflow-hidden rounded-full bg-muted">
										<span
											class={['block h-full rounded-full', TONE[theme.sentiment]]}
											style:width="{theme.share}%"
										></span>
									</span>
									{#if example?.text}
										<span class="line-clamp-1 text-caption text-muted-foreground"
											>“{example.text}”</span
										>
									{/if}
								</button>
							</li>
						{/each}
					</ul>
				{:else if a?.people?.length}
					<ul class="flex flex-col gap-1" aria-label="Some answers to question {step.number}">
						{#each a.people.slice(0, 3) as person (person.respondent)}
							<li
								class="text-body text-muted-foreground"
								{@attach askable(ask?.person(step, person))}
							>
								“{person.text}”
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		{/snippet}
	</Steps>
</TooltipGroup>

<style>
	/* Each question set apart: a hairline and room between them. */
	:global(.study-steps > li + li) {
		margin-top: 1.25rem;
		padding-top: 1.25rem;
		border-top: 1px solid var(--border);
	}
	/* A question's count, the one thing in its header that opens its responses: a link. */
	:global(.study-steps .step-count) {
		cursor: pointer;
		border-radius: var(--radius-xs-value, 4px);
		text-decoration: underline;
		text-decoration-color: color-mix(in oklab, currentColor 35%, transparent);
		text-underline-offset: 3px;
		outline: none;
	}
	:global(.study-steps .step-count:hover),
	:global(.study-steps .step-count[aria-pressed='true']) {
		color: var(--foreground);
		text-decoration-color: currentColor;
	}
	:global(.study-steps .step-count:focus-visible) {
		box-shadow: 0 0 0 2px var(--ring);
	}
</style>
