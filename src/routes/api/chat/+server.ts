import { json } from '@sveltejs/kit';
import { chat } from '#lib/server/agent.js';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const { message, history = [] } = await request.json();
	try {
		return json(await chat(history, message));
	} catch (e) {
		console.error(e);
		return json({ text: 'Something went wrong on my side.', cards: [], history, error: String(e) });
	}
};
