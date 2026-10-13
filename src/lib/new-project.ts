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
