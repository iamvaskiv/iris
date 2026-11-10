import { quoted } from '#lib/ask-lumi.js';
import { timecode } from './format';
import type { Insights, InsightComment, ViewerData } from './types';
import type { ViewerSource } from './viewer-sources';

/**
 * The questions the viewer-data cards (Insights, Sources, Viewers) offer Lumi (see `ask-lumi.ts`), worded from what's
 * on the card, like the video card's `video/questions.ts`. Each names the video, so Lumi knows which card it's about.
 */

/** How close (in seconds) comments and ratings have to be to a moment to count towards it. */
const NEAR = 6;

type Mood = 'negative' | 'positive' | 'mixed';
type Rating = NonNullable<ViewerData['ratings']>[number];

const near = <T extends { time: number }>(list: T[], t: number, within = NEAR) =>
	list.filter((x) => Math.abs(x.time - t) <= within);
/** The mood of some comments, by their average sentiment (as the video card's `sentiment()`). */
function moodOf(comments: { sentiment: number }[]): Mood | undefined {
	if (!comments.length) return undefined;
	const mood = comments.reduce((n, c) => n + c.sentiment, 0) / comments.length;
	return mood < -0.15 ? 'negative' : mood > 0.15 ? 'positive' : 'mixed';
}
const average = (list: { value: number }[]) =>
	list.reduce((n, r) => n + r.value, 0) / (list.length || 1);
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** “A”, “B” and “C”. */
const listed = (items: string[]) =>
	items.length < 2 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;
/** What a moment's mood asks: why it dips, peaks or splits there. */
const moodFollowUp: Record<Mood, string> = {
	negative: 'What happened there, and why did they react that way?',
	positive: 'What made them like it?',
	mixed: 'What happened there, and what did they make of it?'
};
const moodPhrase: Record<Mood, string> = {
	negative: 'turn negative',
	positive: 'are at their most positive',
	mixed: 'are mixed'
};

// One figure from a source's viewer data, as the cards show it (Viewers, Rating, Positive, Negative, Comments).
export type Metric = 'Viewers' | 'Rating' | 'Positive' | 'Negative' | 'Comments';
type Figure = { value: number; text: string };
function figure(
	s: Pick<ViewerSource, 'viewers' | 'reactions'>,
	metric: Metric
): Figure | undefined {
	const v = s.viewers;
	const counted = v.sentiment
		? v.sentiment.positive + v.sentiment.neutral + v.sentiment.negative
		: 0;
	const share = (k: 'positive' | 'negative') => {
		if (!counted) return undefined;
		const value = (v.sentiment![k] / counted) * 100;
		return { value, text: `${Math.round(value)}%` };
	};
	switch (metric) {
		case 'Viewers':
			return { value: v.responses, text: v.responses.toLocaleString() };
		case 'Rating':
			return (
				v.rating && {
					value: v.rating.average / v.rating.max,
					text: `${v.rating.average} / ${v.rating.max}`
				}
			);
		case 'Positive':
			return share('positive');
		case 'Negative':
			return share('negative');
		case 'Comments': {
			const n = (v.comments?.length ?? 0) + (s.reactions?.length ?? 0);
			return { value: n, text: n.toLocaleString() };
		}
	}
}
/** “The rating of “X”” and so on, for a figure's statement. */
const figureNoun: Record<Metric, string> = {
	Viewers: 'The number of viewers',
	Rating: 'The rating',
	Positive: 'The share of positive comments',
	Negative: 'The share of negative comments',
	Comments: 'The number of comments'
};
/** Why is it higher, lower, or just different from the others? */
function rank(me: Figure, others: Figure[]) {
	if (others.every((o) => me.value > o.value))
		return others.length > 1 ? 'Why is it the highest' : 'Why is it higher';
	if (others.every((o) => me.value < o.value))
		return others.length > 1 ? 'Why is it the lowest' : 'Why is it lower';
	return 'What makes the difference';
}

/** Who a source's viewers are: Lumiere's real viewers, or a study's sample. */
const who = (s: Pick<ViewerSource, 'kind' | 'name'>) =>
	s.kind === 'lumiere' ? "Lumiere's real viewers" : `the sample in ${quoted(s.name)}`;

/** Questions for the Sources card: one video, its viewer data compared across sources. */
export function sourcesQuestions(
	videoName: string,
	scenes: { title: string; start: number; end: number }[],
	sources: ViewerSource[]
) {
	const video = quoted(videoName);
	const sceneAt = (t: number) => scenes.find((s) => s.start <= t && t < s.end);
	const where = (t: number) => {
		const scene = sceneAt(t);
		return `around ${timecode(t)}${scene ? ` (in ${quoted(scene.title)})` : ''}`;
	};
	const several = sources.length > 1;

	return {
		/** A source's row: how its viewers differ from the others. */
		source: (s: ViewerSource) =>
			several
				? `How do ${who(s)} of ${video} differ from ${listed(sources.filter((o) => o !== s).map(who))}?`
				: `Who are ${who(s)} of ${video}, and what stands out in their responses?`,

		/** One of a source's key numbers, against the other sources'. */
		stat: (s: ViewerSource, metric: Metric) => {
			const me = figure(s, metric);
			if (!me) return null;
			const others = sources
				.filter((o) => o !== s)
				.map((o) => ({ o, f: figure(o, metric) }))
				.filter((x) => x.f) as { o: ViewerSource; f: Figure }[];
			if (metric === 'Viewers')
				return others.length
					? `${capital(who(s))} of ${video} number ${me.text}, against ${listed(
							others.map((x) => `${x.f.text} in ${who(x.o)}`)
						)}. How do these audiences differ?`
					: `Who are the ${me.text} people in ${who(s)} of ${video}, and what stands out in their responses?`;
			const statement = `${figureNoun[metric]} for ${video} is ${me.text} from ${who(s)}`;
			if (!others.length) return `${statement}. Why?`;
			return `${statement}, against ${listed(
				others.map((x) => `${x.f.text} from ${who(x.o)}`)
			)}. ${rank(
				me,
				others.map((x) => x.f)
			)} there?`;
		},

		scene: (i: number) => {
			const scene = scenes[i];
			if (!scene) return null;
			const reacted = sources.filter((s) =>
				s.viewers.comments?.some((c) => scene.start <= c.time && c.time < scene.end)
			);
			return `What happens in the scene ${quoted(scene.title)} (${timecode(scene.start)}–${timecode(scene.end)}) of ${video}${
				reacted.length ? `, and how did ${listed(reacted.map(who))} react to it` : ''
			}?`;
		},

		/** The sentiment curves at a moment: why they dip or peak there, and why sources disagree. */
		sentiment: (t: number) => {
			const moods = sources
				.map((s) => ({ s, mood: moodOf(near(s.viewers.comments ?? [], t)) }))
				.filter((x) => x.mood) as { s: ViewerSource; mood: Mood }[];
			if (!moods.length) return `How did viewers feel ${where(t)} in ${video}?`;
			const [first] = moods;
			if (moods.every((m) => m.mood === first.mood))
				return `Comments from ${listed(moods.map((m) => who(m.s)))} ${moodPhrase[first.mood]} ${where(t)} in ${video}. ${moodFollowUp[first.mood]}`;
			return `${capital(where(t))} in ${video}, comments from ${listed(
				moods.map((m) => `${who(m.s)} are ${m.mood}`)
			)}. Why do they react differently?`;
		},

		/** The rating curves at a moment, source against source. */
		rating: (t: number) => {
			const rated = sources
				.map((s) => ({ s, around: near(s.viewers.ratings ?? [], t) }))
				.filter((x) => x.around.length);
			if (!rated.length)
				return `How do ratings of ${video} change along the video, and what drives them?`;
			const text = ({ around }: { around: Rating[] }) =>
				`${average(around).toFixed(1)} / ${around[0].max}`;
			if (rated.length === 1) {
				const [{ s, around }] = rated;
				const all = s.viewers.ratings ?? [];
				const here = average(around);
				const how =
					here > average(all) + 0.2
						? 'higher'
						: here < average(all) - 0.2
							? 'lower'
							: 'about average';
				return `Ratings from ${who(s)} ${where(t)} in ${video} are ${how} (${text(rated[0])}). Why?`;
			}
			return `${capital(where(t))} in ${video}, ratings are ${listed(
				rated.map((r) => `${text(r)} from ${who(r.s)}`)
			)}. Why do they differ?`;
		},

		comment: (s: ViewerSource, c: InsightComment) =>
			`A viewer in ${who(s)} commented ${quoted(c.text)} at ${timecode(c.time)} in ${video}. What were they reacting to?`,

		/** A source's lane of comments. */
		comments: (s: ViewerSource) => {
			const n = s.viewers.comments?.length ?? 0;
			return n
				? `What were the ${n} comments from ${who(s)} on ${video} about?`
				: `Why are there no comments from ${who(s)} on ${video}?`;
		}
	};
}

/** A video on the Viewers card: its name, length (seconds) and the source it shows. */
type ViewersVideo = { name: string; length: number; source?: ViewerSource };

/** Questions for the Viewers card: several videos, how their viewers reacted, compared along each video (0–100%). */
export function viewersQuestions(videos: ViewersVideo[]) {
	const name = (v: ViewersVideo) =>
		quoted(v.name) + (v.source?.kind === 'study' ? ` (sample in ${quoted(v.source.name)})` : '');
	const withSource = videos.filter((v) => v.source) as (ViewersVideo & { source: ViewerSource })[];
	const point = (p: number) =>
		p < 3 ? 'At the start' : p > 97 ? 'At the end' : `About ${Math.round(p)}% of the way through`;
	/** The moment `p`% of the way through a video, and the window around it that counts as near. */
	const momentIn = (v: ViewersVideo, p: number) => {
		const t = (p / 100) * v.length;
		return { t, within: Math.max(NEAR, v.length * 0.04) };
	};

	return {
		/** A video's row: how its viewers reacted, against the others. */
		video: (v: ViewersVideo) => {
			const others = withSource.filter((o) => o !== v);
			return others.length
				? `How did viewers react to ${name(v)}, compared with ${listed(others.map(name))}?`
				: `How did viewers react to ${name(v)}?`;
		},

		/** One of a video's key numbers, against the other videos'. */
		stat: (v: ViewersVideo, metric: Metric) => {
			const me = v.source && figure(v.source, metric);
			if (!me) return null;
			const others = withSource
				.filter((o) => o !== v)
				.map((o) => ({ o, f: figure(o.source, metric) }))
				.filter((x) => x.f) as { o: ViewersVideo; f: Figure }[];
			const statement = `${figureNoun[metric]} for ${name(v)} is ${me.text}`;
			if (!others.length) return `${statement}. Why?`;
			return `${statement}, against ${listed(others.map((x) => `${x.f.text} for ${quoted(x.o.name)}`))}. ${rank(
				me,
				others.map((x) => x.f)
			)}?`;
		},

		/** The sentiment curves `p`% of the way through: why they dip or peak there, and why videos disagree. */
		sentiment: (p: number) => {
			const moods = withSource
				.filter((v) => v.length)
				.map((v) => {
					const { t, within } = momentIn(v, p);
					return { v, t, mood: moodOf(near(v.source.viewers.comments ?? [], t, within)) };
				})
				.filter((x) => x.mood) as { v: ViewersVideo; t: number; mood: Mood }[];
			const at = (m: { v: ViewersVideo; t: number }) => `${quoted(m.v.name)} (at ${timecode(m.t)})`;
			if (!moods.length)
				return `${point(p)}, how did viewers feel about ${listed(withSource.map(name))}?`;
			const [first] = moods;
			if (moods.length === 1)
				return `${point(p)} ${at(first)}, viewers' comments ${moodPhrase[first.mood]}. ${moodFollowUp[first.mood]}`;
			if (moods.every((m) => m.mood === first.mood))
				return `${point(p)}, comments on ${listed(moods.map(at))} ${moodPhrase[first.mood]}. What happens in each there?`;
			return `${point(p)}, comments on ${listed(moods.map((m) => `${at(m)} are ${m.mood}`))}. What happens in each there, and why do viewers react differently?`;
		},

		/** The rating curves `p`% of the way through, video against video. */
		rating: (p: number) => {
			const rated = withSource
				.filter((v) => v.length)
				.map((v) => {
					const { t, within } = momentIn(v, p);
					return { v, t, around: near(v.source.viewers.ratings ?? [], t, within) };
				})
				.filter((x) => x.around.length);
			if (!rated.length)
				return `How do ratings change along ${listed(withSource.map(name))}, and what drives them?`;
			const text = (r: (typeof rated)[number]) =>
				`${quoted(r.v.name)} ${average(r.around).toFixed(1)} / ${r.around[0].max} (at ${timecode(r.t)})`;
			return rated.length === 1
				? `${point(p)}, viewers rate ${text(rated[0])}. Why?`
				: `${point(p)}, viewers rate ${listed(rated.map(text))}. Why do they differ?`;
		},

		comment: (v: ViewersVideo, c: InsightComment) =>
			`A viewer commented ${quoted(c.text)} at ${timecode(c.time)} in ${name(v)}. What were they reacting to?`,

		/** A video's lane of comments. */
		comments: (v: ViewersVideo) => {
			const n = v.source?.viewers.comments?.length ?? 0;
			return n
				? `What were the ${n} comments on ${name(v)} about?`
				: `Why are there no comments on ${name(v)}?`;
		}
	};
}

/** Questions for the Insights card: what an audience made of one video, named by the card's title. */
export function insightsQuestions(
	title: string,
	data: Pick<Insights, 'responses' | 'views' | 'rating' | 'sentiment'>,
	/** How to name the video: the video card passes its own title; the viewer data card names the video by the card. */
	video = `the video in ${quoted(title)}`
) {
	const counts = data.sentiment;
	const total = counts ? counts.positive + counts.neutral + counts.negative : 0;

	return {
		views: `How many people have watched ${video}, and how has that changed over time?`,
		responses: `Who are the ${data.responses.toLocaleString()} people who responded to ${video}, and what stands out in their responses?`,
		rating:
			data.rating &&
			`Why is ${video} rated ${data.rating.average} / ${data.rating.max} (${data.rating.count} votes)? What did people like and dislike?`,
		positive:
			counts && total
				? `Why are ${Math.round((counts.positive / total) * 100)}% of comments on ${video} positive?`
				: undefined,
		sentiment:
			counts && total
				? `What did viewers like and dislike about ${video}? Sum up the ${total} comments (${counts.positive} positive, ${counts.neutral} neutral, ${counts.negative} negative).`
				: undefined,

		/** A question shown during the video, and its answers. */
		question: (q: Insights['questions'][number]) => {
			if (q.average !== undefined && q.max)
				return `Viewers of ${video} answered ${quoted(q.question)} with ${q.average} / ${q.max} on average. Why?`;
			const all = q.options?.reduce((n, o) => n + o.count, 0) ?? 0;
			const top = q.options?.[0];
			const share = top && all ? Math.round((top.count / all) * 100) : 0;
			return top && all
				? share > 50
					? `Most viewers of ${video} answered ${quoted(q.question)} with ${quoted(top.label)} (${share}%). Why?`
					: `The top answer to ${quoted(q.question)} from viewers of ${video} was ${quoted(top.label)} (${share}%). Why?`
				: `How did viewers of ${video} answer ${quoted(q.question)}?`;
		},

		/** One answer to a multiple-choice question. */
		option: (
			q: Insights['questions'][number],
			option: { label: string; count: number },
			all: number
		) =>
			`Why did ${Math.round((option.count / (all || 1)) * 100)}% of viewers of ${video} answer ${quoted(
				q.question
			)} with ${quoted(option.label)}?`,

		/** A comment among what viewers liked or didn't. */
		comment: (c: InsightComment, liked: boolean) =>
			`A viewer said ${quoted(c.text)} at ${timecode(c.time)} in ${video}. ${
				liked
					? 'What did they like about it, and do others agree?'
					: 'What put them off, and do others agree?'
			}`
	};
}
