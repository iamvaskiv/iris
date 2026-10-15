import { error, json } from '@sveltejs/kit';
import { dev } from '$app/env';
import { assets } from '#lib/server/assets.js';
import { lumiere } from '#lib/server/lumiere.js';
import { projects } from '#lib/server/projects.js';
import type { Card } from '#lib/cards/types.js';
import type { RequestHandler } from './$types';

/**
 * Video upload into Lumiere, in three calls from the project page:
 * POST (start: creates the ingestion and an upload card) → PUT (the file, only when the browser can't upload it to
 * the signed URL directly) → GET (poll processing status).
 * The upload card lives on the project so progress survives a reload; it is removed once processing completes.
 */

async function load(id: string) {
	const project = await projects.get(id);
	if (!project) error(404, 'Project not found');
	return project;
}

function uploadCard(project: Awaited<ReturnType<typeof load>>, ingestionId: string | null) {
	const card = project.cards.find((c) => c.type === 'upload' && c.data?.ingestionId === ingestionId);
	if (!card) error(404, 'Upload not found');
	return card;
}

export const POST: RequestHandler = async ({ params, request }) => {
	const project = await load(params.id);
	const { fileName, fileSize } = await request.json();
	const ingestion = await lumiere.createIngestion(fileName, fileSize);

	const card: Card = {
		id: crypto.randomUUID().slice(0, 8),
		type: 'upload',
		title: fileName,
		subtitle: 'Uploading…',
		data: { ...ingestion, phase: 'uploading', progress: 0 }
	};
	await assets.addUpload(ingestion.videoId, fileName);
	await projects.update(project.id, (latest) => {
		latest.cards.push(card);
		latest.focusedId = card.id;
		latest.status = 'Uploading video…';
		if (!latest.videoIds.includes(ingestion.videoId)) latest.videoIds.push(ingestion.videoId);
	});
	return json(card);
};

export const PUT: RequestHandler = async ({ params, url, request }) => {
	const project = await load(params.id);
	const card = uploadCard(project, url.searchParams.get('ingestionId'));
	// Fallback for when the browser can't upload to the signed URL itself (see the project page). Streamed when
	// deployed, so the Worker never holds the whole file; buffered in dev, where Node's fetch would send a stream in
	// chunks without a length.
	const res = await fetch(card.data!.uploadUrl as string, {
		method: 'PUT',
		headers: { 'Content-Type': request.headers.get('content-type') || 'video/mp4' },
		body: dev ? await request.arrayBuffer() : request.body
	});
	if (!res.ok) error(502, `Upload to Lumiere failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
	return json({ ok: true });
};

export const GET: RequestHandler = async ({ params, url }) => {
	const project = await load(params.id);
	const card = uploadCard(project, url.searchParams.get('ingestionId'));
	const ingestion = await lumiere.ingestion(card.data!.ingestionId as string);
	const { progress, errorMessage } = ingestion;
	// The ingestion status lags behind (it can say "uploading" while the video is already processing),
	// so the video's own processingStatus wins when it is further along.
	const video = await lumiere.video(card.data!.videoId as string).catch(() => null);
	const status =
		ingestion.status === 'failed'
			? 'failed'
			: video?.processingStatus === 'completed' || ingestion.status === 'completed'
				? 'completed'
				: video?.processingStatus === 'processing' || ingestion.status === 'processing'
					? 'processing'
					: ingestion.status;

	const phase = status === 'failed' ? 'failed' : status === 'processing' ? 'processing' : 'uploading';
	const updated: Card = {
		...card,
		data: { ...card.data, phase, progress },
		subtitle:
			phase === 'failed' ? `Failed: ${errorMessage ?? 'unknown error'}` : phase === 'processing' ? `Analysing… ${progress}%` : 'Uploading…'
	};
	await assets.setStatus(
		card.data!.videoId as string,
		status === 'completed' ? 'analysed' : status === 'failed' ? 'failed' : status === 'processing' ? 'analysing' : 'uploading',
		video?.duration
	);
	await projects.update(project.id, (latest) => {
		if (status === 'completed') {
			latest.cards = latest.cards.filter((c) => c.id !== card.id);
			if (latest.focusedId === card.id) latest.focusedId = latest.cards.at(-1)?.id;
			latest.status = undefined;
		} else {
			latest.cards = latest.cards.map((c) => (c.id === card.id ? updated : c));
			latest.status =
				phase === 'failed' ? 'Upload failed' : phase === 'processing' ? `Analysing video… ${progress}%` : 'Uploading video…';
		}
	});
	return json({ status, progress, card: updated, videoId: card.data!.videoId, fileName: card.title });
};
