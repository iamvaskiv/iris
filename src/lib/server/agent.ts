import Anthropic from '@anthropic-ai/sdk';
import * as env from '$app/env/private';
import { lumiere } from './lumiere.js';
import type { Card, CardOp, ChatResponse } from '#lib/cards/types.js';

export const DEFAULT_VIDEO_ID = 'vcnghIEcxyqz';
const MODEL = 'claude-sonnet-5-5';
const MAX_STEPS = 8;

const SYSTEM = `You are Lumi, the assistant inside a video intelligence platform backed by Lumiere.

How the interface works (important):
- The user only sees your LATEST text reply, in a small bubble above the input at the bottom of the screen. Keep it to one or two short, friendly sentences.
- The center of the screen holds cards: visual answers that stay on screen. One card at a time is in focus; the others are dimmed.

Choosing how to answer, in this order:
1. Text only. Quick facts, yes/no, a number, a name, a clarifying question, small talk, or anything that fits in a sentence or two. Most follow-ups land here. Don't touch the cards.
2. focus_card. The answer is already on an existing card: bring it into focus and point to it in your reply.
3. update_card. The question is about an existing card's subject but the card needs to change (add items, more detail, correct, filter, re-sort, rename). Edit that card in place instead of making a new one.
4. show_card. Only for a genuinely new subject that no existing card covers, and only when the answer is worth looking at (a video, a list of characters/scenes/themes, quotes, a structured breakdown). At most one new card per turn.

Card rules:
- Never create a card that repeats or overlaps an existing one: same subject, same entity, same list. Update or focus it instead.
- A card is about one subject. Keep titles short and stable so the card can be found and extended later.
- Don't repeat a card's content in your text reply; point to it ("Added her scenes to Envy's card.").

Data:
- The current video is ${DEFAULT_VIDEO_ID} unless the user picks another. You can browse the team's folders with list_folder.
- Always fetch data with tools before answering; never invent characters, quotes or timestamps.
- If data is missing (e.g. an empty transcript), say so briefly and offer what is available instead.`;

/** Compact description of the cards on screen, so the model can focus/update instead of duplicating. */
function describeCards(cards: Card[], focusedId?: string) {
	if (!cards.length) return 'Cards on screen: none yet.';
	const lines = cards.map((c) => {
		const items = c.items?.length ? ` | items: ${c.items.map((i) => i.title).join('; ').slice(0, 300)}` : '';
		const body = c.body ? ` | body: ${c.body.slice(0, 150)}` : '';
		return `- [${c.id}] ${c.type} "${c.title}"${c.subtitle ? ` (${c.subtitle})` : ''}${c.id === focusedId ? ' (in focus)' : ''}${items}${body}`;
	});
	return `Cards on screen, oldest first:\n${lines.join('\n')}`;
}

const itemsSchema = {
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
};

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
		description: `Add a NEW card for a subject no existing card covers. It becomes the focused card. Types:
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
				items: itemsSchema
			},
			required: ['type', 'title']
		}
	},
	{
		name: 'update_card',
		description:
			'Edit an existing card in place and bring it into focus. Pass only the fields to change; items replaces the whole list, so include the items you want to keep.',
		input_schema: {
			type: 'object',
			properties: {
				id: { type: 'string' },
				title: { type: 'string' },
				subtitle: { type: 'string' },
				body: { type: 'string' },
				items: itemsSchema
			},
			required: ['id']
		}
	},
	{
		name: 'focus_card',
		description: 'Bring an existing card into focus (scrolls to it) when it already answers the question.',
		input_schema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] }
	}
];

type CardInput = Omit<Card, 'id' | 'data'> & { videoId?: string };

async function makeCard(input: CardInput): Promise<Card> {
	const { videoId, ...rest } = input;
	const card: Card = { id: crypto.randomUUID().slice(0, 8), ...rest, data: videoId ? { videoId } : undefined };
	if (card.type === 'video' && videoId) {
		const asset = await lumiere.assetUrl(videoId, { assetType: 'download', fileName: 'low.mp4' }).catch(() => null);
		card.data = { ...card.data, streamUrl: asset?.url };
	}
	return card;
}

type Screen = { cards: Card[]; ops: CardOp[] };

async function runTool(name: string, input: Record<string, unknown>, screen: Screen): Promise<unknown> {
	const id = (input.videoId as string) ?? DEFAULT_VIDEO_ID;
	const find = () => {
		const card = screen.cards.find((c) => c.id === input.id);
		if (!card) throw new Error(`No card with id ${input.id}. Cards: ${screen.cards.map((c) => c.id).join(', ')}`);
		return card;
	};
	switch (name) {
		case 'list_folder':
			return lumiere.listFolder(input.folderId as string);
		case 'get_video':
			return lumiere.video(id);
		case 'get_entities':
			return lumiere.entities(id, input.types as string);
		case 'get_chapters':
			return lumiere.chapters(id);
		case 'get_moments':
			return lumiere.moments(id, input.granularity as string);
		case 'get_transcript':
			return lumiere.transcript(id);
		case 'show_card': {
			const card = await makeCard(input as unknown as CardInput);
			screen.cards.push(card);
			screen.ops.push({ op: 'add', card });
			return { shown: true, id: card.id };
		}
		case 'update_card': {
			const { id: _, ...changes } = input;
			const card = Object.assign(find(), changes);
			screen.ops.push({ op: 'update', card: { ...card } });
			return { updated: true };
		}
		case 'focus_card': {
			screen.ops.push({ op: 'focus', id: find().id });
			return { focused: true };
		}
		default:
			throw new Error(`Unknown tool ${name}`);
	}
}

export type ChatRequest = {
	message: string;
	history: Anthropic.MessageParam[];
	cards: Card[];
	focusedId?: string;
};

export async function chat(req: ChatRequest): Promise<ChatResponse> {
	if (!env.ANTHROPIC_API_KEY) return scripted(req);
	try {
		return await agent(req);
	} catch (e) {
		// No working LLM (bad key, missing workspace id…): keep the prototype usable.
		if (e instanceof Anthropic.APIError && (e.status === 400 || e.status === 401 || e.status === 403)) {
			console.warn('Anthropic unavailable, using scripted mode:', e.message);
			return scripted(req);
		}
		throw e;
	}
}

async function agent({ message, history, cards, focusedId }: ChatRequest): Promise<ChatResponse> {
	const client = new Anthropic({
		apiKey: env.ANTHROPIC_API_KEY,
		defaultHeaders: env.ANTHROPIC_WORKSPACE_ID ? { 'anthropic-workspace-id': env.ANTHROPIC_WORKSPACE_ID } : undefined
	});
	const messages: Anthropic.MessageParam[] = [...history, { role: 'user', content: message }];
	const screen: Screen = { cards: structuredClone(cards), ops: [] };
	const system = `${SYSTEM}\n\n${describeCards(cards, focusedId)}`;

	for (let step = 0; step < MAX_STEPS; step++) {
		const res = await client.messages.create({ model: MODEL, max_tokens: 4096, system, tools, messages });
		messages.push({ role: 'assistant', content: res.content });

		const toolUses = res.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');
		if (res.stop_reason !== 'tool_use' || toolUses.length === 0) {
			const text = res.content
				.filter((b): b is Anthropic.TextBlock => b.type === 'text')
				.map((b) => b.text)
				.join('\n')
				.trim();
			return { text, ops: screen.ops, history: messages };
		}

		const results: Anthropic.ToolResultBlockParam[] = [];
		for (const use of toolUses) {
			try {
				const out = await runTool(use.name, use.input as Record<string, unknown>, screen);
				results.push({ type: 'tool_result', tool_use_id: use.id, content: JSON.stringify(out).slice(0, 40_000) });
			} catch (e) {
				results.push({ type: 'tool_result', tool_use_id: use.id, content: String(e), is_error: true });
			}
		}
		messages.push({ role: 'user', content: results });
	}
	return { text: 'That took more steps than I expected. Try asking again?', ops: screen.ops, history: messages };
}

/** Keyword-based stand-in for the LLM so the UI can be tried without an Anthropic key. Uses real Lumiere data. */
async function scripted({ message, history, cards: onScreen }: ChatRequest): Promise<ChatResponse> {
	const m = message.toLowerCase();
	const id = DEFAULT_VIDEO_ID;
	const done = (text: string, cards: Card[] = []): ChatResponse => {
		// Same title already on screen → focus it instead of adding a duplicate.
		const ops: CardOp[] = cards.map((card) => {
			const existing = onScreen.find((c) => c.title === card.title);
			return existing ? { op: 'focus', id: existing.id } : { op: 'add', card };
		});
		return {
			text: `${text} (scripted mode, no LLM connected)`,
			ops,
			history: [...history, { role: 'user', content: message }, { role: 'assistant', content: text }]
		};
	};
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
