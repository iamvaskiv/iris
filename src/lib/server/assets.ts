import * as env from '$app/env/private';
import { lumiere } from './lumiere.js';
import { projects } from './projects.js';

export type Asset = {
	id: string;
	name: string;
	duration?: number;
	createdAt?: string;
	status: 'analysed' | 'analysing' | 'not-analysed';
	thumbnail?: string;
	projects: { id: string; name: string }[];
};

/**
 * The user's own videos: uploads (the Lumiere upload folder) plus any video attached to a project.
 * The assistants can always use these, whatever the library setting.
 */
export async function listAssets({ thumbnails = false } = {}): Promise<Asset[]> {
	const all = projects.list();
	const { items } = await lumiere.listFolder(env.LUMIERE_FOLDER_ID);
	const uploads = new Map(items.filter((i) => i.type === 'video').map((i) => [i.id, i]));
	const ids = [...new Set([...uploads.keys(), ...all.flatMap((p) => p.videoIds)])];

	const assets = await Promise.all(
		ids.map(async (id): Promise<Asset | null> => {
			const [video, thumbnail] = await Promise.all([
				lumiere.video(id).catch(() => null),
				thumbnails ? lumiere.thumbnail(id).catch(() => undefined) : undefined
			]);
			if (!video) return null;
			return {
				id,
				name: video.name,
				duration: video.duration,
				createdAt: (uploads.get(id)?.createdAt as string | undefined) ?? (video as { createdAt?: string }).createdAt,
				status:
					video.processingStatus === 'completed' ? 'analysed' : video.processingStatus === 'processing' ? 'analysing' : 'not-analysed',
				thumbnail,
				projects: all.filter((p) => p.videoIds.includes(id)).map((p) => ({ id: p.id, name: p.name }))
			};
		})
	);
	return assets
		.filter((a): a is Asset => !!a)
		.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
}

/** Compact asset list for a system prompt. */
export function describeAssets(assets: Asset[]) {
	if (!assets.length) return 'Your videos (assets): none yet.';
	const lines = assets.map(
		(a) =>
			`- [${a.id}] "${a.name}" | ${a.status}${a.duration ? ` | ${Math.round(a.duration)}s` : ''} | in projects: ${a.projects.map((p) => p.name).join(', ') || 'none'}`
	);
	return `The user's videos (assets), usable in any project:\n${lines.join('\n')}`;
}
