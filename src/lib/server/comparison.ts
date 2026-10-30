import { insights } from './insights.js';
import { assets } from './assets.js';
import { lumiere } from './lumiere.js';
import type { ComparedVideo, ComparisonData } from '#lib/cards/types.js';

type Entity = { type: string; name: string; relevance: number };

const names = (entities: Entity[], type: string) =>
	entities
		.filter((e) => e.type === type)
		.sort((a, b) => b.relevance - a.relevance)
		.map((e) => e.name);

/** A video's name as people know it, without the file extension. */
export const videoName = (name: string) => name.replace(/\.(mp4|mov|webm|mkv)$/i, '');

/** One column of a comparison: what the analysis and the audience say about a video. Missing parts stay empty. */
async function compared(videoId: string): Promise<ComparedVideo> {
	const soft = <T>(p: Promise<T>) => p.catch(() => null);
	// If the lookup fails, the user's saved copy still has the name and length.
	const [fetched, saved] = await Promise.all([soft(lumiere.video(videoId)), assets.get(videoId)]);
	const video = fetched ?? (saved && { name: saved.name, duration: saved.duration, processingStatus: undefined });
	const analysed = video?.processingStatus === 'completed';
	const [poster, chapters, entities, audience] = await Promise.all([
		// A third of the way in: trailers open on studio logos and black frames.
		soft(
			lumiere
				.assetUrl(videoId, {
					assetType: 'thumbnail',
					width: 480,
					time: video?.duration ? video.duration / 3 : 10
				})
				.then((a) => a.url)
		),
		analysed ? soft(lumiere.chapters(videoId) as Promise<{ chapters: unknown[] }>) : null,
		analysed ? soft(lumiere.entities(videoId) as Promise<{ entities: Entity[] }>) : null,
		soft(insights.get(videoId))
	]);
	const all = entities?.entities ?? [];
	return {
		videoId,
		name: video ? videoName(video.name) : videoId,
		poster: poster ?? undefined,
		duration: video?.duration,
		analysed,
		scenes: chapters?.chapters.length,
		characters: entities ? names(all, 'identity') : undefined,
		themes: entities ? names(all, 'theme') : undefined,
		brands: entities ? names(all, 'brand') : undefined,
		audience: audience ?? undefined
	};
}

/** Signed poster URLs expire, so this runs when the card is made and on every page visit. */
export async function comparisonData(
	videoIds: string[],
	focus?: ComparisonData['focus']
): Promise<ComparisonData> {
	return { videoIds, focus, videos: await Promise.all(videoIds.map(compared)) };
}
