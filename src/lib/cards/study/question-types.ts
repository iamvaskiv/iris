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
	color?: 'green' | 'orange' | 'magenta';
}[] = [
	{ value: 'open', label: 'Open question' },
	{ value: 'choice', label: 'Multiple choice', color: 'orange' },
	{ value: 'scale', label: 'Slider', color: 'magenta' },
	{ value: 'video', label: 'Video', color: 'green' }
];

export const typeColor = (type: Question['type']) =>
	QUESTION_TYPES.find((t) => t.value === type)?.color;

export const typeLabel = (type: Question['type']) =>
	QUESTION_TYPES.find((t) => t.value === type)?.label ?? 'Open question';

/** Slider questions run from SCALE_MIN to SCALE_MAX in whole steps. */
export const SCALE_MIN = 0;
export const SCALE_MAX = 10;

/** What a step is called in lists: its text, or the video's name for a video step. */
export const stepTitle = (q: Question) =>
	q.text || (q.type === 'video' ? q.videoName || 'Untitled video' : 'Untitled question');

/** Seconds from "m:ss" (or plain seconds); null if it isn't a time. */
export function parseTime(text: string): number | null {
	const m = text.trim().match(/^(?:(\d+):)?(\d{1,2}(?:\.\d+)?)$/);
	return m ? Number(m[1] ?? 0) * 60 + Number(m[2]) : null;
}

/** A step in the list: a question, or a question inside a video (with that video as its parent). */
export type FlatStep = { q: Question; parent?: Question; number: string };

/** Every step in order, questions inside a video right after it: "2.", then "2.1", "2.2"… */
export function flatSteps(questions: Question[]): FlatStep[] {
	return questions.flatMap((q, i) => [
		{ q, number: `${i + 1}.` },
		...(q.type === 'video' ? (q.questions ?? []) : []).map((nested, k) => ({
			q: nested,
			parent: q,
			number: `${i + 1}.${k + 1}`
		}))
	]);
}

/** The step's description line: its type, with the time for a question inside a video. */
export const stepDescription = (step: FlatStep) =>
	step.parent
		? `${timecode(step.q.time ?? 0)} · ${typeLabel(step.q.type)}`
		: typeLabel(step.q.type);
