import { json } from '@sveltejs/kit';
import { workspaceChat } from '#lib/server/workspace-agent.js';
import type { RequestHandler } from './$types';

/** Chat on the projects page. History is kept by the client for the session. */
export const POST: RequestHandler = async ({ request }) => {
	const { message, history = [] } = await request.json();
	try {
		return json(await workspaceChat(message, history));
	} catch (e) {
		console.error(e);
		return json({ text: 'Something went wrong on my side.', history, error: String(e) });
	}
};
