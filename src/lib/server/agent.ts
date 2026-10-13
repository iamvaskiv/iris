import Anthropic from '@anthropic-ai/sdk';
import * as env from '$app/env/private';
import { lumiere } from './lumiere.js';
import type { Card, ChatResponse } from '#lib/cards/types.js';

export const DEFAULT_VIDEO_ID = 'vcnghIEcxyqz';
const MODEL = 'claude-sonnet-5-5';
const MAX_STEPS = 8;

const SYSTEM = `You are Lumi, the assistant inside a video intelligence platform backed by Lumiere.

How the interface works (important):
- The user only sees your LATEST text reply, in a small bubble at the bottom of the screen. Keep it to one or two short, friendly sentences.
- Substantive answers go into cards in the center of the screen, created with the show_card tool. Each new card pushes older ones up.
- Create a card whenever the answer is something to look at: a video, a list of characters/scenes/themes, quotes, a summary, a comparison. Usually one card per turn, two at most.
- Don't repeat the card's content in your text reply; point to it ("Here are the characters.").
- For plain conversation or clarifying questions, reply with text only.

Data:
- The current video is ${DEFAULT_VIDEO_ID} unless the user picks another. You can browse the team's folders with list_folder.
- Always fetch data with tools before answering; never invent characters, quotes or timestamps.
- If data is missing (e.g. an empty transcript), say so briefly and offer what is available instead.`;

const tools: Anthropic.Tool[] = [
	{
		name: 'list_folder',
		description: "List folders and videos in the team's Lumiere library. Use folderId 'ROOT' for the top level.",
		input_schema: { type: 'object', properties: { folderId: { type: 'string' } } }
	},
	{
		name: 'get_video',
		description: 'Video metadata: name, duration and the AI summary.',
		input_schema: { type: 'object', properties: { videoId: { type: 'string' } }, required: ['videoId'] }
	},
	{
		name: 'get_entities',
		description: 'AI-detected entities: identity (people/characters, with actor), theme, event, brand.',
		input_schema: {
			type: 'object',
			properties: {
				videoId: { type: 'string' },
				types: { type: 'string', description: 'Comma-separated filter, e.g. "identity,brand"' }
			},
			required: ['videoId']
		}
	},
	{
		name: 'get_chapters',
		description: 'Scenes/chapters with titles, descriptions and start/end seconds.',
		input_schema: { type: 'object', properties: { videoId: { type: 'string' } }, required: ['videoId'] }
	},
	{
		name: 'get_moments',
		description: 'Timestamped moments (10-30s) with transcript text, summaries and entity references.',
		input_schema: {
			type: 'object',
			properties: {
				videoId: { type: 'string' },
				granularity: { type: 'string', enum: ['MOMENT', 'FINE_WINDOW', 'FULL_VIDEO'] }
			},
			required: ['videoId']
		}
	},
	{
		name: 'get_transcript',
		description: 'Diarized transcript: utterances with time, speaker and speakerEntityId.',
		input_schema: { type: 'object', properties: { videoId: { type: 'string' } }, required: ['videoId'] }
	},
	{
		name: 'show_card',
		description: `Show a card in the center of the screen. Types:
- "video": a video preview with its summary. Pass videoId; the player is added for you. Use body for a short summary.
- "list": a list of things (characters, scenes, themes, brands...). Fill items with title/subtitle/description and time (seconds) when known.
- "quotes": lines spoken by someone. items: title = the quote, subtitle = speaker, time = seconds.
- "text": anything else; put the content in body (plain text, line breaks allowed).`,
		input_schema: {
			type: 'object',
			properties: {
				type: { type: 'string', enum: ['video', 'list', 'quotes', 'text'] },
				title: { type: 'string' },
				subtitle: { type: 'string' },
				body: { type: 'string' },
				videoId: { type: 'string' },
				items: {
					type: 'array',
					items: {
						type: 'object',
						properties: {
							title: { type: 'string' },
							subtitle: { type: 'string' },
							description: { type: 'string' },
							time: { type: 'number' }
						},
						required: ['title']
					}
				}
			},
			required: ['type', 'title']
		}
	}
];

type CardInput = Omit<Card, 'id' | 'data'> & { videoId?: string };

async function makeCard(input: CardInput): Promise<Card> {
	const { videoId, ...rest } = input;
	const card: Card = { id: crypto.randomUUID(), ...rest, data: videoId ? { videoId } : undefined };
	if (card.type === 'video' && videoId) {
		const asset = await lumiere.assetUrl(videoId, { assetType: 'download', fileName: 'low.mp4' }).catch(() => null);
		card.data = { ...card.data, streamUrl: asset?.url };
	}
	return card;
}

async function runTool(name: string, input: Record<string, string>, cards: Card[]): Promise<unknown> {
	const id = input.videoId ?? DEFAULT_VIDEO_ID;
	switch (name) {
		case 'list_folder':
			return lumiere.listFolder(input.folderId);
		case 'get_video':
			return lumiere.video(id);
		case 'get_entities':
			return lumiere.entities(id, input.types);
		case 'get_chapters':
			return lumiere.chapters(id);
		case 'get_moments':
			return lumiere.moments(id, input.granularity);
		case 'get_transcript':
			return lumiere.transcript(id);
		case 'show_card': {
			cards.push(await makeCard(input as unknown as CardInput));
			return { shown: true };
		}
		default:
			throw new Error(`Unknown tool ${name}`);
	}
}

export async function chat(history: Anthropic.MessageParam[], message: string): Promise<ChatResponse> {
	if (!env.ANTHROPIC_API_KEY) return scripted(history, message);
	try {
		return await agent(history, message);
	} catch (e) {
		// No working LLM (bad key, missing workspace id…): keep the prototype usable.
		if (e instanceof Anthropic.APIError && (e.status === 400 || e.status === 401 || e.status === 403)) {
			console.warn('Anthropic unavailable, using scripted mode:', e.message);
			return scripted(history, message);
		}
		throw e;
	}
}

async function agent(history: Anthropic.MessageParam[], message: string): Promise<ChatResponse> {

	const client = new Anthropic({
		apiKey: env.ANTHROPIC_API_KEY,
		defaultHeaders: env.ANTHROPIC_WORKSPACE_ID ? { 'anthropic-workspace-id': env.ANTHROPIC_WORKSPACE_ID } : undefined
	});
	const messages: Anthropic.MessageParam[] = [...history, { role: 'user', content: message }];
	const cards: Card[] = [];

	for (let step = 0; step < MAX_STEPS; step++) {
		const res = await client.messages.create({ model: MODEL, max_tokens: 4096, system: SYSTEM, tools, messages });
		messages.push({ role: 'assistant', content: res.content });

		const toolUses = res.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');
		if (res.stop_reason !== 'tool_use' || toolUses.length === 0) {
			const text = res.content
				.filter((b): b is Anthropic.TextBlock => b.type === 'text')
				.map((b) => b.text)
				.join('\n')
				.trim();
			return { text, cards, history: messages };
		}

		const results: Anthropic.ToolResultBlockParam[] = [];
		for (const use of toolUses) {
			try {
				const out = await runTool(use.name, use.input as Record<string, string>, cards);
				results.push({ type: 'tool_result', tool_use_id: use.id, content: JSON.stringify(out).slice(0, 40_000) });
			} catch (e) {
				results.push({ type: 'tool_result', tool_use_id: use.id, content: String(e), is_error: true });
			}
		}
		messages.push({ role: 'user', content: results });
	}
	return { text: 'That took more steps than I expected. Try asking again?', cards, history: messages };
}

/** Keyword-based stand-in for the LLM so the UI can be tried without an Anthropic key. Uses real Lumiere data. */
async function scripted(history: Anthropic.MessageParam[], message: string): Promise<ChatResponse> {
	const m = message.toLowerCase();
	const id = DEFAULT_VIDEO_ID;
	const done = (text: string, cards: Card[] = []) => ({
		text: `${text} (scripted mode, no LLM connected)`,
		cards,
		history: [...history, { role: 'user', content: message }, { role: 'assistant', content: text }]
	});
	type Entity = { name: string; type: string; description?: string; actor?: { name: string } | null };

	if (/character|who|people|cast/.test(m)) {
		const { entities } = (await lumiere.entities(id, 'identity')) as { entities: Entity[] };
		return done('Here are the characters I found.', [
			await makeCard({
				type: 'list',
				title: 'Characters',
				subtitle: `${entities.length} identities`,
				items: entities.map((e) => ({ title: e.name, subtitle: e.actor?.name, description: e.description }))
			})
		]);
	}
	if (/scene|chapter/.test(m)) {
		const { chapters } = (await lumiere.chapters(id)) as {
			chapters: { title: string; description: string; start: number }[];
		};
		return done('Here are the scenes.', [
			await makeCard({
				type: 'list',
				title: 'Scenes',
				items: chapters.map((c) => ({ title: c.title, description: c.description, time: c.start }))
			})
		]);
	}
	if (/theme|brand|topic/.test(m)) {
		const { entities } = (await lumiere.entities(id, 'theme,event,brand')) as { entities: Entity[] };
		return done('Themes, events and brands in the video.', [
			await makeCard({
				type: 'list',
				title: 'Themes & brands',
				items: entities.map((e) => ({ title: e.name, subtitle: e.type, description: e.description }))
			})
		]);
	}
	const v = await lumiere.video(id);
	return done('Here’s the video.', [await makeCard({ type: 'video', title: v.name, body: v.summary, videoId: id })]);
}
