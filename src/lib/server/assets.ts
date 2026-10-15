import { lumiere } from './lumiere.js';
import { projects } from './projects.js';
import { store } from './store.js';

/**
 * The user's files, kept by Iris itself (the assets collection) rather than read from Lumiere on every request.
 * Videos are analysed by Lumiere and use the Lumiere video id as their id; future kinds (text documents) will live
 * entirely in Iris and get their own ids.
 */
export type AssetStatus = 'uploading' | 'analysing' | 'analysed' | 'not-analysed' | 'failed';

export type StoredAsset = {
	id: string;
	kind: 'video';
	name: string;
	createdAt?: string;
	duration?: number;
	status: AssetStatus;
	/** How it got into Iris: uploaded by the user, or attached from the video library. */
	source: 'upload' | 'library';
};

export type Asset = StoredAsset & { thumbnail?: string; projects: { id: string; name: string }[] };

/** Statuses that can still change, so they're re-checked with Lumiere when listed. */
const PENDING: AssetStatus[] = ['uploading', 'analysing'];

const toStatus = (processingStatus?: string | null): AssetStatus =>
	processingStatus === 'completed' ? 'analysed' : processingStatus === 'processing' ? 'analysing' : 'not-analysed';

/** Inserts or merges an asset. */
const upsert = (asset: Partial<StoredAsset> & { id: string }) =>
	store.update<StoredAsset>(
		'assets',
		asset.id,
		(existing) => Object.assign(existing, asset),
		() => ({ kind: 'video', name: asset.id, status: 'not-analysed', source: 'library', id: asset.id })
	);

/** Looks a video up in Lumiere and records it. */
async function fetchVideo(id: string, source: StoredAsset['source'], createdAt?: string) {
	const video = await lumiere.video(id);
	await upsert({
		id,
		name: video.name,
		duration: video.duration,
		createdAt: createdAt ?? (video as { createdAt?: string }).createdAt,
		status: toStatus(video.processingStatus),
		source
	});
}

// Signed thumbnail URLs are valid for a couple of hours; reuse them for one.
const thumbnails = new Map<string, { url: string; expires: number }>();
export async function thumbnail(id: string) {
	const hit = thumbnails.get(id);
	if (hit && hit.expires > Date.now()) return hit.url;
	const url = await lumiere.thumbnail(id).catch(() => undefined);
	if (url) thumbnails.set(id, { url, expires: Date.now() + 60 * 60 * 1000 });
	return url;
}

export const assets = {
	/** All assets, newest first, with the projects using each. Only pending ones are re-checked with Lumiere. */
	async list({ withThumbnails = false } = {}): Promise<Asset[]> {
		const pending = (await store.all<StoredAsset>('assets')).filter((a) => PENDING.includes(a.status));
		await Promise.all(pending.map((a) => fetchVideo(a.id, a.source).catch(() => {})));
		const [all, stored] = await Promise.all([projects.list(), store.all<StoredAsset>('assets')]);
		const list = stored.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
		return Promise.all(
			list.map(async (a) => ({
				...a,
				thumbnail: withThumbnails ? await thumbnail(a.id) : undefined,
				projects: all.filter((p) => p.videoIds.includes(a.id)).map((p) => ({ id: p.id, name: p.name }))
			}))
		);
	},
	get: (id: string) => store.get<StoredAsset>('assets', id),
	/** Records a new upload as soon as its ingestion is created. */
	addUpload: (id: string, name: string) =>
		upsert({ id, kind: 'video', name, createdAt: new Date().toISOString(), status: 'uploading', source: 'upload' }),
	setStatus: (id: string, status: AssetStatus, duration?: number) =>
		upsert({ id, status, ...(duration ? { duration } : {}) }),
	/** Makes sure a video (e.g. attached from the library) is registered; returns it. */
	async ensure(id: string): Promise<StoredAsset> {
		if (!(await assets.get(id))) await fetchVideo(id, 'library');
		return (await assets.get(id))!;
	}
};

/** Compact asset list for a system prompt. */
export function describeAssets(list: Asset[]) {
	if (!list.length) return 'Your videos (assets): none yet.';
	const lines = list.map(
		(a) =>
			`- [${a.id}] "${a.name}" | ${a.status}${a.duration ? ` | ${Math.round(a.duration)}s` : ''} | in projects: ${a.projects.map((p) => p.name).join(', ') || 'none'}`
	);
	return `The user's videos (assets), usable in any project:\n${lines.join('\n')}`;
}
