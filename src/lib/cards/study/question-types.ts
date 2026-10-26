import type { Question } from '../types';

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
