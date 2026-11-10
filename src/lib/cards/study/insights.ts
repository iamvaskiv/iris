import { SCALE_MAX, SCALE_MIN, flatSteps, stepTitle, type FlatStep } from './question-types';
import type { Question, SampleResults } from '../types';

/**
 * The shape of results written now: 2 added what the study set out to learn and its answers, 3 their short forms (a
 * headline, verdicts, figures), 4 each answer's deciding figure and where the quote comes from. Older results are
 * written again the first time they're shown.
 */
export const RESULTS_VERSION = 4;

/**
 * What a study's results add up to, worked out from the counts (so every number on the card agrees): averages, the
 * share giving a slider 7 or more, a multiple-choice question's leader and its lead, a video's stars, a channel's most
 * opened video, and where people dropped off.
 */

/** A slider's answers per value (0 to 10): average, share at 7 or more, and whether opinion is split. */
export function sliderSpread(counts: number[] = []) {
	const n = counts.reduce((a, b) => a + b, 0);
	const at = (from: number, to: number) =>
		counts.slice(from - SCALE_MIN, to - SCALE_MIN + 1).reduce((a, b) => a + b, 0);
	const share = (k: number) => (n ? Math.round((k / n) * 100) : 0);
	const average = n ? counts.reduce((sum, c, k) => sum + c * (SCALE_MIN + k), 0) / n : 0;
	const high = share(at(7, SCALE_MAX));
	const low = share(at(SCALE_MIN, 3));
	return { n, average, high, low, split: low >= 25 && high >= 40 };
}

/** A multiple-choice question's leader: which option, its share, and its lead over the next one (points). */
export function choiceLeader(q: Question, counts: number[] = []) {
	const n = counts.reduce((a, b) => a + b, 0);
	if (!n || !counts.length) return null;
	const order = counts.map((c, k) => ({ c, k })).sort((a, b) => b.c - a.c);
	const share = (c: number) => Math.round((c / n) * 100);
	const [first, second] = order;
	return {
		option: first.k,
		label: q.options?.[first.k] || `Option ${first.k + 1}`,
		share: share(first.c),
		lead: second ? share(first.c) - share(second.c) : share(first.c)
	};
}

/** A video's average stars (everyone's, or its sample viewers'; null without any), and its share of positive reactions. */
export function videoScore(a: SampleResults['questions'][string] | undefined) {
	const stars = (a?.people ?? []).flatMap((p) => (p.rating ? [p.rating] : []));
	const [positive = 0, neutral = 0, negative = 0] = a?.counts ?? [];
	const total = positive + neutral + negative;
	return {
		// Everyone's average when the results have it; otherwise the sample's.
		stars: a?.stars ?? (stars.length ? stars.reduce((x, y) => x + y, 0) / stars.length : null),
		positive: total ? Math.round((positive / total) * 100) : 0,
		negative: total ? Math.round((negative / total) * 100) : 0
	};
}

/** A channel's most opened video: which (index), and the share of the channel's visitors who opened it. */
export function channelLeader(q: Question, a: SampleResults['questions'][string] | undefined) {
	const counts = a?.counts ?? [];
	if (!a?.responses || !counts.length) return null;
	const k = counts.indexOf(Math.max(...counts));
	const video = q.videos?.[k];
	return {
		index: k,
		name: video ? stepTitle(video) : `Video ${k + 1}`,
		share: Math.round((counts[k] / a.responses) * 100)
	};
}

/**
 * How many fewer people reached a step than the step before it (in list order, skipping a channel's videos, which only
 * some open by choice), as a share: shown when it's a noticeable drop.
 */
export function dropOff(steps: FlatStep[], results: SampleResults) {
	const drops = new Map<string, number>();
	let previous: number | undefined;
	for (const step of steps) {
		if (step.parent?.type === 'channel') continue;
		const n = results.questions[step.q.id]?.responses;
		if (n === undefined) continue;
		if (previous && previous > n) {
			const share = Math.round(((previous - n) / previous) * 100);
			if (share >= 8) drops.set(step.q.id, share);
		}
		previous = n;
	}
	return drops;
}

/**
 * Videos shown one after another in the study (not in a channel), each with its score: when there are two or more, the
 * study compares them, and the card says which did better.
 */
export function comparedVideos(questions: Question[], results: SampleResults) {
	const videos = flatSteps(questions).filter((s) => s.q.type === 'video' && !s.parent);
	if (videos.length < 2) return [];
	return videos.map((s) => ({ step: s, ...videoScore(results.questions[s.q.id]) }));
}
