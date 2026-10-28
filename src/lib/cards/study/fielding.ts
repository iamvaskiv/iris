import type { Card, StudyData } from '../types';

/**
 * Whether a card is a study that reads as live: its (made-up) sample results are switched on and written. The study
 * card shows "Fielding in progress" then, and so does its project's tile on the projects page.
 */
export function isFielding(card: Card) {
	const sample = (card.data as StudyData | undefined)?.sample;
	return card.type === 'study' && !!sample?.enabled && !!sample.results;
}
