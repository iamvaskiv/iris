import { quoted } from '#lib/ask-lumi.js';
import { timecode } from '../format';
import type { Tone } from '../viewer';
import type { Span } from '../types';

type Scene = { title: string; start: number; end?: number };
type Named = { name: string; appearances?: Span[] };
type Comment = { time: number; text: string; sentiment: number; tone: Tone };
type Rating = { time: number; value: number; max: number };

/** How close (in seconds) comments and ratings have to be to a moment to count towards it. */
const NEAR = 6;

/**
 * The questions a video card offers Lumi (see `ask-lumi.ts`), worded from what's on the card: its title, the scene at
 * a moment, the comments and ratings around it. Each names the video, so Lumi knows which card it's about.
 */
export function videoQuestions(
	title: string,
	duration: number,
	scenes: Scene[],
	comments: Comment[],
	ratings: Rating[]
) {
	const video = quoted(title);
	const sceneAt = (t: number) =>
		scenes.findLast((s, i) => s.start <= t && t < (s.end ?? scenes[i + 1]?.start ?? Infinity));
	const where = (t: number) => {
		const scene = sceneAt(t);
		return `around ${timecode(t)}${scene ? ` (in ${quoted(scene.title)})` : ''}`;
	};
	const near = <T extends { time: number }>(list: T[], t: number) =>
		list.filter((x) => Math.abs(x.time - t) <= NEAR);
	const onScreenAt = (item: Named, t: number) =>
		item.appearances?.some((s) => s.start <= t && t < s.end) ?? false;
	const average = (list: { value: number }[]) =>
		list.reduce((n, r) => n + r.value, 0) / (list.length || 1);

	return {
		/** A moment in the video, from a timeline. */
		moment: (t: number) => `What happens ${where(t)} in ${video}?`,

		scene: (i: number) => {
			const scene = scenes[i];
			if (!scene) return null;
			const end = scene.end ?? scenes[i + 1]?.start ?? duration;
			const reacted = comments.some((c) => scene.start <= c.time && c.time < end);
			return `What happens in the scene ${quoted(scene.title)} (${timecode(scene.start)}–${timecode(end)}) of ${video}${
				reacted ? ', and how did viewers react to it' : ''
			}?`;
		},

		/** The sentiment curve at a moment: why it dips or peaks there. */
		sentiment: (t: number) => {
			const around = near(comments, t);
			if (!around.length) return `How did viewers feel ${where(t)} in ${video}?`;
			const mood = around.reduce((n, c) => n + c.sentiment, 0) / around.length;
			if (mood < -0.15)
				return `Viewers' comments turn negative ${where(t)} in ${video}. What happened there, and why did they react that way?`;
			if (mood > 0.15)
				return `Viewers' comments are at their most positive ${where(t)} in ${video}. What made them like it?`;
			return `Viewers' comments are mixed ${where(t)} in ${video}. What happened there, and what did they make of it?`;
		},

		/** The rating curve at a moment, against the video's average. */
		rating: (t: number) => {
			if (!ratings.length) return null;
			const around = near(ratings, t);
			const max = ratings[0].max;
			if (!around.length)
				return `How do ratings of ${video} change along the video, and what drives them?`;
			const here = average(around);
			const all = average(ratings);
			const how = here > all + 0.2 ? 'higher' : here < all - 0.2 ? 'lower' : 'about average';
			return `Ratings ${where(t)} in ${video} are ${how} (${here.toFixed(1)} / ${max}). Why?`;
		},

		comment: (c: { time?: number; text: string }) =>
			c.time === undefined
				? `A viewer said ${quoted(c.text)} about ${video}. What did they mean, and do others agree?`
				: `A viewer commented ${quoted(c.text)} at ${timecode(c.time)} in ${video}. What were they reacting to?`,

		/** A row of comments of one tone. */
		tone: (tone: Tone, count: number) =>
			count
				? `What were the ${count} ${tone} comments on ${video} about?`
				: `Why are there no ${tone} comments on ${video}?`,

		character: (c: Named & { actor?: string; role?: string }, t?: number) =>
			t !== undefined && onScreenAt(c, t)
				? `What is ${c.name} doing ${where(t)} in ${video}?`
				: `Who is ${c.name}${c.actor ? ` (${c.actor})` : ''} in ${video}, and what's their role in it?`,

		theme: (theme: Named, t?: number) =>
			t !== undefined && onScreenAt(theme, t)
				? `How does the theme ${quoted(theme.name)} come through ${where(t)} in ${video}?`
				: `How does the theme ${quoted(theme.name)} come through in ${video}?`,

		brand: (brand: Named, t?: number) =>
			t !== undefined && onScreenAt(brand, t)
				? `How is ${brand.name} shown ${where(t)} in ${video}?`
				: `Where and how does ${brand.name} appear in ${video}?`,

		/** The viewer numbers under the summary. */
		stat: (kind: 'views' | 'responses' | 'rating' | 'sentiment', detail?: string) =>
			({
				views: `How many people have watched ${video}, and how has that changed over time?`,
				responses: `Who responded to ${video}, and what stands out in their responses?`,
				rating: `Why did ${video} get a rating of ${detail}? What did people like and dislike?`,
				sentiment: `What did viewers like and dislike about ${video}? Sum up the ${detail} comments.`
			})[kind]
	};
}

export type VideoQuestions = ReturnType<typeof videoQuestions>;
