import type { Card, StudyData } from './cards/types.js';

/** Where an asset is in Lumiere's pipeline. */
export type AssetStatus = 'uploading' | 'analysing' | 'analysed' | 'not-analysed' | 'failed';

/** How an asset's analysis status reads in the app. */
export const assetStatusLabel: Record<AssetStatus, string> = {
	uploading: 'Uploading…',
	analysing: 'Analysing…',
	analysed: 'Analysed',
	'not-analysed': 'Not analysed',
	failed: 'Failed'
};

/** A video in a project, as the project page shows it in the right safe zone. */
export type ProjectAsset = {
	id: string;
	name: string;
	duration?: number;
	status: AssetStatus;
	thumbnail?: string;
};

/**
 * Whether a card shows (or is about) the video `id`: a video or insights card for it, a comparison including it, or
 * a study with a video step showing it.
 */
export function cardUses(card: Card, id: string) {
	if (card.data?.videoId === id) return true;
	if (((card.data?.videoIds as string[] | undefined) ?? []).includes(id)) return true;
	if (card.type !== 'study') return false;
	return ((card.data as StudyData | undefined)?.questions ?? []).some((q) => q.videoId === id);
}
