import { assets } from './assets.js';
import { videoName } from './comparison.js';
import { insights } from './insights.js';
import { lumiere } from './lumiere.js';
import type { ViewersData, ViewersVideo } from '#lib/cards/types.js';

/** One row of a viewers card: the video (name, length, poster, stream) and its Lumiere viewer data. */
async function viewersVideo(videoId: string): Promise<ViewersVideo> {
	const soft = <T>(p: Promise<T>) => p.catch(() => null);
	// If the lookup fails, the user's saved copy still has the name and length.
	const [fetched, saved, stream, viewers] = await Promise.all([
		soft(lumiere.video(videoId)),
		assets.get(videoId),
		soft(lumiere.assetUrl(videoId, { assetType: 'download', fileName: 'low.mp4' })),
		soft(insights.get(videoId))
	]);
	const video = fetched ?? saved;
	// A third of the way in: trailers open on studio logos and black frames.
	const poster = await soft(
		lumiere
			.assetUrl(videoId, {
				assetType: 'thumbnail',
				width: 320,
				time: video?.duration ? video.duration / 3 : 10
			})
			.then((a) => a.url)
	);
	return {
		videoId,
		name: video ? videoName(video.name) : videoId,
		poster: poster ?? undefined,
		streamUrl: stream?.url,
		duration: video?.duration,
		viewers: viewers ?? undefined
	};
}

/**
 * A viewers card's data: each video and its Lumiere viewer data. The project's studies that show them are found on the
 * page, from the other cards. Signed URLs expire, so this runs when the card is made and on every page visit.
 */
export async function viewersData(videoIds: string[]): Promise<ViewersData> {
	return { videoIds, videos: await Promise.all(videoIds.map(viewersVideo)) };
}
