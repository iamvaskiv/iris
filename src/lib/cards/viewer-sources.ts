import { getContext, setContext } from 'svelte';
import { SCALE_MAX, SCALE_MIN, flatSteps } from './study/question-types';
import { toneOf } from './viewer';
import { sliderSpread } from './study/insights';
import type { Card, InsightComment, Insights, StudyData, ViewerData } from './types';

/**
 * Where a video card's viewer data comes from: Lumiere (real viewers, wherever the video was shown), or one of the
 * project's studies that shows the video (a video step, or a video in a channel) and has sample results, named after
 * its card. `reactions` are comments on the whole video, with no moment (a study's video reactions). Its viewers
 * also carry what the video card's Viewers tab shows: answers to questions asked in the video, and the comments viewers
 * liked and disliked most; a study adds its `summary`.
 */
export type ViewerSource = {
	id: string;
	name: string;
	kind: 'lumiere' | 'study';
	viewers: SourceViewers;
	reactions?: { text: string; sentiment: number }[];
	summary?: string;
};
export type SourceViewers = ViewerData &
	Partial<Pick<Insights, 'questions' | 'liked' | 'disliked'>>;

/** How many liked and disliked comments to pick, as Lumiere's insights do. */
const TOP_COMMENTS = 4;

/** A sample response's sentiment as a number, like Lumiere's (-1 to 1). */
const score = { positive: 0.6, neutral: 0, negative: -0.6 } as const;

/**
 * The studies among `cards` that show `videoId` and have (made-up) results, as viewer data for the video: who watched
 * it, their comments (at the moments they left them; ones without a moment are about the whole video) and star
 * ratings, and the open answers to questions popping up in it (as comments at their moments). Older results without
 * star ratings use the slider answers there instead (as ratings out of 10).
 */
export function studySources(cards: Card[], videoId: string): ViewerSource[] {
	return cards.flatMap((card): ViewerSource[] => {
		const data = card.type === 'study' ? (card.data as StudyData | undefined) : undefined;
		const results = data?.sample?.results;
		if (!data || !results) return [];
		const showings = flatSteps(data.questions).filter(
			(s) => s.q.type === 'video' && s.q.videoId === videoId
		);
		if (!showings.length) return [];

		let watched = 0;
		const sentiment = { positive: 0, neutral: 0, negative: 0 };
		const reactions: NonNullable<ViewerSource['reactions']> = [];
		const comments: InsightComment[] = [];
		const stars: NonNullable<ViewerData['ratings']> = [];
		const sliders: NonNullable<ViewerData['ratings']> = [];
		// Multiple-choice and slider questions popping up in the video, in Lumiere's insights' shape.
		const questions: NonNullable<SourceViewers['questions']> = [];
		for (const { q } of showings) {
			const a = results.questions[q.id];
			if (a) {
				watched += a.responses;
				const [positive = 0, neutral = 0, negative = 0] = a.counts ?? [];
				sentiment.positive += positive;
				sentiment.neutral += neutral;
				sentiment.negative += negative;
				for (const p of a.people ?? []) {
					const sentiment = score[p.sentiment ?? 'neutral'];
					if (p.text && p.time !== undefined)
						comments.push({ text: p.text, time: p.time, sentiment });
					else if (p.text) reactions.push({ text: p.text, sentiment });
					if (p.rating !== undefined)
						stars.push({ time: p.time ?? 0, value: p.rating, max: 5, min: 1 });
				}
			}
			for (const popUp of q.questions ?? []) {
				const result = results.questions[popUp.id];
				const answers = result?.people ?? [];
				const time = popUp.time ?? 0;
				if (result?.responses && popUp.type === 'choice' && popUp.options?.length)
					questions.push({
						question: popUp.text,
						type: 'choice',
						responses: result.responses,
						options: popUp.options
							.map((label, i) => ({ label, count: result.counts?.[i] ?? 0 }))
							.sort((x, y) => y.count - x.count)
					});
				if (result?.responses && popUp.type === 'scale' && result.counts?.length) {
					const spread = sliderSpread(result.counts);
					if (spread.n)
						questions.push({
							question: popUp.text,
							type: 'scale',
							responses: result.responses,
							average: Math.round(spread.average * 10) / 10,
							max: SCALE_MAX
						});
				}
				for (const p of answers) {
					if (popUp.type === 'open' && p.text)
						comments.push({ text: p.text, time, sentiment: score[p.sentiment ?? 'neutral'] });
					if (popUp.type === 'scale' && p.value !== undefined)
						sliders.push({ time, value: p.value, max: SCALE_MAX, min: SCALE_MIN });
				}
			}
		}
		const ratings = stars.length ? stars : sliders;
		const ratingMax = stars.length ? 5 : SCALE_MAX;
		const average = ratings.length
			? Math.round((ratings.reduce((n, r) => n + r.value, 0) / ratings.length) * 10) / 10
			: undefined;
		const counted = sentiment.positive + sentiment.neutral + sentiment.negative;
		comments.sort((x, y) => x.time - y.time);
		const byTone = (tone: 'positive' | 'negative') =>
			comments.filter((c) => toneOf(c.sentiment) === tone).slice(0, TOP_COMMENTS);
		return [
			{
				id: card.id,
				name: card.title,
				kind: 'study',
				reactions,
				summary: results.summary,
				viewers: {
					views: results.views,
					responses: watched,
					rating:
						average !== undefined ? { average, max: ratingMax, count: ratings.length } : undefined,
					sentiment: counted ? sentiment : undefined,
					comments,
					ratings: ratings.sort((x, y) => x.time - y.time),
					questions: questions.sort((x, y) => y.responses - x.responses),
					liked: byTone('positive'),
					disliked: byTone('negative')
				}
			}
		];
	});
}

/**
 * Every source of a video's viewer data, in order: Lumiere (when it has data for it), then the studies among `cards`
 * that show it.
 */
export function viewerSources(
	lumiere: SourceViewers | undefined,
	cards: Card[],
	videoId: string | undefined
) {
	return [
		...(lumiere
			? [{ id: 'lumiere', name: 'Lumiere', kind: 'lumiere' as const, viewers: lumiere }]
			: []),
		...(videoId ? studySources(cards, videoId) : [])
	];
}

const KEY = Symbol('project cards');
type Shared = { cards: () => Card[]; update?: (id: string, data: Card['data']) => void };

/**
 * Lets the cards on a page see the project's other cards (a video card finds the studies that show its video), and,
 * with `update`, hand back data they changed themselves (a study's new sample results), so the others see it at once.
 */
export const shareProjectCards = (cards: () => Card[], update?: Shared['update']) =>
	setContext<Shared>(KEY, { cards, update });

/** The project's cards, if the page shares them (not in Storybook). */
export const projectCards = () => getContext<Shared | undefined>(KEY)?.cards;

/** Hands a card's own changed data back to the page, if it shares its cards. */
export const projectCardUpdate = () => getContext<Shared | undefined>(KEY)?.update;
