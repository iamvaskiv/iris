import * as env from '$app/env/private';
import { lumiere } from '#lib/server/lumiere.js';
import { projects } from '#lib/server/projects.js';
import type { PageServerLoad } from './$types';

export type Asset = {
	id: string;
	name: string;
	duration?: number;
	createdAt?: string;
	status: 'analysed' | 'analysing' | 'not-analysed';
	thumbnail?: string;
	projects: { id: string; name: string }[];
};

/** Every video Jinn knows: uploads (the Lumiere upload folder) plus any video attached to a project. */
export const load: PageServerLoad = async () => {
	const all = projects.list();
	const { items } = await lumiere.listFolder(env.LUMIERE_FOLDER_ID);
	const uploads = new Map(items.filter((i) => i.type === 'video').map((i) => [i.id, i]));
	const ids = [...new Set([...uploads.keys(), ...all.flatMap((p) => p.videoIds)])];

	const assets = await Promise.all(
		ids.map(async (id): Promise<Asset | null> => {
			const [video, thumb] = await Promise.all([
				lumiere.video(id).catch(() => null),
				lumiere.thumbnail(id).catch(() => undefined)
			]);
			if (!video) return null;
			const upload = uploads.get(id);
			return {
				id,
				name: video.name,
				duration: video.duration,
				createdAt: (upload?.createdAt as string | undefined) ?? (video as { createdAt?: string }).createdAt,
				status:
					video.processingStatus === 'completed' ? 'analysed' : video.processingStatus === 'processing' ? 'analysing' : 'not-analysed',
				thumbnail: thumb,
				projects: all.filter((p) => p.videoIds.includes(id)).map((p) => ({ id: p.id, name: p.name }))
			};
		})
	);

	return {
		assets: assets
			.filter((a): a is Asset => !!a)
			.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
	};
};
