import { error, json } from '@sveltejs/kit';
import { assets } from '#lib/server/assets.js';
import { lumiere } from '#lib/server/lumiere.js';
import type { RequestHandler } from './$types';

/** A video's playable file and a poster frame, as signed links (valid for a couple of hours). */
export const GET: RequestHandler = async ({ params }) => {
	const asset = await assets.get(params.id);
	if (!asset) error(404, 'Not one of your videos');
	const soft = <T>(p: Promise<T>) => p.catch(() => null);
	const [stream, poster] = await Promise.all([
		soft(lumiere.assetUrl(params.id, { assetType: 'download', fileName: 'low.mp4' })),
		// A third of the way in: trailers open on studio logos and black frames.
		soft(
			lumiere.assetUrl(params.id, {
				assetType: 'thumbnail',
				width: 960,
				time: asset.duration ? asset.duration / 3 : 10
			})
		)
	]);
	return json({ streamUrl: stream?.url ?? null, poster: poster?.url ?? null });
};
