import { insights } from './insights.js';
import { lumiere } from './lumiere.js';
import type { SourcesData } from '#lib/cards/types.js';

type Chapter = { title: string; start: number; end: number };

/**
 * A sources card's data: the video (name, length, scenes) and its Lumiere viewer data. The project's studies that show
 * it are found on the page, from the other cards. Rebuilt on every visit, like video cards; insights come from their
 * cache.
 */
export async function sourcesData(videoId: string): Promise<SourcesData> {
	const soft = <T>(p: Promise<T>) => p.catch(() => null);
	const [video, chapters, viewers] = await Promise.all([
		soft(lumiere.video(videoId)),
		soft(lumiere.chapters(videoId) as Promise<{ chapters: Chapter[] }>),
		soft(insights.get(videoId))
	]);
	return {
		videoId,
		videoName: video?.name,
		duration: video?.duration,
		scenes: (chapters?.chapters ?? []).map((c) => ({ title: c.title, start: c.start, end: c.end })),
		viewers: viewers ?? undefined
	};
}
