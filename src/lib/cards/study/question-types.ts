import type { Question } from '../types';

/** Question types, as people pick them in the setup and read them in the results. */
export const QUESTION_TYPES: { value: Question['type']; label: string }[] = [
	{ value: 'open', label: 'Open question' },
	{ value: 'choice', label: 'Multiple choice' },
	{ value: 'scale', label: 'Slider' },
	{ value: 'video', label: 'Video' }
];

export const typeLabel = (type: Question['type']) =>
	QUESTION_TYPES.find((t) => t.value === type)?.label ?? 'Open question';

/** Slider questions run from SCALE_MIN to SCALE_MAX in whole steps. */
export const SCALE_MIN = 0;
export const SCALE_MAX = 10;

/** What a step is called in lists: its text, or the video's name for a video step. */
export const stepTitle = (q: Question) =>
	q.text || (q.type === 'video' ? q.videoName || 'Untitled video' : 'Untitled question');
