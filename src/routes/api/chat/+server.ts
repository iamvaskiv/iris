import { json } from '@sveltejs/kit';
import { chat } from '#lib/server/agent.js';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const { message, history = [], cards = [], focusedId } = await request.json();
	try {
		return json(await chat({ message, history, cards, focusedId }));
	} catch (e) {
		console.error(e);
		return json({ text: 'Something went wrong on my side.', ops: [], history, error: String(e) });
	}
};
