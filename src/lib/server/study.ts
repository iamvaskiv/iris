import type Anthropic from '@anthropic-ai/sdk';
import * as env from '$app/env/private';
import type { Question, SampleResponse, SampleResults } from '#lib/cards/types.js';
import { assets } from './assets.js';
import { claude, MODEL } from './llm.js';
import {
	SCALE_MAX,
	SCALE_MIN,
	flatSteps,
	popsUp,
	timecode,
	type FlatStep
} from '#lib/cards/study/question-types.js';

/**
 * Questions as saved: known fields only, an id each, options only on multiple choice. A video step keeps its own
 * questions (`in: 'video'`: those, with a time each, in time order, and never videos or channels); a channel keeps its
 * videos (`in: 'channel'`: video steps only).
 */
export function cleanQuestions(
	input: unknown[],
	inside?: 'video' | 'channel',
	/** Ids used so far in the study: each step's must be its own (the card lists steps by id). */
	seen = new Set<string>()
): Question[] {
	const unique = (id: unknown) => {
		let next = typeof id === 'string' && id && !seen.has(id) ? id : crypto.randomUUID().slice(0, 8);
		while (seen.has(next)) next = crypto.randomUUID().slice(0, 8);
		seen.add(next);
		return next;
	};
	const cleaned = input.map((raw): Question => {
		const q = (raw ?? {}) as Partial<Question>;
		const type =
			inside === 'channel'
				? 'video'
				: q.type === 'choice' ||
					  q.type === 'scale' ||
					  (!inside && (q.type === 'video' || q.type === 'channel'))
					? q.type
					: 'open';
		return {
			id: unique(q.id),
			type,
			text: String(q.text ?? ''),
			...(type === 'open' && q.placeholder ? { placeholder: String(q.placeholder) } : {}),
			...(type === 'choice'
				? { options: (Array.isArray(q.options) ? q.options : []).map(String) }
				: {}),
			...(type === 'video' && q.videoId
				? { videoId: String(q.videoId), ...(q.videoName ? { videoName: String(q.videoName) } : {}) }
				: {}),
			...(type === 'video' && Array.isArray(q.questions) && q.questions.length
				? { questions: cleanQuestions(q.questions, 'video', seen) }
				: {}),
			...(type === 'channel'
				? {
						videos: cleanQuestions(Array.isArray(q.videos) ? q.videos : [], 'channel', seen),
						...(q.vertical ? { vertical: true } : {})
					}
				: {}),
			...(inside === 'video' ? { time: Math.max(0, Number(q.time) || 0) } : {})
		};
	});
	return inside === 'video' ? cleaned.sort((a, b) => (a.time ?? 0) - (b.time ?? 0)) : cleaned;
}

/** Every question in list order, a channel's videos and a video's questions right after it. */
const everyQuestion = (questions: Question[]) => flatSteps(questions).map((s) => s.q);

/** Fills in the names of video steps' videos (in channels too) from the user's assets (Lumi only gives the id). */
export async function nameVideos(questions: Question[]) {
	const ids = everyQuestion(questions).filter(
		(q) => q.type === 'video' && q.videoId && !q.videoName
	);
	await Promise.all(
		ids.map(async (q) => {
			const asset = await assets.get(q.videoId!);
			if (asset) q.videoName = asset.name;
		})
	);
	return questions;
}

/** Bumped when sample results gain something new, so older ones are written again. */
const SAMPLE_VERSION = 5;

/** What sample results depend on: when this changes, they're written again. */
export const basisOf = (questions: Question[]) =>
	JSON.stringify([
		SAMPLE_VERSION,
		...everyQuestion(questions).map((q) => [
			q.type,
			q.time ?? null,
			q.text,
			q.type === 'choice' ? q.options : q.type === 'video' ? q.videoId : null,
			q.type === 'channel' ? (q.videos ?? []).length : null
		])
	]);

type WrittenAnswer = { text: string; sentiment: 'positive' | 'neutral' | 'negative'; age: string };

/** What Lumi writes; the app turns it into counts that add up (see sampleResults). */
type Written = {
	summary: string;
	insights: { title: string; body: string }[];
	quote: { text: string; who: string };
	sentiment: { positive: number; neutral: number; negative: number };
	rating: number;
	completion: number;
	questions: { index: number; shares?: number[]; answers?: WrittenAnswer[] }[];
};

const AGES = ['18–23', '24–32', '33–44', '45+'];

/** The shape Lumi writes in (structured output: every object closed, every field required). */
const obj = (properties: Record<string, unknown>) => ({
	type: 'object',
	properties,
	required: Object.keys(properties),
	additionalProperties: false
});
const writtenSchema = obj({
	summary: {
		type: 'string',
		description: 'Two or three sentences: what the (made-up) audience thought overall.'
	},
	insights: {
		type: 'array',
		description: 'Exactly two key insights.',
		items: obj({
			title: { type: 'string', description: 'A few words.' },
			body: { type: 'string', description: 'One or two sentences.' }
		})
	},
	quote: obj({
		text: { type: 'string', description: 'One telling answer from a respondent.' },
		who: { type: 'string', description: 'e.g. "Respondent, 24–32"' }
	}),
	sentiment: obj({
		positive: { type: 'number' },
		neutral: { type: 'number' },
		negative: { type: 'number' }
	}),
	rating: { type: 'number', description: 'Average rating as a percentage, 0-100.' },
	completion: {
		type: 'number',
		description: 'Percentage of people who answered every question, 50-98.'
	},
	questions: {
		type: 'array',
		description: 'One entry per question.',
		items: obj({
			index: { type: 'integer', description: 'Question number, from 1.' },
			shares: {
				type: 'array',
				items: { type: 'number' },
				description:
					'Multiple choice: percentage per option, in order. Slider: percentage per value from 0 to 10 (11 numbers). Video: percentage of positive, neutral and negative reactions (3 numbers). Channel: one number per video in it, in order: the percentage of the people who reached the channel who opened that video (people can open several, so these can add up to more than 100; make some videos clearly more popular than others). Empty for open questions.'
			},
			answers: {
				type: 'array',
				description:
					"Open questions: 15 to 20 individual answers in the respondents' own words, varied in length, tone and opinion, in line with the sentiment split. Videos: 15 to 20 short reactions to the video, in line with its shares. Empty for multiple choice, sliders and channels.",
				items: obj({
					text: { type: 'string' },
					sentiment: { type: 'string', enum: ['positive', 'neutral', 'negative'] },
					age: { type: 'string', enum: AGES }
				})
			}
		})
	}
});

async function write(title: string, questions: Question[]): Promise<Written> {
	// Numbered in list order, a channel's videos and a video's questions right after it (and marked as such).
	const steps = flatSteps(questions);
	const where = (step: FlatStep) =>
		popsUp(step)
			? `(pops up during the video above, at ${timecode(step.q.time ?? 0)}) `
			: step.parent?.type === 'channel'
				? '(a video in the channel above: only some people choose to watch it) '
				: '';
	const kind = (q: Question) =>
		q.type === 'choice'
			? ` [options: ${(q.options ?? []).join(' | ')}]`
			: q.type === 'scale'
				? ' [slider, 0 to 10]'
				: q.type === 'video'
					? ` [video "${q.videoName ?? q.videoId}": people watch it and react]`
					: q.type === 'channel'
						? ` [channel: a grid of videos people browse and pick from: ${(q.videos ?? []).map((v) => `"${v.videoName ?? v.videoId}"`).join(', ')}]`
						: ' [open answer]';
	const list = steps
		.map((step, i) => `${i + 1}. ${where(step)}${step.q.text || '(untitled)'}${kind(step.q)}`)
		.join('\n');
	const res = await claude().messages.create({
		model: MODEL,
		max_tokens: 16000,
		output_config: { format: { type: 'json_schema', schema: writtenSchema } },
		messages: [
			{
				role: 'user',
				content: `Invent believable results for this study, as if about a hundred people had answered it. It's for a product demo: make the results varied and plausible (not all positive), specific to these questions, with a clear story. Sentiment is the percentage of positive, neutral and negative answers.\n\nStudy: ${title}\n${list}`
			}
		]
	});
	if (res.stop_reason === 'refusal') throw new Error('Lumi declined to write sample results');
	const text = res.content.find((b): b is Anthropic.TextBlock => b.type === 'text')?.text;
	if (!text) throw new Error('No sample results written');
	return JSON.parse(text) as Written;
}

/** Generic results when Lumi can't be reached, so the toggle still works. */
const filler = (questions: Question[]): Written => ({
	summary: 'Most people responded well, with a clear minority who were unconvinced.',
	insights: [
		{ title: 'Strong first impression', body: 'Early answers were the most positive.' },
		{ title: 'Interest fades', body: 'Fewer people answered the later questions.' }
	],
	quote: { text: 'Not what I expected, in a good way.', who: 'Respondent' },
	sentiment: { positive: 56, neutral: 24, negative: 20 },
	rating: 78,
	completion: 85,
	questions: everyQuestion(questions).map((q, i) =>
		q.type === 'channel'
			? { index: i + 1, shares: (q.videos ?? []).map((_, k) => Math.max(15, 75 - k * 20)) }
			: q.type === 'choice'
				? { index: i + 1, shares: (q.options ?? []).map(() => 1 + Math.random() * 9) }
				: q.type === 'scale'
					? { index: i + 1, shares: [1, 1, 2, 3, 5, 8, 12, 18, 22, 16, 12] }
					: {
							...(q.type === 'video' ? { shares: [60, 25, 15] } : {}),
							index: i + 1,
							answers: [
								{ text: 'I liked it.', sentiment: 'positive', age: '24–32' },
								{ text: 'Hard to say.', sentiment: 'neutral', age: '33–44' },
								{ text: 'It was fine, nothing special.', sentiment: 'neutral', age: '18–23' },
								{
									text: "Not for me, it didn't hold my attention.",
									sentiment: 'negative',
									age: '45+'
								}
							]
						}
	)
});

const pick = <T>(list: T[]) => list[Math.floor(Math.random() * list.length)];
const ago = (days: number) =>
	days === 0 ? 'Today' : days === 1 ? 'Yesterday' : `${days} days ago`;

const clamp = (n: unknown, min: number, max: number, fallback: number) =>
	typeof n === 'number' && Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;

/** Splits `total` across `weights` so the parts are whole numbers that add up to it. */
function split(total: number, weights: number[]) {
	const sum = weights.reduce((a, b) => a + Math.max(0, b), 0) || 1;
	const exact = weights.map((w) => (Math.max(0, w) / sum) * total);
	const parts = exact.map(Math.floor);
	const order = exact.map((e, i) => [e - Math.floor(e), i]).sort((a, b) => b[0] - a[0]);
	const missing = total - parts.reduce((a, b) => a + b, 0);
	for (let k = 0; k < missing; k++) parts[order[k % order.length][1]]++;
	return parts;
}

/** Made-up results for a study: Lumi writes the story and the shares; counts are worked out here so they add up. */
export async function sampleResults(title: string, questions: Question[]): Promise<SampleResults> {
	let written: Written;
	let by: SampleResults['by'] = 'lumi';
	try {
		if (!env.ANTHROPIC_API_KEY) throw new Error('No Anthropic key');
		written = await write(title, questions);
	} catch (e) {
		console.error('[study] Lumi could not write sample results, using filler:', e);
		written = filler(questions);
		by = 'filler';
	}

	const views = 80 + Math.floor(Math.random() * 80);
	const completion = Math.round(clamp(written.completion, 30, 100, 85));
	const finished = Math.round((views * completion) / 100);
	const s = written.sentiment ?? {};
	const [positive, neutral, negative] = split(
		100,
		[s.positive, s.neutral, s.negative].map((n) => clamp(n, 0, 100, 1))
	);

	// The people who answered, in random order, each with an age band and a day they answered.
	const people = Array.from({ length: views }, (_, k) => ({
		respondent: k + 1,
		age: pick(AGES),
		days: Math.floor(Math.random() * 14)
	})).sort(() => Math.random() - 0.5);
	/** Someone who hasn't answered this question yet, from `start` on; in the age band when one is given. */
	const who = (used: Set<number>, start: number, age?: string) => {
		const order = people
			.map((_, n) => people[(start + n) % people.length])
			.filter((p) => !used.has(p.respondent));
		const p = order.find((p) => !age || p.age === age) ?? order[0];
		used.add(p.respondent);
		return { respondent: p.respondent, age: p.age, when: ago(p.days), days: p.days };
	};
	const newestFirst = (list: (SampleResponse & { days: number })[]) =>
		list.sort((a, b) => a.days - b.days).map(({ days: _, ...r }) => r);

	const results: SampleResults['questions'] = {};
	const every = flatSteps(questions);
	/** A channel's videos: how many opened each (the channel's picks), which their own counts follow. */
	const opened = new Map<string, number>();
	every.forEach(({ q, parent }, i) => {
		// Fewer people get to each later question, down to those who finished. A channel's video is watched by those
		// who opened it; a question in it is answered by most of them.
		const reached = Math.round(views - ((views - finished) * (i + 1)) / every.length);
		const watched = parent && opened.get(parent.id);
		const responses =
			opened.get(q.id) ?? (watched === undefined ? reached : Math.round((watched || 0) * 0.9));
		const w = written.questions?.find((x) => x.index === i + 1);
		const used = new Set<number>();
		if (q.type === 'channel') {
			// How many opened each of its videos, from the share Lumi gave it (people open several, so not a split).
			const counts = (q.videos ?? []).map((_, k) =>
				Math.round((responses * clamp(w?.shares?.[k], 0, 100, 30)) / 100)
			);
			q.videos?.forEach((v, k) => opened.set(v.id, counts[k]));
			results[q.id] = { responses, counts, people: [] };
		} else if (q.type === 'choice' || q.type === 'scale') {
			// Buckets: the options, or each slider value from 0 to 10.
			const buckets = q.type === 'choice' ? (q.options ?? []).length : SCALE_MAX - SCALE_MIN + 1;
			const counts = split(
				responses,
				Array.from({ length: buckets }, (_, k) => clamp(w?.shares?.[k], 0, 100, 1))
			);
			// A sample of 18 people, in proportion to the counts, with someone for every answer anyone picked.
			const sample = split(Math.min(18, responses), counts);
			counts.forEach((n, k) => {
				if (n > 0 && sample[k] === 0) {
					sample[sample.indexOf(Math.max(...sample))]--;
					sample[k] = 1;
				}
			});
			const picks = sample
				.flatMap((n, option) => Array(n).fill(option))
				.sort(() => Math.random() - 0.5);
			results[q.id] = {
				responses,
				counts,
				people: newestFirst(
					picks.map((k) => ({
						...who(used, i * 7),
						...(q.type === 'choice' ? { option: k } : { value: SCALE_MIN + k })
					}))
				)
			};
		} else {
			results[q.id] = {
				responses,
				// Videos: how the reactions split, positive / neutral / negative.
				...(q.type === 'video'
					? {
							counts: split(
								responses,
								[0, 1, 2].map((k) => clamp(w?.shares?.[k], 0, 100, 1))
							)
						}
					: {}),
				people: newestFirst(
					(w?.answers ?? []).map((a) => ({
						...who(used, i * 7, a.age),
						text: String(a.text),
						sentiment: (['positive', 'neutral', 'negative'] as const).includes(a.sentiment)
							? a.sentiment
							: 'neutral'
					}))
				)
			};
		}
	});

	return {
		basis: basisOf(questions),
		views,
		completion,
		rating: Math.round(clamp(written.rating, 0, 100, 75)),
		sentiment: { positive, neutral, negative },
		summary: String(written.summary ?? ''),
		insights: (written.insights ?? [])
			.slice(0, 2)
			.map((x) => ({ title: String(x.title), body: String(x.body) })),
		quote: {
			text: String(written.quote?.text ?? ''),
			who: String(written.quote?.who ?? 'Respondent')
		},
		questions: results,
		by
	};
}
