import { timecode } from '../format';
import type { Question } from '../types';

export { timecode };

/**
 * Question types, as people pick them in the setup and read them in the results. `color`: the design system's
 * category colour that marks the type in step lists (open questions stay muted).
 */
export const QUESTION_TYPES: {
	value: Question['type'];
	label: string;
	color?: 'green' | 'orange' | 'magenta' | 'blue';
}[] = [
	{ value: 'open', label: 'Open question' },
	{ value: 'choice', label: 'Multiple choice', color: 'orange' },
	{ value: 'scale', label: 'Slider', color: 'magenta' },
	{ value: 'video', label: 'Video', color: 'green' },
	// The app's own fourth category colour (see layout.css); Steps lists get it from `extendSteps`.
	{ value: 'channel', label: 'Channel', color: 'blue' }
];

/** The type's colour, as the design system's Steps take it (blue isn't one of its colours: see `extendSteps`). */
export const typeColor = (type: Question['type']) => {
	const color = QUESTION_TYPES.find((t) => t.value === type)?.color;
	return color === 'blue' ? undefined : color;
};

export const typeLabel = (type: Question['type']) =>
	QUESTION_TYPES.find((t) => t.value === type)?.label ?? 'Open question';

/** Slider questions run from SCALE_MIN to SCALE_MAX in whole steps. */
export const SCALE_MIN = 0;
export const SCALE_MAX = 10;

/** What a step is called in lists: its text, or the video's name for a video step. */
export const stepTitle = (q: Question) =>
	q.text ||
	(q.type === 'video'
		? q.videoName || 'Untitled video'
		: q.type === 'channel'
			? 'Untitled channel'
			: 'Untitled question');

/** Seconds from "m:ss" (or plain seconds); null if it isn't a time. */
export function parseTime(text: string): number | null {
	const m = text.trim().match(/^(?:(\d+):)?(\d{1,2}(?:\.\d+)?)$/);
	return m ? Number(m[1] ?? 0) * 60 + Number(m[2]) : null;
}

/**
 * A step in the list: a question, or one inside another step (`parent`): a video in a channel, or a question that
 * pops up in a video.
 */
export type FlatStep = { q: Question; parent?: Question; number: string; depth: number };

/** The steps inside a step: a channel's videos, or the questions that pop up in a video. */
export const childrenOf = (q: Question) =>
	q.type === 'channel' ? (q.videos ?? []) : q.type === 'video' ? (q.questions ?? []) : [];

/** Whether the step is a question that pops up in a video (at its `time`). */
export const popsUp = (step: FlatStep | undefined) => step?.parent?.type === 'video';

/**
 * Every step in order, each one's inside steps right after it: "2.", then "2.1", "2.2"…, and a question in a channel's
 * video as "5.1.1".
 */
export function flatSteps(
	questions: Question[],
	prefix = '',
	parent?: Question,
	depth = 0
): FlatStep[] {
	return questions.flatMap((q, i) => {
		const n = prefix ? `${prefix}.${i + 1}` : `${i + 1}`;
		return [
			{ q, parent, number: prefix ? n : `${n}.`, depth },
			...flatSteps(childrenOf(q), n, q, depth + 1)
		];
	});
}

/**
 * What the design system's Steps can't do yet, added to a Steps list (`{@attach extendSteps(steps)}`): an indent per
 * level for each step inside a step (Steps' `indent` gives the first; a question in a channel's video sits under its
 * video), and the blue category colour for channels (Steps has green, orange and magenta). Candidates for Steps.
 */
export const extendSteps = (steps: FlatStep[]) => (list: HTMLElement) => {
	list.querySelectorAll<HTMLElement>(':scope > li').forEach((li, i) => {
		const step = steps[i];
		const depth = step?.depth ?? 0;
		li.style.paddingLeft = depth > 1 ? `calc(var(--spacing) * ${8 * depth})` : '';
		li.querySelector('.text-caption > span')?.classList.toggle(
			'text-category-blue',
			step?.q.type === 'channel'
		);
	});
};

/** The step's description line: its type, with the time for a question inside a video. */
export const stepDescription = (step: FlatStep) =>
	popsUp(step)
		? `${timecode(step.q.time ?? 0)} · ${typeLabel(step.q.type)}`
		: typeLabel(step.q.type);

/**
 * The question a playing video has just reached: the first not yet `reached` whose time is at or just before `t`
 * (within a second, so seeking past one doesn't stop there).
 */
export const dueQuestion = (questions: Question[] = [], reached: Set<string>, t: number) =>
	questions.find((q) => !reached.has(q.id) && (q.time ?? 0) <= t && t - (q.time ?? 0) < 1);

/** A question's dot on a video's timeline, in its type's colour (open questions stay muted). */
export const dotClass = (type: Question['type']) =>
	({ choice: 'bg-category-orange', scale: 'bg-category-magenta' })[type as string] ??
	'bg-muted-foreground';

const count = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/**
 * What goes with a step if it's deleted, or changed into another type: a channel's videos and their questions, or a
 * video's questions. Empty when nothing would.
 */
export function inside(q: Question) {
	if (q.type === 'channel' && q.videos?.length) {
		const asked = q.videos.reduce((n, v) => n + (v.questions?.length ?? 0), 0);
		return (
			count(q.videos.length, 'video') + (asked ? ` and ${count(asked, 'question')} in them` : '')
		);
	}
	return q.type === 'video' && q.questions?.length ? count(q.questions.length, 'question') : '';
}

/** Whether a step has nothing in it yet (deleting it loses nothing, so it needn't ask). */
export const isEmpty = (q: Question) =>
	!q.text.trim() &&
	!q.videoId &&
	!q.videos?.length &&
	!q.questions?.length &&
	!(q.options ?? []).some((o) => o.trim());
