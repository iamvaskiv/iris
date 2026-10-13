import { error, json } from '@sveltejs/kit';
import { assets } from '#lib/server/assets.js';
import { lumiere } from '#lib/server/lumiere.js';
import { projects } from '#lib/server/projects.js';
import type { Card } from '#lib/cards/types.js';
import type { RequestHandler } from './$types';

/**
 * Video upload into Lumiere, in three calls from the project page:
 * POST (start: creates the ingestion and an upload card) → PUT (the file) → GET (poll processing status).
 * The upload card lives on the project so progress survives a reload; it is removed once processing completes.
 */

function load(id: string) {
	const project = projects.get(id);
	if (!project) error(404, 'Project not found');
	return project;
}

function uploadCard(project: ReturnType<typeof load>, ingestionId: string | null) {
	const card = project.cards.find((c) => c.type === 'upload' && c.data?.ingestionId === ingestionId);
	if (!card) error(404, 'Upload not found');
	return card;
}

export const POST: RequestHandler = async ({ params, request }) => {
	const project = load(params.id);
	const { fileName, fileSize } = await request.json();
	const ingestion = await lumiere.createIngestion(fileName, fileSize);

	const card: Card = {
		id: crypto.randomUUID().slice(0, 8),
		type: 'upload',
		title: fileName,
		subtitle: 'Uploading…',
		data: { ...ingestion, phase: 'uploading', progress: 0 }
	};
	assets.addUpload(ingestion.videoId, fileName);
	projects.update(project.id, (latest) => {
		latest.cards.push(card);
		latest.focusedId = card.id;
		latest.status = 'Uploading video…';
		if (!latest.videoIds.includes(ingestion.videoId)) latest.videoIds.push(ingestion.videoId);
	});
	return json(card);
};

export const PUT: RequestHandler = async ({ params, url, request }) => {
	const project = load(params.id);
	const card = uploadCard(project, url.searchParams.get('ingestionId'));
	// Buffered rather than streamed: simplest reliable way to forward to the signed URL, fine for trailer-sized files.
	const body = await request.arrayBuffer();
	const res = await fetch(card.data!.uploadUrl as string, {
		method: 'PUT',
		headers: { 'Content-Type': request.headers.get('content-type') || 'video/mp4' },
		body
	});
	if (!res.ok) error(502, `Upload to Lumiere failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
	return json({ ok: true });
};

export const GET: RequestHandler = async ({ params, url }) => {
	const project = load(params.id);
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
	assets.setStatus(
		card.data!.videoId as string,
		status === 'completed' ? 'analysed' : status === 'failed' ? 'failed' : status === 'processing' ? 'analysing' : 'uploading',
		video?.duration
	);
	projects.update(project.id, (latest) => {
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
