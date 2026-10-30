import type { Lane } from './lanes';

/**
 * Next steps offered at the end of each lane (experimental lanes), written as the user's request; clicking one sends it
 * to Lumi. Lumi writes them (`suggest_next`, stored on the project by lane key): for the lanes a turn touched, and for
 * any lane that has none. Ones already asked are left out.
 */
export const MAX_SUGGESTIONS = 3;

/** What a lane offers: Lumi's suggestions for it, minus anything already asked. */
export function laneSuggestions(
	lane: Lane,
	stored: Record<string, string[]> | undefined,
	asked: string[]
): string[] {
	const done = new Set(asked.map(normalize));
	return (stored?.[lane.key] ?? [])
		.filter((s) => !done.has(normalize(s)))
		.slice(0, MAX_SUGGESTIONS);
}

const normalize = (s: string) =>
	s
		.trim()
		.toLowerCase()
		.replace(/[?.!…]+$/, '');
