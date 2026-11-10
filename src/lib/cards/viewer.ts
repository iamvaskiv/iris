/** How a comment reads, from its sentiment (-1 to 1): positive above 0.2, negative below -0.2, neutral between. */
export type Tone = 'positive' | 'neutral' | 'negative';
export const toneOf = (sentiment: number): Tone =>
	sentiment > 0.2 ? 'positive' : sentiment < -0.2 ? 'negative' : 'neutral';

/** The tones in order, for a split of responses (bars, counts, tiles). */
export const TONES: Tone[] = ['positive', 'neutral', 'negative'];

/**
 * A tone's colours, the one place they're set: the bright mark colour (dots, bars, curves), never the design system's
 * darker text-safe success and destructive ones.
 */
export const TONE_DOT: Record<Tone, string> = {
	positive: 'bg-category-green',
	neutral: 'bg-control',
	negative: 'bg-chart-red'
};

/** A tone's soft tint, for a tile or a comment in that tone. */
export const TONE_TINT: Record<Tone, string> = {
	positive: 'bg-category-green/10',
	neutral: 'bg-muted',
	negative: 'bg-chart-red/10'
};

export const TONE_LABEL: Record<Tone, string> = {
	positive: 'Positive',
	neutral: 'Neutral',
	negative: 'Negative'
};

/** A name's initials, for an avatar without a picture ("Otto Anderson" → "OA"). */
export const initials = (name: string) =>
	name
		.split(' ')
		.map((w) => w[0])
		.slice(0, 2)
		.join('');
