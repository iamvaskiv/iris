import type { Lane } from './lanes';
import type { Card, StudyData, VideoCardData } from './types';

/**
 * Next steps offered at the end of each lane (experimental lanes), written as the user's request; clicking one sends it
 * to Lumi. Lumi writes them for the lanes a turn touched (`suggest_next`, stored on the project by lane key); a lane
 * without any, or whose cards changed since, gets these rules instead. Either way, ones already asked are left out.
 */
export const MAX_SUGGESTIONS = 3;

/** Rule-based next steps from a lane's cards. */
export function ruleSuggestions(lane: Lane, cards: Card[]): string[] {
	const own = [...new Set(lane.slots.map((s) => s.card))];
	const of = (type: string) => own.filter((c) => c.type === type);
	const videos = of('video');
	const out: string[] = [];

	if (videos.length === 1) {
		const data = videos[0].data as VideoCardData | undefined;
		if (!data?.viewers) out.push('What will people think about it?');
		else if (!of('insights').length) out.push('How did viewers react?');
		out.push(data?.scenes?.length ? 'Which scene stands out?' : 'Analyse video');
	}
	if (videos.length > 1) {
		const watched = videos.filter((v) => (v.data as VideoCardData | undefined)?.viewers);
		if (watched.length > 1 && !of('viewers').length) out.push('Which one did viewers like more?');
		if (!of('comparison').length) out.push('Compare these videos');
		out.push('Which one works best?');
	}
	if (videos.length && !cards.some((c) => c.type === 'study')) out.push('Test it with an audience');

	for (const study of of('study')) {
		const sample = (study.data as StudyData | undefined)?.sample;
		if (sample?.enabled && sample.results)
			out.push('What stood out in the answers?', 'What should we change?');
		else out.push('Suggest more questions', 'Is anything missing?');
	}
	if (of('insights').length) out.push('What did people dislike?', 'Who liked it most?');
	if (of('comparison').length || of('viewers').length) out.push('Which one works best?');
	// Named after the lane: the same words in several lanes would all go once asked in one, and wouldn't say which.
	if (!out.length && own.some((c) => c.type !== 'upload'))
		out.push(`Tell me more about ${lane.title}`, `What stands out in ${lane.title}?`);
	return [...new Set(out)];
}

/** What a lane offers: Lumi's suggestions, or else the rules', minus anything already asked. */
export function laneSuggestions(
	lane: Lane,
	cards: Card[],
	stored: Record<string, string[]> | undefined,
	asked: string[]
): string[] {
	const done = new Set(asked.map(normalize));
	const fresh = (list: string[]) => list.filter((s) => !done.has(normalize(s)));
	const lumi = fresh(stored?.[lane.key] ?? []);
	return (lumi.length ? lumi : fresh(ruleSuggestions(lane, cards))).slice(0, MAX_SUGGESTIONS);
}

const normalize = (s: string) =>
	s
		.trim()
		.toLowerCase()
		.replace(/[?.!…]+$/, '');
