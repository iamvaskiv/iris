import { quoted } from '#lib/ask-lumi.js';
import { share } from '../format';
import { sliderSpread } from './insights';
import { SCALE_MAX, popsUp, stepTitle, timecode, type FlatStep } from './question-types';
import type { Question, SampleResponse, SampleResults, StudyAnswer } from '../types';

/**
 * The questions a study card offers Lumi (see `ask-lumi.ts`), worded from what's on the card: its steps while setting
 * it up, and the (sample) answers to them once results are in. Each names the study, so Lumi knows which card it's
 * about; a question that pops up in a video also names the video and the moment.
 */
export function studyQuestions(title: string, results?: SampleResults) {
	const study = quoted(title);
	/** “Question”, and where it's asked when that's inside a video. */
	const asked = (step: FlatStep) =>
		popsUp(step)
			? `${quoted(stepTitle(step.q))} (asked at ${timecode(step.q.time ?? 0)} in the video ${quoted(stepTitle(step.parent!))})`
			: quoted(stepTitle(step.q));
	const written = (q: Question) => !!q.text.trim() || (q.type === 'video' && !!q.videoId);
	const answersTo = (q: Question) => results?.questions[q.id];
	const optionLabel = (q: Question, k: number) => q.options?.[k] || `Option ${k + 1}`;

	return {
		/** A step in the setup's list: what asking it would tell us. */
		setupStep: (step: FlatStep) => {
			const q = step.q;
			if (!written(q)) return null;
			if (q.type === 'video')
				return `What would showing the video ${quoted(stepTitle(q))} in ${study} tell us?`;
			if (q.type === 'channel')
				return `What would people browsing the channel ${quoted(stepTitle(q))} in ${study} tell us?`;
			if (popsUp(step))
				return `Is ${timecode(q.time ?? 0)} a good moment in ${quoted(stepTitle(step.parent!))} to ask ${quoted(q.text)} in ${study}?`;
			return `Is ${quoted(q.text)} a good question to ask in ${study}? What would it tell us?`;
		},

		/** The moment in a video a question pops up at (the still above it in the preview). */
		moment: (step: FlatStep) =>
			popsUp(step)
				? `What happens at ${timecode(step.q.time ?? 0)} in ${quoted(stepTitle(step.parent!))}, where ${study} asks ${quoted(stepTitle(step.q))}?`
				: null,

		summary: () => `What should we do next, given the results of ${study}?`,

		/** A question the study set out to answer, and Lumi's answer to it. */
		answer: (a: StudyAnswer) =>
			a.confidence === 'low'
				? `${study} asked ${quoted(a.question)}, and the answer is close: ${quoted(a.answer)} What would settle it?`
				: `${study} set out to learn ${quoted(a.question)}: ${quoted(a.answer)} What's the strongest evidence, and what could change it?`,

		/** A recommendation from the results. */
		recommendation: (r: { title: string; body: string }) =>
			`How would we ${r.title.charAt(0).toLowerCase()}${r.title.slice(1)}, given the results of ${study}?`,

		/** A video compared with the others shown in the study. */
		compareVideo: (step: FlatStep, better: boolean) =>
			better
				? `Why did ${quoted(stepTitle(step.q))} do better than the other videos in ${study}?`
				: `Why did ${quoted(stepTitle(step.q))} fall behind the other videos in ${study}?`,

		/** A theme in the answers to an open question. */
		theme: (step: FlatStep, theme: { label: string; share: number }) =>
			`${theme.share}% of answers to ${asked(step)} in ${study} are about ${quoted(theme.label)}. What are people saying, and why?`,

		/** A slider's spread: how many gave it 7 or more, and whether opinion is split. */
		spread: (step: FlatStep, high: number, split: boolean) =>
			split
				? `Opinion is split on ${asked(step)} in ${study}: who loved it, who didn't, and why?`
				: `${high}% gave ${asked(step)} in ${study} 7 or more. What sets them apart from the rest?`,

		/** Reactions along a video, at a moment. */
		videoMoment: (step: FlatStep, time: number) =>
			`How did people in ${study} react around ${timecode(time)} in the video ${quoted(stepTitle(step.q))}, and why?`,
		quote: (quote: { text: string; who: string }) =>
			`${quote.who} said ${quoted(quote.text)} in ${study}. What's behind that, and do others feel the same?`,

		/** A question in the results, as a whole. */
		resultStep: (step: FlatStep) => {
			const q = step.q;
			const a = answersTo(q);
			if (!a || !written(q)) return null;
			if (q.type === 'channel')
				return `Which videos in the channel ${quoted(stepTitle(q))} did people open most in ${study}, and why?`;
			if (q.type === 'video')
				return `How did people react to the video ${quoted(stepTitle(q))} in ${study}?`;
			if (q.type === 'open')
				return `What do people's answers to ${asked(step)} in ${study} have in common?`;
			return `What do the ${a.responses} answers to ${asked(step)} in ${study} tell us?`;
		},

		/** One option's bar in a multiple-choice question's results. */
		option: (step: FlatStep, k: number) => {
			const q = step.q;
			const a = answersTo(q);
			if (!a) return null;
			const counts = a.counts ?? [];
			const n = counts[k] ?? 0;
			const pct = share(n, a.responses);
			const option = quoted(optionLabel(q, k));
			if (!n) return `Why did nobody pick ${option} when ${study} asked ${asked(step)}?`;
			const top = n === Math.max(...counts);
			return top
				? `Why did ${pct > 50 ? 'most people' : 'the most people'} (${pct}%) pick ${option} when ${study} asked ${asked(step)}?`
				: `Who picked ${option} (${pct}%) when ${study} asked ${asked(step)}, and why?`;
		},

		/** A slider question's average. */
		scale: (step: FlatStep) => {
			const a = answersTo(step.q);
			if (!a) return null;
			return `People gave ${asked(step)} ${sliderSpread(a.counts).average.toFixed(1)} out of ${SCALE_MAX} on average in ${study}. Why?`;
		},

		/** A video's reactions bar. */
		reactions: (step: FlatStep) => {
			const [positive = 0, neutral = 0, negative = 0] = answersTo(step.q)?.counts ?? [];
			const total = positive + neutral + negative;
			if (!total) return null;
			const video = quoted(stepTitle(step.q));
			return negative > positive
				? `Why did more people react badly (${share(negative, total)}%) than well to the video ${video} in ${study}?`
				: `${share(positive, total)}% of reactions to the video ${video} in ${study} are positive. What did people like, and what put the others off?`;
		},

		/** The responses pane's heading: everyone who answered, or those who picked the option it's filtered to. */
		responses: (step: FlatStep, filter: number | null) => {
			if (step.q.type === 'channel') return null;
			return filter === null
				? `What do the responses to ${asked(step)} in ${study} say?`
				: `What do the people who picked ${quoted(optionLabel(step.q, filter))} for ${asked(step)} in ${study} have in common?`;
		},

		/** One person's answer. */
		person: (step: FlatStep, p: SampleResponse) => {
			const who = `Respondent ${p.respondent}${p.age ? ` (${p.age})` : ''}`;
			const q = step.q;
			if (p.value !== undefined)
				return `Why did ${who} give ${asked(step)} ${p.value} out of ${SCALE_MAX} in ${study}?`;
			if (p.option !== undefined)
				return `Why did ${who} pick ${quoted(optionLabel(q, p.option))} for ${asked(step)} in ${study}?`;
			if (!p.text) return null;
			if (q.type === 'video')
				return p.time !== undefined
					? `${who} commented ${quoted(p.text)} at ${timecode(p.time)} in the video ${quoted(stepTitle(q))} (${study}). What were they reacting to?`
					: `${who} said ${quoted(p.text)} about the video ${quoted(stepTitle(q))} in ${study}. What did they mean?`;
			return `${who} answered ${quoted(p.text)} to ${asked(step)} in ${study}. What do they mean, and do others agree?`;
		}
	};
}

export type StudyAsk = ReturnType<typeof studyQuestions>;

/** The index of the child of `el` (a list) under the pointer, or -1. */
export const childAt = (e: MouseEvent, el: Element, selector = ':scope > *') => {
	const target = e.target instanceof Node ? e.target : null;
	return Array.from(el.querySelectorAll(selector)).findIndex((c) => target && c.contains(target));
};
