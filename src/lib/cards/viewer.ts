/** How a comment reads, from its sentiment (-1 to 1): positive above 0.2, negative below -0.2, neutral between. */
export type Tone = 'positive' | 'neutral' | 'negative';
export const toneOf = (sentiment: number): Tone =>
	sentiment > 0.2 ? 'positive' : sentiment < -0.2 ? 'negative' : 'neutral';

/** A comment's dot, in its tone's colour. */
export const TONE_DOT: Record<Tone, string> = {
	positive: 'bg-success',
	neutral: 'bg-muted-foreground',
	negative: 'bg-destructive'
};

/** A name's initials, for an avatar without a picture ("Otto Anderson" → "OA"). */
export const initials = (name: string) =>
	name
		.split(' ')
		.map((w) => w[0])
		.slice(0, 2)
		.join('');
