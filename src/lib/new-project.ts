import { goto } from '$app/navigation';

/**
 * Opens a draft project. Nothing is saved until something goes into it (a first message or an upload), so
 * starting a project and leaving it empty leaves no trace.
 */
export const draftProjectUrl = (opts: { name?: string; question?: string } = {}) => {
	const params = new URLSearchParams();
	if (opts.name) params.set('name', opts.name);
	if (opts.question) params.set('q', opts.question);
	const query = params.toString();
	return `/projects/new${query ? `?${query}` : ''}`;
};

export const newProject = () => goto(draftProjectUrl());

/**
 * A video dropped on the projects page, waiting for its new project's page to upload it. Navigation is client-side,
 * so the file stays in memory; a full reload drops it (and the draft stays empty and unsaved).
 */
let pendingVideo: File | undefined;

/** Opens a draft project named after the video; its page uploads the file as soon as it opens. */
export function newProjectWithVideo(file: File) {
	pendingVideo = file;
	return goto(draftProjectUrl({ name: file.name.replace(/\.[^.]+$/, '') }));
}

/** The dropped video for the page that just opened, if any. Handed out once. */
export function takePendingVideo() {
	const file = pendingVideo;
	pendingVideo = undefined;
	return file;
}
