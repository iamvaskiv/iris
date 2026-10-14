import { lumiere } from './lumiere.js';
import type { VideoCardData } from '#lib/cards/types.js';

type Chapter = { title: string; start: number; end: number };
type Entity = {
	id: string;
	type: string;
	name: string;
	description?: string;
	relevance: number;
	categories?: { description: string }[];
	subcategories?: { description: string }[];
	actor?: { name: string };
};
type Moment = { timestampStart: number; midpoint: number; entities?: { id: string }[] };

const MAX_CHARACTERS = 6;
const MAX_THEMES = 8;
const MAX_BRANDS = 8;

/** Signed URLs expire after a couple of hours, so this runs when the card is made and on every page visit. */
export async function videoCardData(videoId: string): Promise<VideoCardData> {
	const soft = <T>(p: Promise<T>) => p.catch(() => null);
	const [stream, video, chapters, entities, moments] = await Promise.all([
		soft(lumiere.assetUrl(videoId, { assetType: 'download', fileName: 'low.mp4' })),
		soft(lumiere.video(videoId)),
		soft(lumiere.chapters(videoId) as Promise<{ chapters: Chapter[] }>),
		soft(lumiere.entities(videoId) as Promise<{ entities: Entity[] }>),
		soft(lumiere.moments(videoId) as Promise<{ moments: Moment[] }>)
	]);
	const frame = (time: number, width = 320) =>
		soft(lumiere.assetUrl(videoId, { assetType: 'thumbnail', width, time }).then((a) => a.url));
	// A third of the way in: trailers open on studio logos and black frames.
	const poster = frame(video?.duration ? video.duration / 3 : 10, 640);

	const scenes = await Promise.all(
		(chapters?.chapters ?? []).map(async (c) => ({
			title: c.title,
			start: c.start,
			// A few seconds in: chapters often open on a cut or a black frame.
			thumb: (await frame(c.start + Math.min(3, (c.end - c.start) / 2))) ?? undefined
		}))
	);

	const top = (type: string, max: number) =>
		(entities?.entities ?? [])
			.filter((e) => e.type === type)
			.sort((a, b) => b.relevance - a.relevance)
			.slice(0, max);
	const appearances = (e: Entity) =>
		(moments?.moments ?? []).filter((m) => m.entities?.some((x) => x.id === e.id));

	const people = top('identity', MAX_CHARACTERS);
	const characters = await Promise.all(
		people.map(async (e) => {
			// The moment they share with the fewest others is the likeliest close-up.
			const shot = appearances(e).sort(
				(a, b) => (a.entities?.length ?? 0) - (b.entities?.length ?? 0)
			)[0];
			return {
				name: e.name,
				role: e.categories?.[0]?.description.split(' / ')[0],
				actor: e.actor?.name,
				image: shot ? ((await frame(shot.midpoint)) ?? undefined) : undefined
			};
		})
	);

	const themes = top('theme', MAX_THEMES).map((e) => ({
		name: e.name,
		description: e.description
	}));

	const brands = top('brand', MAX_BRANDS).map((e) => ({
		name: e.name,
		category: (e.subcategories?.[0] ?? e.categories?.[0])?.description,
		// Where the brand first shows up. No frame: logos fade in and out, so moment frames are often black.
		time: appearances(e)[0]?.timestampStart
	}));

	return {
		videoId,
		streamUrl: stream?.url,
		poster: (await poster) ?? undefined,
		duration: video?.duration,
		scenes,
		characters,
		themes,
		brands
	};
}
