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

export const lumiere = {
	teamId: () => env.LUMIERE_TEAM_ID,
	listFolder: (folderId = 'ROOT') =>
		call(`/folders/${folderId}/items${q({ teamId: env.LUMIERE_TEAM_ID, limit: 50 })}`),
	video: (id: string) =>
		call<{ name: string; summary?: string; duration?: number; processingStatus?: string | null }>(`/videos/${id}`),
	entities: (id: string, types?: string) => call(`/videos/${id}/entities${q({ types })}`),
	chapters: (id: string) => call(`/videos/${id}/chapters`),
	moments: (id: string, granularity?: string) =>
		call(`/videos/${id}/moments${q({ granularity, includeEntities: true })}`),
	transcript: (id: string) => call(`/videos/${id}/transcript${q({ includeEntities: true })}`),
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
	assetUrl: (id: string, body: Record<string, unknown>) =>
		call<{ url: string }>(`/videos/${id}/assets/url`, { method: 'POST', body: JSON.stringify(body) })
};
