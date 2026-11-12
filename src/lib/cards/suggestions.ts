import type { Lane } from './lanes';
import type { StudyData } from './types';

/**
 * Next steps offered at the end of each lane (experimental lanes), in the empty "what's next" slot after its last card,
 * written as the user's request; clicking one sends it to Lumi. Lumi writes them (`suggest_next`, stored on the project by lane key): for the lanes a turn touched, and for
 * any lane that has none. A study showing results offers its follow-ups first. Ones already asked are left out.
 */
export const MAX_SUGGESTIONS = 3;

/** What a lane offers: Lumi's suggestions for it, minus anything already asked. */
export function laneSuggestions(
	lane: Lane,
	stored: Record<string, string[]> | undefined,
	asked: string[]
): string[] {
	const done = new Set(asked.map(normalize));
	// A study showing results offers the follow-ups Lumi wrote with them first.
	const followUps = lane.slots.flatMap(({ card }) => {
		const sample = card.type === 'study' ? (card.data as StudyData | undefined)?.sample : undefined;
		return sample?.enabled ? (sample.results?.followUps ?? []) : [];
	});
	return [...new Set([...followUps, ...(stored?.[lane.key] ?? [])])]
		.filter((s) => !done.has(normalize(s)))
		.slice(0, MAX_SUGGESTIONS);
}

const normalize = (s: string) =>
	s
		.trim()
		.toLowerCase()
		.replace(/[?.!…]+$/, '');

/**
 * The empty lane after the last one, for starting something new: its suggestions are stored under this key (Lumi writes
 * them with the lanes' next steps, as directions the project hasn't taken yet).
 */
export const NEW_LANE = '~new';

/** Ways to start something new before Lumi has written any (the projects page's starters). */
export const NEW_LANE_STARTERS = [
	'Analyse and understand video content',
	'Get opinion from viewers',
	'Compare videos'
];

/** What the new lane offers: Lumi's ideas for it (or the starters), minus anything already asked. */
export function newLaneSuggestions(stored: Record<string, string[]> | undefined, asked: string[]) {
	const done = new Set(asked.map(normalize));
	const ideas = stored?.[NEW_LANE]?.length ? stored[NEW_LANE] : NEW_LANE_STARTERS;
	return ideas.filter((s) => !done.has(normalize(s))).slice(0, MAX_SUGGESTIONS);
}
