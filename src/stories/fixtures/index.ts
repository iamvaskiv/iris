import type { Card } from '#lib/cards/types.js';
import cards from './cards.json';

/**
 * Real cards captured from local projects by scripts/storybook-fixtures.mjs (images saved alongside, video streams
 * left out). Keys are "<project> · <card title>".
 */
export const fixtures = cards as unknown as Record<string, Card>;

export function fixture(key: string): Card {
	const card = fixtures[key];
	if (!card)
		throw new Error(
			`No fixture "${key}". Re-run scripts/storybook-fixtures.mjs or pick one of: ${Object.keys(fixtures).join(', ')}`
		);
	return card;
}
