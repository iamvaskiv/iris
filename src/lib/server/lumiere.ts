import * as env from '$app/env/private';

const BASE = 'https://lumiere.ai/app/api';

async function call<T = unknown>(path: string, init?: RequestInit): Promise<T> {
	const res = await fetch(BASE + path, {
		...init,
		headers: {
			Authorization: `Bearer ${env.LUMIERE_API_KEY}`,
			'Content-Type': 'application/json',
			...init?.headers
		}
	});
	const text = await res.text();
	if (!res.ok) throw new Error(`Lumiere ${res.status} on ${path}: ${text.slice(0, 200)}`);
	return JSON.parse(text) as T;
}

const q = (params: Record<string, string | number | boolean | undefined>) => {
	const s = new URLSearchParams();
	for (const [k, v] of Object.entries(params)) if (v !== undefined) s.set(k, String(v));
	const str = s.toString();
	return str ? `?${str}` : '';
};

type FolderItem = { id: string; name: string; type: string; [k: string]: unknown };
export type Team = { id: string; name: string };

/** The teams the API key's user belongs to; they change rarely, so they're kept for an hour per instance. */
let teamsCache: { teams: Team[]; expires: number } | undefined;
/** Which team each video belongs to (needed for team-scoped calls like viewing activity). */
const videoTeams = new Map<string, string>();

export const lumiere = {
	teamId: () => env.LUMIERE_TEAM_ID,
	/** Every team whose video library the app can browse: all teams of the API key's user. */
	async teams(): Promise<Team[]> {
		if (teamsCache && teamsCache.expires > Date.now()) return teamsCache.teams;
		const me = await call<{ teams: Team[] }>('/me');
		const teams = me.teams.map(({ id, name }) => ({ id, name }));
		teamsCache = { teams, expires: Date.now() + 60 * 60 * 1000 };
		return teams;
	},
	/** The team a video belongs to, read from its Studio link (…/app/<teamId>/video/<videoId>). */
	async teamOf(videoId: string) {
		if (!videoTeams.has(videoId)) {
			const { studioUrl } = await lumiere.video(videoId);
			const team = studioUrl?.match(/\/app\/([^/]+)\/video\//)?.[1];
			if (team) videoTeams.set(videoId, team);
		}
		return videoTeams.get(videoId) ?? env.LUMIERE_TEAM_ID;
	},
	/** Folder items; videos get `analysed`, since the listing's own processingStatus is always empty. */
	async listFolder(folderId = 'ROOT', teamId = env.LUMIERE_TEAM_ID) {
		const res = await call<{ items: FolderItem[] }>(`/folders/${folderId}/items${q({ teamId, limit: 100 })}`);
		await Promise.all(
			res.items
				.filter((i) => i.type === 'video')
				.slice(0, 30)
				.map(async (i) => (i.analysed = await lumiere.isAnalysed(i.id).catch(() => null)))
		);
		return res;
	},
	/** Whether Lumiere's AI analysis (summary, entities, scenes, transcript) is available for a video. */
	isAnalysed: async (id: string) => (await lumiere.video(id)).processingStatus === 'completed',
	video: (id: string) =>
		call<{ name: string; summary?: string; duration?: number; processingStatus?: string | null; studioUrl?: string }>(
			`/videos/${id}`
		),
	entities: (id: string, types?: string) => call(`/videos/${id}/entities${q({ types })}`),
	chapters: (id: string) => call(`/videos/${id}/chapters`),
	moments: (id: string, granularity?: string) =>
		call(`/videos/${id}/moments${q({ granularity, includeEntities: true })}`),
	transcript: (id: string) => call(`/videos/${id}/transcript${q({ includeEntities: true })}`),
	/** Raw viewer responses; test data and hidden responses are left out. */
	feedback: (id: string, offset = 0) =>
		call<{ feedback: unknown[]; pagination: { hasMore: boolean } }>(
			`/videos/${id}/feedback${q({ applyWhitelist: false, limit: 500, offset })}`
		),
	feedbackAggregations: (id: string) => call(`/videos/${id}/feedback/aggregations${q({ applyWhitelist: false })}`),
	/** Estimated viewing sessions over the last year (the API's longest window); not unique viewers. */
	sessionCount: async (id: string) => {
		const teamId = await lumiere.teamOf(id);
		const res = await call<{ entries: { sessionCountEstimate: number }[] }>(
			`/activity${q({ teamId, view: 'engaged-videos', itemId: id, last: '365d', limit: 1 })}`
		);
		return res.entries[0]?.sessionCountEstimate ?? 0;
	},
	createIngestion: (fileName: string, fileSize: number) =>
		call<{ ingestionId: string; uploadUrl: string; videoId: string; studioUrl: string }>('/ingestions', {
			method: 'POST',
			body: JSON.stringify({
				teamId: env.LUMIERE_TEAM_ID,
				folderId: env.LUMIERE_FOLDER_ID,
				upload: { fileName, fileSize }
			})
		}),
	ingestion: (id: string) =>
		call<{ status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed'; progress: number; errorMessage?: string }>(
			`/ingestions/${id}`
		),
	/** Signed thumbnail URL; taken a few seconds in, since trailers usually open on a black frame. */
	thumbnail: (id: string, width = 480) =>
		lumiere.assetUrl(id, { assetType: 'thumbnail', width, time: 10 }).then((a) => a.url),
	assetUrl: (id: string, body: Record<string, unknown>) =>
		call<{ url: string }>(`/videos/${id}/assets/url`, { method: 'POST', body: JSON.stringify(body) })
};
