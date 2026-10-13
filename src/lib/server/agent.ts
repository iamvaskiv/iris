import Anthropic from '@anthropic-ai/sdk';
import * as env from '$app/env/private';
import { lumiere } from './lumiere.js';
import { settings } from './settings.js';
import { assets, describeAssets } from './assets.js';
import type { Card, CardOp, ChatResponse } from '#lib/cards/types.js';
import type { Project } from '#lib/projects.js';
const MODEL = 'claude-sonnet-5-5';
const MAX_STEPS = 8;

/** Lumiere is an invisible service behind Jinn; both assistants share these rules. */
export const BRAND = `You are Lumi, the assistant in Jinn, an app for understanding videos.
Jinn's video analysis runs on a service the user never sees. Never mention Lumiere, the underlying service, APIs, ingestion, folders or processing pipelines: analysing videos is simply something you do. Talk about "your videos" and their analysis.`;

/** Extra rules when the Lumiere library is exposed (Settings → Video library). */
export const LIBRARY = `Video library access is ON: besides the user's own videos you can browse the team's video library with list_folder and read any video in it. Call it "the video library". Library videos only have an analysis (summary, characters, scenes, transcript) if \`analysed\` is true; check before relying on one, and if it isn't analysed, say so and suggest uploading the file instead.`;

function systemPrompt(library: boolean) {
	return `${BRAND}

How the interface works (important):
- The user only sees your LATEST text reply, in a small bubble above the input at the bottom of the screen. Keep it to one or two short, friendly sentences. Plain text only: no markdown, no bullet lists, no headings. For many items, give the count and name a few ("Seven characters, including Ona and Salome.").
- The center of the screen holds cards: visual answers that stay on screen. One card at a time is in focus; the others are dimmed.

Choosing how to answer, in this order:
1. Text only. Quick facts, yes/no, a number, a name, a clarifying question, small talk, or anything that fits in a sentence or two. Most follow-ups land here. Don't touch the cards.
2. focus_card. The answer is already on an existing card: bring it into focus and point to it in your reply.
3. update_card. The question is about an existing card's subject but the card needs to change (add items, more detail, correct, filter, re-sort, rename). Edit that card in place instead of making a new one.
4. show_card. Only for a genuinely new subject that no existing card covers, and only when the answer is worth looking at (a video, a list of characters/scenes/themes, quotes, a structured breakdown). At most one new card per turn.

Card rules:
- Never create a card that repeats or overlaps an existing one: same subject, same entity, same list. Update or focus it instead.
- A card is about one subject. Keep titles short and stable so the card can be found and extended later.
- "upload" cards are managed by the app (upload progress); never update or focus them.
- Don't repeat a card's content in your text reply; point to it ("Added her scenes to Envy's card.").

Projects:
- Every conversation lives in a project (shown as a tile on the projects page). Its details are below.
- After the first real exchange, give the project a short name (2-4 words) with update_project. Keep its summary as one plain sentence with the current key takeaway, and refresh it when a new finding replaces the old one. Don't mention these updates in your reply.
- The user's own videos (assets, listed below) can be used in any project. When they mention a video they already have, attach it with add_video instead of asking them to upload it again. To compare videos, attach each one.
- If the project has no video yet and none of their videos fits, suggest dropping one onto the page to upload it${library ? ', or picking one from the video library (list_folder)' : ''}.
- When the user says a video finished uploading, fetch its summary, entities, chapters and transcript, then show a video card for it plus at most one more card with the analysis.

Data:
- Work with the project's videos and the user's other videos${library ? ', or a video from the video library' : ''}.
- Always fetch data with tools before answering; never invent characters, quotes or timestamps.
- If data is missing (e.g. an empty transcript), say so briefly and offer what is available instead.${library ? `\n\n${LIBRARY}` : ''}`;
}

function describeProject(p: Project) {
	const videos = p.videoIds.length ? p.videoIds.join(', ') : 'none yet';
	return `Project: "${p.name}"${p.summary ? ` — summary: ${p.summary}` : ''}\nProject videos: ${videos}`;
}

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

/** Read-only Lumiere tools, shared with the projects-level assistant. list_folder is only offered with library access. */
export const libraryTools: Anthropic.Tool[] = [
	{
		name: 'list_folder',
		description:
			"List folders and videos in the team's Lumiere library. Use folderId 'ROOT' for the top level. Videos have `analysed`: false means Lumiere has no AI analysis for it (no summary, entities, scenes or transcript).",
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
	}
];

export async function runLibraryTool(name: string, input: Record<string, unknown>, defaultVideoId?: string) {
	const id = (input.videoId as string) ?? defaultVideoId;
	if (name !== 'list_folder' && !id) throw new Error('No video given.');
	switch (name) {
		case 'list_folder':
			return lumiere.listFolder(input.folderId as string);
		case 'get_video': {
			const video = await lumiere.video(id!);
			return { ...video, analysed: video.processingStatus === 'completed' };
		}
		case 'get_entities':
			return lumiere.entities(id!, input.types as string);
		case 'get_chapters':
			return lumiere.chapters(id!);
		case 'get_moments':
			return lumiere.moments(id!, input.granularity as string);
		case 'get_transcript':
			return lumiere.transcript(id!);
	}
	return undefined;
}

const allTools: Anthropic.Tool[] = [
	...libraryTools,
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
	},
	{
		name: 'update_project',
		description: "Set the project's name and/or one-sentence summary shown on its tile.",
		input_schema: { type: 'object', properties: { name: { type: 'string' }, summary: { type: 'string' } } }
	},
	{
		name: 'add_video',
		description: "Attach one of the user's videos (assets) to the project" + ' (or, with library access, a video library video).',
		input_schema: { type: 'object', properties: { videoId: { type: 'string' } }, required: ['videoId'] }
	}
];

/** Library-only tools; without library access the assistants only see videos in the user's projects. */
export const LIBRARY_ONLY = ['list_folder'];
const toolsFor = (library: boolean) => (library ? allTools : allTools.filter((t) => !LIBRARY_ONLY.includes(t.name)));

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

type Turn = { project: Project; ops: CardOp[]; library: boolean; assetIds: Set<string> };

async function runTool(name: string, input: Record<string, unknown>, turn: Turn): Promise<unknown> {
	const { project, ops, library, assetIds } = turn;
	const id = (input.videoId as string) ?? project.videoIds[0];
	if (!library && LIBRARY_ONLY.includes(name)) throw new Error(`Unknown tool ${name}`);
	// Without library access, only the user's own videos (assets) are reachable.
	if (!library && (name.startsWith('get_') || name === 'add_video') && id && !assetIds.has(id) && !project.videoIds.includes(id)) {
		throw new Error("That video isn't one of the user's videos.");
	}
	if (name.startsWith('get_') && !id) throw new Error('The project has no video yet.');
	const find = () => {
		const card = project.cards.find((c) => c.id === input.id);
		if (!card) throw new Error(`No card with id ${input.id}. Cards: ${project.cards.map((c) => c.id).join(', ')}`);
		return card;
	};
	if (libraryTools.some((t) => t.name === name)) return runLibraryTool(name, input, id);
	switch (name) {
		case 'show_card': {
			const card = await makeCard(input as unknown as CardInput);
			project.cards.push(card);
			ops.push({ op: 'add', card });
			return { shown: true, id: card.id };
		}
		case 'update_card': {
			const { id: _, ...changes } = input;
			const card = Object.assign(find(), changes);
			ops.push({ op: 'update', card: { ...card } });
			return { updated: true };
		}
		case 'focus_card': {
			ops.push({ op: 'focus', id: find().id });
			return { focused: true };
		}
		case 'update_project':
			if (input.name) project.name = input.name as string;
			if (input.summary) project.summary = input.summary as string;
			return { updated: true };
		case 'add_video': {
			const analysed = (await assets.ensure(id)).status === 'analysed'; // also validates and registers it
			if (!project.videoIds.includes(id)) project.videoIds.push(id);
			return analysed
				? { added: true, analysed, videoIds: project.videoIds }
				: { added: true, analysed, note: 'Not analysed: tell the user there is no summary, entities, scenes or transcript for it.' };
		}
		default:
			throw new Error(`Unknown tool ${name}`);
	}
}

/** `project` is mutated in place (cards, name, summary, videos); the caller saves it. */
export type ChatRequest = { message: string; project: Project };

export async function chat(req: ChatRequest): Promise<ChatResponse> {
	if (!env.ANTHROPIC_API_KEY) return scripted(req);
	try {
		return await agent(req);
	} catch (e) {
		// No working LLM (bad key, missing workspace id…): keep the prototype usable.
		if (llmUnavailable(e)) {
			console.warn('Anthropic unavailable, using scripted mode:', String(e));
			return scripted(req);
		}
		throw e;
	}
}

/** Whether an error means "no usable LLM" (bad key, missing workspace id…), so callers can fall back. */
export const llmUnavailable = (e: unknown) =>
	e instanceof Anthropic.APIError && (e.status === 400 || e.status === 401 || e.status === 403);

/** Runs the model with tools until it answers in text. */
export async function runLoop(opts: {
	system: string;
	tools: Anthropic.Tool[];
	history: Anthropic.MessageParam[];
	message: string;
	exec: (name: string, input: Record<string, unknown>) => Promise<unknown>;
}): Promise<{ text: string; history: Anthropic.MessageParam[] }> {
	const client = new Anthropic({
		apiKey: env.ANTHROPIC_API_KEY,
		defaultHeaders: env.ANTHROPIC_WORKSPACE_ID ? { 'anthropic-workspace-id': env.ANTHROPIC_WORKSPACE_ID } : undefined
	});
	const messages: Anthropic.MessageParam[] = [...opts.history, { role: 'user', content: opts.message }];

	for (let step = 0; step < MAX_STEPS; step++) {
		const res = await client.messages.create({
			model: MODEL,
			max_tokens: 4096,
			system: opts.system,
			tools: opts.tools,
			messages
		});
		messages.push({ role: 'assistant', content: res.content });

		const toolUses = res.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');
		if (res.stop_reason !== 'tool_use' || toolUses.length === 0) {
			const text = res.content
				.filter((b): b is Anthropic.TextBlock => b.type === 'text')
				.map((b) => b.text)
				.join('\n')
				.trim();
			return { text, history: messages };
		}

		const results: Anthropic.ToolResultBlockParam[] = [];
		for (const use of toolUses) {
			try {
				const out = await opts.exec(use.name, use.input as Record<string, unknown>);
				results.push({ type: 'tool_result', tool_use_id: use.id, content: JSON.stringify(out).slice(0, 40_000) });
			} catch (e) {
				results.push({ type: 'tool_result', tool_use_id: use.id, content: String(e), is_error: true });
			}
		}
		messages.push({ role: 'user', content: results });
	}
	return { text: 'That took more steps than I expected. Try asking again?', history: messages };
}

async function agent({ message, project }: ChatRequest): Promise<ChatResponse> {
	const { libraryAccess: library } = settings.get();
	const userAssets = await assets.list();
	const turn: Turn = { project, ops: [], library, assetIds: new Set(userAssets.map((a) => a.id)) };
	const { text, history } = await runLoop({
		system: `${systemPrompt(library)}\n\n${describeProject(project)}\n${describeAssets(userAssets)}\n${describeCards(project.cards, project.focusedId)}`,
		tools: toolsFor(library),
		history: project.history as Anthropic.MessageParam[],
		message,
		exec: (name, input) => runTool(name, input, turn)
	});
	return { text, ops: turn.ops, history };
}

/** Keyword-based stand-in for the LLM so the UI can be tried without an Anthropic key. Uses real Lumiere data. */
async function scripted({ message, project }: ChatRequest): Promise<ChatResponse> {
	const m = message.toLowerCase();
	const id = project.videoIds[0];
	const { history, cards: onScreen } = project;
	const done = (text: string, cards: Card[] = []): ChatResponse => {
		// Same title already on screen → focus it instead of adding a duplicate.
		const ops: CardOp[] = cards.map((card) => {
			const existing = onScreen.find((c) => c.title === card.title);
			if (existing) return { op: 'focus', id: existing.id };
			onScreen.push(card);
			return { op: 'add', card };
		});
		return {
			text: `${text} (scripted mode, no LLM connected)`,
			ops,
			history: [...history, { role: 'user', content: message }, { role: 'assistant', content: text }]
		};
	};
	if (!id) return done('This project has no video yet.');
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
