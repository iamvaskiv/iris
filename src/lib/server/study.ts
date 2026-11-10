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
const SAMPLE_VERSION = 6;

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

type WrittenAnswer = {
	text: string;
	sentiment: 'positive' | 'neutral' | 'negative';
	age: string;
	/** Videos: when in it the comment was left, and the viewer's star rating (null otherwise). */
	time: number | null;
	rating: number | null;
	/** Open questions: which of the question's themes it belongs to (index), null otherwise. */
	theme: number | null;
};

/** What Lumi writes; the app turns it into counts that add up (see sampleResults). */
type Written = {
	intent: string;
	summary: string;
	headline: string;
	keyQuestions: {
		question: string;
		answer: string;
		figure: string;
		verdict: string;
		evidence: { index: number; text: string; figure: string }[];
		confidence: 'high' | 'medium' | 'low';
	}[];
	recommendations: { title: string; body: string }[];
	followUps: string[];
	quote: { text: string; who: string; questionIndex: number | null; theme: number | null };
	sentiment: { positive: number; neutral: number; negative: number };
	rating: number;
	completion: number;
	questions: {
		index: number;
		label?: string;
		takeaway?: string;
		ageNote?: string;
		themes?: { label: string; share: number; sentiment: 'positive' | 'neutral' | 'negative' }[];
		stars?: number;
		shares?: number[];
		answers?: WrittenAnswer[];
	}[];
};

import { RESULTS_VERSION } from '#lib/cards/study/insights.js';
export { RESULTS_VERSION };

const AGES = ['18–23', '24–32', '33–44', '45+'];

/** The shape Lumi writes in (structured output: every object closed, every field required). */
const obj = (properties: Record<string, unknown>) => ({
	type: 'object',
	properties,
	required: Object.keys(properties),
	additionalProperties: false
});
const TONE = { type: 'string', enum: ['positive', 'neutral', 'negative'] };
const writtenSchema = obj({
	intent: {
		type: 'string',
		description:
			'One short sentence: what the study\'s author is trying to find out, judging by how it\'s built (its videos, the questions and when they pop up). E.g. "Whether the trailer lands, and which new emotion to lead the marketing with."'
	},
	summary: {
		type: 'string',
		description: 'Two or three sentences: what the (made-up) audience thought overall.'
	},
	headline: {
		type: 'string',
		description:
			'The whole story in at most twelve words, plain and punchy, no numbers needed: "Trailer lands; lead the marketing with Anxiety."'
	},
	keyQuestions: {
		type: 'array',
		description:
			'Two to four questions the author built the study to answer (their intent, in plain words, e.g. "Does the trailer land?", "Which new emotion should lead?", "Is version A or B better?"), each answered from these results. Order by importance.',
		items: obj({
			question: { type: 'string', description: 'The question behind the study, short.' },
			answer: {
				type: 'string',
				description:
					'A direct one-sentence verdict with the deciding number, e.g. "Yes: 4.2 of 5 stars, and 68% gave the new emotions 7 or more."'
			},
			figure: {
				type: 'string',
				description:
					'The one deciding figure, as short as possible, shown big: "4.2 ★", "73%", "Anxiety", "Version B".'
			},
			verdict: {
				type: 'string',
				description:
					'The verdict in at most six words, leading with the answer and NOT repeating the figure: "Yes, 72% positive", "Mostly, scoring 7+", "Clearly, ahead of Ennui", "Partly: a third uneasy".'
			},
			evidence: {
				type: 'array',
				description: 'One to three study questions that back the answer.',
				items: obj({
					index: { type: 'integer', description: 'Question number, from 1.' },
					text: {
						type: 'string',
						description: 'The finding there, a few words with its number: "41% picked Anxiety".'
					},
					figure: {
						type: 'string',
						description: 'Just its number, as short as possible: "41%", "4.2 ★", "7.1 / 10".'
					}
				})
			},
			confidence: {
				type: 'string',
				enum: ['high', 'medium', 'low'],
				description:
					'How sure the sample makes the answer: high when the margin is clear and many answered, low when it is close or few answered.'
			}
		})
	},
	recommendations: {
		type: 'array',
		description: 'Two or three things to do next, given the results.',
		items: obj({
			title: { type: 'string', description: 'A few words, as an action.' },
			body: { type: 'string', description: 'One sentence: why, from the results.' }
		})
	},
	followUps: {
		type: 'array',
		items: { type: 'string' },
		description:
			'Three short questions the author might ask next about these results, written as their own request to an assistant (e.g. "Why do people feel Joy is sidelined?").'
	},
	quote: obj({
		text: {
			type: 'string',
			description:
				'One telling answer from a respondent, backing the main finding, under 25 words. Prefer one of the open answers you wrote.'
		},
		who: { type: 'string', description: 'e.g. "Respondent, 24–32"' },
		questionIndex: {
			type: ['integer', 'null'],
			description:
				"When it is one of the open answers: that question's number (from 1). Null otherwise."
		},
		theme: {
			type: ['integer', 'null'],
			description:
				"When it is one of the open answers: its theme's index (from 0) in that question. Null otherwise."
		}
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
			label: {
				type: 'string',
				description:
					'Two to four words naming what this question measures, for a headline number: "Trailer rating", "Like the new emotions", "Lead pick", "Most opened".'
			},
			takeaway: {
				type: 'string',
				description:
					'One short sentence: what the answers to this question say, with its key number.'
			},
			ageNote: {
				type: 'string',
				description:
					'When one age band (18–23, 24–32, 33–44, 45+) answered noticeably differently, one short sentence on how; otherwise empty.'
			},
			stars: {
				type: 'number',
				description:
					"Videos: everyone's average star rating, 1 to 5 with one decimal (the one you quote). 0 for every other kind."
			},
			themes: {
				type: 'array',
				description:
					'Open questions: three to five themes the answers share, each with its share of answers (percentages adding up to 100) and its tone. Empty for every other kind.',
				items: obj({
					label: { type: 'string', description: 'Two to four words.' },
					share: { type: 'number' },
					sentiment: TONE
				})
			},
			shares: {
				type: 'array',
				items: { type: 'number' },
				description:
					'Multiple choice: percentage per option, in order. Slider: percentage per value from 0 to 10 (11 numbers). Video: percentage of positive, neutral and negative reactions (3 numbers). Channel: one number per video in it, in order: the percentage of the people who reached the channel who opened that video (people can open several, so these can add up to more than 100; make some videos clearly more popular than others). Empty for open questions.'
			},
			answers: {
				type: 'array',
				description:
					"Open questions: 15 to 20 individual answers in the respondents' own words, varied in length, tone and opinion, in line with the sentiment split. Videos: 15 to 20 short comments viewers left while watching, each at a moment in the video (spread along it, about what happens there, as people react to scenes) and with the star rating that viewer gave the video, in line with its shares. Empty for multiple choice, sliders and channels.",
				items: obj({
					text: { type: 'string' },
					sentiment: { type: 'string', enum: ['positive', 'neutral', 'negative'] },
					age: { type: 'string', enum: AGES },
					time: {
						type: ['number', 'null'],
						description:
							'Videos: seconds into the video when this comment was left, within its length. Null otherwise.'
					},
					rating: {
						type: ['integer', 'null'],
						description:
							'Videos: the star rating this viewer gave the video, 1 to 5, in line with their comment. Null otherwise.'
					},
					theme: {
						type: ['integer', 'null'],
						description:
							"Open questions: the index (from 0) of the question's theme this answer belongs to, in line with the themes' shares. Null otherwise."
					}
				})
			}
		})
	}
});

/** How long each video in the study is (seconds), for placing comments along it. */
async function videoLengths(questions: Question[]) {
	const ids = [...new Set(everyQuestion(questions).flatMap((q) => (q.videoId ? [q.videoId] : [])))];
	const lengths = await Promise.all(ids.map(async (id) => (await assets.get(id))?.duration));
	return new Map(ids.map((id, k) => [id, lengths[k]]));
}

async function write(
	title: string,
	questions: Question[],
	lengths: Map<string, number | undefined>,
	intent?: string
): Promise<Written> {
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
					? ` [video "${q.videoName ?? q.videoId}"${lengths.get(q.videoId ?? '') ? `, ${timecode(lengths.get(q.videoId ?? '')!)} long` : ''}: people watch it, comment at moments and rate it 1 to 5 stars]`
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
				content: `Invent believable results for this study, as if about a hundred people had answered it. It's for a product demo: make the results varied and plausible (not all positive), specific to these questions, with a clear story. Sentiment is the percentage of positive, neutral and negative answers.\n\nFirst work out what the author wants to learn from how the study is built: what each video is for, why each question is asked where it is (a question popping up at a moment in a video is about that moment), what comparing several videos or offering a channel says about their goal. Then answer those questions directly from the results, keeping every number you mention consistent with the shares you give.${intent?.trim() ? `\n\nThe author says the study is for: ${intent.trim()}. Start from that (put it in your own words as the intent), adding anything else the study's build shows they want to know.` : ''}\n\nStudy: ${title}\n${list}`
			}
		]
	});
	if (res.stop_reason === 'refusal') throw new Error('Lumi declined to write sample results');
	const text = res.content.find((b): b is Anthropic.TextBlock => b.type === 'text')?.text;
	if (!text) throw new Error('No sample results written');
	return JSON.parse(text) as Written;
}

/** Generic results when Lumi can't be reached, so the toggle still works. */
const filler = (questions: Question[], lengths: Map<string, number | undefined>): Written => ({
	intent: 'How people respond to what the study shows them.',
	summary: 'Most people responded well, with a clear minority who were unconvinced.',
	headline: 'Mostly well received, with a few unconvinced.',
	keyQuestions: [
		{
			question: 'Did it land?',
			answer: 'Mostly: a clear majority responded well.',
			figure: 'Mostly',
			verdict: 'a clear majority responded well',
			evidence: [{ index: 1, text: 'Mostly positive', figure: 'Mostly positive' }],
			confidence: 'medium'
		}
	],
	recommendations: [
		{ title: 'Ask a follow-up', body: 'Find out what the unconvinced minority missed.' }
	],
	followUps: ['What did the unconvinced minority dislike?'],
	quote: {
		text: 'Not what I expected, in a good way.',
		who: 'Respondent',
		questionIndex: null,
		theme: null
	},
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
							...(q.type === 'open'
								? {
										themes: [
											{ label: 'Liked it', share: 60, sentiment: 'positive' as const },
											{ label: 'Unsure', share: 40, sentiment: 'neutral' as const }
										]
									}
								: {}),
							index: i + 1,
							answers: (
								[
									['I liked it.', 'positive', '24–32', 5],
									['Hard to say.', 'neutral', '33–44', 3],
									['It was fine, nothing special.', 'neutral', '18–23', 3],
									["Not for me, it didn't hold my attention.", 'negative', '45+', 2]
								] as const
							).map(([text, sentiment, age, stars], k) => {
								// Videos: spread along it, each with a star rating.
								const length = q.type === 'video' ? lengths.get(q.videoId ?? '') : undefined;
								return {
									text,
									sentiment,
									age,
									time: length ? ((k + 1) / 5) * length : null,
									rating: q.type === 'video' ? stars : null,
									theme: q.type === 'open' ? (sentiment === 'positive' ? 0 : 1) : null
								};
							})
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
	if (!weights.length) return [];
	const sum = weights.reduce((a, b) => a + Math.max(0, b), 0) || 1;
	const exact = weights.map((w) => (Math.max(0, w) / sum) * total);
	const parts = exact.map(Math.floor);
	const order = exact.map((e, i) => [e - Math.floor(e), i]).sort((a, b) => b[0] - a[0]);
	const missing = total - parts.reduce((a, b) => a + b, 0);
	for (let k = 0; k < missing; k++) parts[order[k % order.length][1]]++;
	return parts;
}

/** Made-up results for a study: Lumi writes the story and the shares; counts are worked out here so they add up. */
export async function sampleResults(
	title: string,
	questions: Question[],
	/** What the author says the study is for (shown under its title): the reading starts from it. */
	intent?: string
): Promise<SampleResults> {
	let written: Written;
	let by: SampleResults['by'] = 'lumi';
	const lengths = await videoLengths(questions);
	try {
		if (!env.ANTHROPIC_API_KEY) throw new Error('No Anthropic key');
		written = await write(title, questions, lengths, intent);
	} catch (e) {
		console.error('[study] Lumi could not write sample results, using filler:', e);
		written = filler(questions, lengths);
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
		// Lumi's reading of it: a label for headline numbers, a takeaway and, when one age band stood out, a note.
		const reading = {
			...(q.type === 'video' && typeof w?.stars === 'number' && w.stars >= 1
				? { stars: Math.round(clamp(w.stars, 1, 5, 4) * 10) / 10 }
				: {}),
			...(w?.label ? { label: String(w.label) } : {}),
			...(w?.takeaway ? { takeaway: String(w.takeaway) } : {}),
			...(w?.ageNote?.trim() ? { ageNote: String(w.ageNote) } : {})
		};
		if (q.type === 'channel') {
			// How many opened each of its videos, from the share Lumi gave it (people open several, so not a split).
			const counts = (q.videos ?? []).map((_, k) =>
				Math.round((responses * clamp(w?.shares?.[k], 0, 100, 30)) / 100)
			);
			q.videos?.forEach((v, k) => opened.set(v.id, counts[k]));
			results[q.id] = { responses, counts, people: [], ...reading };
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
				),
				...reading
			};
		} else {
			// Open questions: their themes, each share worked out from whole answers so they add up.
			const themes = (q.type === 'open' ? (w?.themes ?? []) : []).slice(0, 5).map((t) => ({
				label: String(t.label),
				sentiment: (['positive', 'neutral', 'negative'] as const).includes(t.sentiment)
					? t.sentiment
					: ('neutral' as const),
				share: clamp(t.share, 0, 100, 0)
			}));
			const themeCounts = themes.length
				? split(
						responses,
						themes.map((t) => t.share)
					)
				: [];
			results[q.id] = {
				responses,
				...reading,
				...(themes.length
					? {
							themes: themes.map((t, k) => ({
								...t,
								share: Math.round((themeCounts[k] / Math.max(1, responses)) * 100)
							}))
						}
					: {}),
				...(q.type === 'video' && lengths.get(q.videoId ?? '')
					? { duration: lengths.get(q.videoId ?? '') }
					: {}),
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
							: 'neutral',
						// Videos: where in it they commented (within its length), and the stars they gave it.
						...(q.type === 'video' && typeof a.time === 'number'
							? { time: clamp(a.time, 0, lengths.get(q.videoId ?? '') ?? a.time, 0) }
							: {}),
						...(q.type === 'video' && typeof a.rating === 'number'
							? { rating: Math.round(clamp(a.rating, 1, 5, 3)) }
							: {}),
						...(themes.length &&
						typeof a.theme === 'number' &&
						a.theme >= 0 &&
						a.theme < themes.length
							? { theme: a.theme }
							: {})
					}))
				)
			};
		}
	});

	// Evidence points at study questions by number; the card links them by id.
	const idAt = (index: number) => every[index - 1]?.q.id;
	const confidence = (c: unknown) =>
		c === 'high' || c === 'medium' || c === 'low' ? c : ('medium' as const);
	return {
		basis: basisOf(questions),
		version: RESULTS_VERSION,
		views,
		completion,
		rating: Math.round(clamp(written.rating, 0, 100, 75)),
		sentiment: { positive, neutral, negative },
		intent: String(written.intent ?? ''),
		summary: String(written.summary ?? ''),
		...(written.headline ? { headline: String(written.headline) } : {}),
		answers: (written.keyQuestions ?? []).slice(0, 4).map((k) => ({
			question: String(k.question),
			answer: String(k.answer),
			...(k.figure ? { figure: String(k.figure) } : {}),
			...(k.verdict ? { verdict: String(k.verdict) } : {}),
			evidence: (k.evidence ?? [])
				.map((e) => ({
					id: idAt(e.index) ?? '',
					text: String(e.text),
					...(e.figure ? { figure: String(e.figure) } : {})
				}))
				.filter((e) => e.id)
				.slice(0, 3),
			confidence: confidence(k.confidence)
		})),
		recommendations: (written.recommendations ?? [])
			.slice(0, 3)
			.map((r) => ({ title: String(r.title), body: String(r.body) })),
		followUps: (written.followUps ?? []).slice(0, 3).map(String),
		quote: {
			text: String(written.quote?.text ?? ''),
			who: String(written.quote?.who ?? 'Respondent'),
			// Which open question and theme it comes from, when those exist.
			...(() => {
				const id = idAt(written.quote?.questionIndex ?? 0);
				const theme = written.quote?.theme;
				return id &&
					typeof theme === 'number' &&
					(results[id]?.themes?.length ?? 0) > theme &&
					theme >= 0
					? { from: { id, theme } }
					: {};
			})()
		},
		questions: results,
		by
	};
}
