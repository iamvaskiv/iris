import Anthropic from '@anthropic-ai/sdk';
import * as env from '$app/env/private';
import { lumiere } from './lumiere.js';
import { settings } from './settings.js';
import { videoCardData } from './video-card.js';
import { insights } from './insights.js';
import { comparisonData } from './comparison.js';
import { assets, describeAssets } from './assets.js';
import { cleanQuestions, nameVideos } from './study.js';
import type { Card, CardOp, ChatResponse, ComparisonData, StudyData } from '#lib/cards/types.js';
import type { Project } from '#lib/projects.js';
import { claude, MODEL } from './llm.js';
const MAX_STEPS = 8;

/** Lumiere is an invisible service behind Iris; both assistants share these rules. */
export const BRAND = `You are Lumi, the assistant in Iris, an app for understanding videos.
Iris's video analysis runs on a service the user never sees. Never mention Lumiere, the underlying service, APIs, ingestion, folders or processing pipelines: analysing videos is simply something you do. Talk about "your videos" and their analysis.`;

/** Shared by both assistants: answers the user can pick with one click instead of typing. */
export const CHOICES = `Offering choices:
- When your reply asks the user to pick between a few clear answers (which video, which character, yes/no, what to look at next), also call offer_choices with those answers. They appear as buttons in place of the input; the user can still type something else.
- Ask the question in your text reply; don't list the options there too. Options are short (1-5 words), written as the user's answer ("Compare both", "Just the trailer"), 2-4 of them.
- Only for a real question that waits for the user. Not for open questions ("What would you like to know?").`;

export const choicesTool: Anthropic.Tool = {
	name: 'offer_choices',
	description:
		'Show 2-4 short answers as buttons in place of the input, for the question in your reply. Call it at most once, in the same turn as the question.',
	input_schema: {
		type: 'object',
		properties: { options: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 4 } },
		required: ['options']
	}
};

/** Validates offer_choices input: trimmed, de-duplicated, at most four. */
export function parseChoices(input: Record<string, unknown>) {
	const options = [...new Set(((input.options as unknown[]) ?? []).map((o) => String(o).trim()).filter(Boolean))];
	if (options.length < 2) throw new Error('Offer at least two options.');
	return options.slice(0, 4);
}

/** Extra rules when the Lumiere library is exposed (Settings → Video library). */
/** How replies are written: the bubble renders paragraphs, "- " lists and **bold** (see src/lib/reply-format.ts). */
export const REPLY_FORMAT = `Lead with the answer in one short, friendly sentence. Most replies stop there. When a little more genuinely helps, add either one more short paragraph (after a blank line) or up to three short bullet points ("- " lines); when comparing or going through several things, use the bullets, one thing per line. Bold (**like this**) only the one or two figures or names that matter. Never both, and no closing summary or sign-off: if a card has the details, say so in the opening sentence. No headings, no other markdown, nothing longer: details belong on a card, not in the reply. For many items, give the count and name a few`;

export const LIBRARY = `Video library access is ON: besides the user's own videos you can browse the video library with list_folder and read any video in it. Call it "the video library". It spans several teams: list_folder without a teamId lists them, then pass a teamId (and a folderId within that team) to browse. When the user names a team, browse only that one. Library videos only have an analysis (summary, characters, scenes, transcript) if \`analysed\` is true; check before relying on one, and if it isn't analysed, say so and suggest uploading the file instead.`;

function systemPrompt(library: boolean) {
	return `${BRAND}

How the interface works (important):
- The user only sees your LATEST text reply, in a small bubble above the input at the bottom of the screen. ${REPLY_FORMAT} ("Seven characters, including Ona and Salome.").
- The center of the screen holds cards: visual answers that stay on screen. One card at a time is in focus; the others are dimmed.

Choosing how to answer, in this order:
1. Text only. Quick facts, yes/no, a number, a name, a clarifying question, small talk, or anything that fits in a sentence or two. Most follow-ups land here. Don't touch the cards.
2. focus_card. The answer is already on an existing card: bring it into focus and point to it in your reply.
3. update_card. The question is about an existing card's subject but the card needs to change (add items, more detail, correct, filter, re-sort, rename). Edit that card in place instead of making a new one.
4. show_card. Only for a genuinely new subject that no existing card covers, and only when the answer is worth looking at (a video, a list of characters/scenes/themes, quotes, a structured breakdown). At most one new card per turn.

Card rules:
- Never create a card that repeats or overlaps an existing one: same subject, same entity, same list. Update or focus it instead.
- A card is about one subject. Keep titles short and stable so the card can be found and extended later.
- A study card can show sample results: made-up answers for a demo, because sharing isn't built yet (Share → Fake responses). You may talk about them, but always say they're sample answers, never real ones.
- "upload" cards are managed by the app (upload progress); never update or focus them.
- Don't repeat a card's content in your text reply; point to it ("Added her scenes to Envy's card.").

Projects:
- Every conversation lives in a project (shown as a tile on the projects page). Its details are below.
- After the first real exchange, give the project a short name (2-4 words) with update_project. Keep its summary as one plain sentence with the current key takeaway, and refresh it when a new finding replaces the old one. Don't mention these updates in your reply.
- The user's own videos (assets, listed below) can be used in any project. When they mention a video they already have, attach it with add_video instead of asking them to upload it again. To compare videos, attach each one.
- If the project has no video yet and none of their videos fits, suggest dropping one onto the page to upload it${library ? ', or picking one from the video library (list_folder)' : ''}.
- Viewer insights (views, ratings, sentiment, answers and comments) exist only for videos shown to an audience. When the user asks how a video landed, how viewers reacted, or about performance, call get_insights and show an insights card if there is data; if not, say nobody has watched or responded yet.
- When the user says a video finished uploading, fetch its summary, entities, chapters and transcript, then show a video card for it plus at most one more card with the analysis.

Data:
- Work with the project's videos and the user's other videos${library ? ', or a video from the video library' : ''}.
- Always fetch data with tools before answering; never invent characters, quotes or timestamps.
- If data is missing (e.g. an empty transcript), say so briefly and offer what is available instead.

${CHOICES}${library ? `\n\n${LIBRARY}` : ''}`;
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
		const table = c.columns?.length
			? ` | columns: ${c.columns.join(', ')} | rows: ${(c.rows ?? []).map((r) => r[0]).join('; ').slice(0, 300)}`
			: '';
		// A study's questions in full (as JSON), since update_card replaces the whole list.
		const study = c.type === 'study' ? ` | questions: ${JSON.stringify((c.data as StudyData | undefined)?.questions ?? [])}${describeSample(c.data as StudyData | undefined)}` : '';
		return `- [${c.id}] ${c.type} "${c.title}"${c.subtitle ? ` (${c.subtitle})` : ''}${c.id === focusedId ? ' (in focus)' : ''}${items}${table}${body}${study}`;
	});
	return `Cards on screen, oldest first:\n${lines.join('\n')}`;
}

/** Mean of a 0–10 slider from its counts per value. */
const average = (counts: number[]) => {
	const n = counts.reduce((a, b) => a + b, 0);
	return n ? counts.reduce((sum, c, value) => sum + c * value, 0) / n : 0;
};

/** A study's made-up results, when the card shows them (Share → Fake responses). */
function describeSample(data: StudyData | undefined) {
	const r = data?.sample?.enabled && data.sample.results;
	if (!r) return '';
	const perQuestion = (data.questions ?? []).map((q, i) => {
		const a = r.questions[q.id];
		if (!a) return `${i + 1}. no results`;
		const detail = q.type === 'video' && a.counts
			? `watched by ${a.responses}; reactions ${a.counts.join('/')} positive/neutral/negative: ${(a.people ?? []).slice(0, 4).map((r) => `"${r.text}"`).join(' ')}`
			: q.type === 'scale' && a.counts
			? `average ${average(a.counts).toFixed(1)} / 10`
			: a.counts
			? (q.options ?? []).map((o, k) => `${o}: ${a.counts![k] ?? 0}`).join(', ')
			: (a.people ?? []).slice(0, 5).map((r) => `"${r.text}"`).join(' ');
		return `${i + 1}. ${a.responses} answers; ${detail}`;
	});
	return ` | SHOWING SAMPLE RESULTS (made up, not real answers): ${r.views} views, ${r.completion}% completion, rating ${r.rating}%, sentiment ${r.sentiment.positive}/${r.sentiment.neutral}/${r.sentiment.negative}% positive/neutral/negative; summary: ${r.summary}; ${perQuestion.join('; ')}`;
}

/** Card types the assistant can create (upload cards are the app's own). */
const CARD_TYPES = ['video', 'insights', 'comparison', 'list', 'quotes', 'table', 'text', 'study'];

const tableSchema = {
	columns: { type: 'array', items: { type: 'string' } },
	rows: { type: 'array', items: { type: 'array', items: { type: ['string', 'number'] } } }
};

const questionsSchema = {
	type: 'array',
	description: 'Study cards: the questions, in order.',
	items: {
		type: 'object',
		properties: {
			type: { type: 'string', enum: ['open', 'choice', 'scale', 'video'], description: 'open: free-text answer; choice: pick one of options; scale: a slider from 0 to 10 (for how much, how likely, how strongly); video: show one of the user\'s videos (set videoId; text is an optional line before it), usually followed by questions about it.' },
			videoId: { type: 'string', description: 'Video steps: the id of one of the user\'s videos (assets).' },
			text: { type: 'string' },
			placeholder: { type: 'string', description: 'Open questions: hint in the empty answer field, e.g. "My name is…".' },
			options: { type: 'array', items: { type: 'string' }, description: 'Multiple choice: the answers.' }
		},
		required: ['type', 'text']
	}
};

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
			"Browse the video library. Without a teamId: the teams whose libraries you can browse. With a teamId: that team's folders and videos, starting at folderId 'ROOT' (the default). Videos with `analysed`: false have no AI analysis (no summary, entities, scenes or transcript).",
		input_schema: {
			type: 'object',
			properties: { teamId: { type: 'string' }, folderId: { type: 'string', description: "A folder in that team; 'ROOT' for its top level" } }
		}
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
		name: 'get_insights',
		description:
			'What an audience made of the video, if it was shown to viewers: views (estimated viewing sessions over the last year), number of responses, trailer rating, comment sentiment, answers to questions asked during the video (averages or counts per option) and the most positive and most negative comments with timestamps. Returns available: false when nobody has watched or responded yet.',
		input_schema: { type: 'object', properties: { videoId: { type: 'string' } }, required: ['videoId'] }
	}
];

export async function runLibraryTool(name: string, input: Record<string, unknown>, defaultVideoId?: string) {
	const id = (input.videoId as string) ?? defaultVideoId;
	if (name !== 'list_folder' && !id) throw new Error('No video given.');
	switch (name) {
		case 'list_folder': {
			const teams = await lumiere.teams();
			if (!input.teamId) return { teams };
			if (!teams.some((t) => t.id === input.teamId)) throw new Error(`Unknown team. Teams: ${JSON.stringify(teams)}`);
			return lumiere.listFolder((input.folderId as string) || 'ROOT', input.teamId as string);
		}
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
		case 'get_insights':
			return (await insights.get(id!)) ?? { available: false };
	}
	return undefined;
}

const allTools: Anthropic.Tool[] = [
	...libraryTools,
	choicesTool,
	{
		name: 'show_card',
		description: `Add a NEW card for a subject no existing card covers. It becomes the focused card. Types:
- "video": a video with its summary, scenes and characters. Pass videoId; the player, scenes and characters are added for you. Title: what the video is (e.g. "Women Talking trailer"), not the file name. Body: a two or three sentence summary.
- "insights": viewer insights for a video (views, rating, sentiment, answers to questions, liked and disliked comments). Pass videoId; the numbers are filled in for you. Only when get_insights has data. Body: one sentence with the key takeaway.
- "comparison": two to four videos side by side. Pass videoIds; posters, length, scenes, characters, themes and brands, and from audience data views, responses, response rate, rating, comment sentiment, the top liked and criticised comments and answers to questions asked in several of the videos are filled in for you. Pass focus "audience" to compare only how viewers responded (views, sentiment, ratings...), "content" for only what's in the videos; leave it out for both. Add your own rows for what the numbers don't show (e.g. tone, opening, pacing, call to action): rows of [label, one short value per video in videoIds order]. Never repeat the automatic rows. Body: one sentence with the key difference. Prefer this over a table when comparing videos.
- "list": a list of things (characters, scenes, themes, brands...). Fill items with title/subtitle/description and time (seconds) when known.
- "quotes": lines spoken by someone. items: title = the quote, subtitle = speaker, time = seconds.
- "table": numbers or short facts across a few dimensions (metrics per video, counts per character, side-by-side comparisons). Pass columns (headings; the first labels the rows) and rows (arrays of cells, same length as columns). Keep cells short; use numbers for numeric cells.
- "text": anything else; put the content in body (plain text, line breaks allowed).
- "study": questions to share with people (a study, survey, quiz or questionnaire). Pass questions: a few short, clear drafts the user can edit on the card (they add, remove and rewrite questions there). Title: what the study is about. Sharing and collecting answers aren't available yet; say so if asked.`,
		input_schema: {
			type: 'object',
			properties: {
				type: { type: 'string', enum: CARD_TYPES },
				title: { type: 'string' },
				subtitle: { type: 'string' },
				body: { type: 'string' },
				videoId: { type: 'string' },
				videoIds: { type: 'array', items: { type: 'string' }, description: 'Comparison cards: the videos, in column order.' },
				focus: { type: 'string', enum: ['all', 'content', 'audience'], description: 'Comparison cards: which rows to show.' },
				items: itemsSchema,
				questions: questionsSchema,
				...tableSchema
			},
			required: ['type', 'title']
		}
	},
	{
		name: 'update_card',
		description:
			'Edit an existing card in place and bring it into focus. Pass only the fields to change; items, columns and rows replace the whole value, so include what you want to keep. Pass type to convert the card (e.g. a text card holding numbers into a table).',
		input_schema: {
			type: 'object',
			properties: {
				id: { type: 'string' },
				type: { type: 'string', enum: CARD_TYPES },
				title: { type: 'string' },
				subtitle: { type: 'string' },
				body: { type: 'string' },
				items: itemsSchema,
				questions: { ...questionsSchema, description: 'Study cards: the whole list of questions (replaces it).' },
				...tableSchema
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

type CardInput = Omit<Card, 'id' | 'data'> & {
	videoId?: string;
	videoIds?: string[];
	focus?: ComparisonData['focus'];
	questions?: unknown[];
};

async function makeCard(input: CardInput): Promise<Card> {
	const { videoId, videoIds, focus, questions, ...rest } = input;
	const card: Card = { id: crypto.randomUUID().slice(0, 8), ...rest, data: videoId ? { videoId } : undefined };
	if (card.type === 'study') card.data = { questions: await nameVideos(cleanQuestions(questions ?? [])) };
	if (card.type === 'video' && videoId) card.data = await videoCardData(videoId);
	if (card.type === 'insights') {
		const data = videoId && (await insights.get(videoId));
		if (!data) throw new Error('No viewer insights for that video: nobody has watched or responded yet.');
		card.data = data;
	}
	if (card.type === 'comparison') {
		if (!videoIds || videoIds.length < 2 || videoIds.length > 4) throw new Error('A comparison needs two to four videoIds.');
		card.data = await comparisonData(videoIds, focus);
	}
	return card;
}

type Turn = { project: Project; ops: CardOp[]; library: boolean; assetIds: Set<string>; choices?: string[] };

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
		case 'offer_choices':
			turn.choices = parseChoices(input);
			return { shown: true };
		case 'show_card': {
			const others = ((input.videoIds as string[] | undefined) ?? []).filter((v) => !assetIds.has(v) && !project.videoIds.includes(v));
			if (!library && others.length) throw new Error(`Not the user's videos: ${others.join(', ')}.`);
			const card = await makeCard(input as unknown as CardInput);
			project.cards.push(card);
			ops.push({ op: 'add', card });
			return { shown: true, id: card.id };
		}
		case 'update_card': {
			const { id: _, questions, ...changes } = input;
			const card = find();
			// Converting to another type: the old content doesn't belong to the new template.
			if (changes.type && changes.type !== card.type) {
				delete card.body;
				delete card.items;
				delete card.columns;
				delete card.rows;
			}
			Object.assign(card, changes);
			if (card.type === 'study' && Array.isArray(questions)) card.data = { ...card.data, questions: await nameVideos(cleanQuestions(questions)) };
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
				: { added: true, analysed, note: 'Not analysed: there is no summary, entities, scenes or transcript for it. Viewer insights (get_insights) may still exist, and it can still go in a comparison card.' };
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
	const client = claude();
	const messages: Anthropic.MessageParam[] = [...opts.history, { role: 'user', content: opts.message }];

	let nudged = false;
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
			// Sometimes the model ends right after a tool (e.g. offer_choices) without a word. Ask once for the reply,
			// so the user isn't left with the greeting and a set of answers to nothing.
			const last = messages.at(-2);
			if (!text && !nudged && last) {
				nudged = true;
				messages.pop();
				const nudge = { type: 'text' as const, text: 'Now write your reply to the user.' };
				last.content = typeof last.content === 'string' ? [{ type: 'text', text: last.content }, nudge] : [...last.content, nudge];
				continue;
			}
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
	const { libraryAccess: library } = await settings.get();
	const userAssets = await assets.list();
	const turn: Turn = { project, ops: [], library, assetIds: new Set(userAssets.map((a) => a.id)) };
	const { text, history } = await runLoop({
		system: `${systemPrompt(library)}\n\n${describeProject(project)}\n${describeAssets(userAssets)}\n${describeCards(project.cards, project.focusedId)}`,
		tools: toolsFor(library),
		history: project.history as Anthropic.MessageParam[],
		message,
		exec: (name, input) => runTool(name, input, turn)
	});
	return { text, ops: turn.ops, history, choices: turn.choices };
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
