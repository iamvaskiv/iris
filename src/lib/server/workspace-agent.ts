import type Anthropic from '@anthropic-ai/sdk';
import * as env from '$app/env/private';
import {
	BRAND,
	CHOICES,
	choicesTool,
	LIBRARY,
	LIBRARY_ONLY,
	libraryTools,
	llmUnavailable,
	parseChoices,
	runLibraryTool,
	runLoop
} from './agent.js';
import { lumiere } from './lumiere.js';
import { projects } from './projects.js';
import { settings } from './settings.js';
import { assets, describeAssets } from './assets.js';

function systemPrompt(library: boolean) {
	return `${BRAND}

Where you are: the PROJECTS page (workspace level), not inside a project.
- The user sees a grid of their projects and your latest reply in a small bubble above the input. There are no cards here.
- Reply in one or two short, friendly sentences. Plain text only: no markdown, no bullet lists, no headings. For many items, give the count and name a few ("Four projects, including Women Talking and Inside Out 2."). Answer quick questions directly about their projects and their videos (assets, listed below; you can read each one's analysis).

Projects:
- Deep work on a video (cards, analysis, quotes, comparisons) happens inside a project.
- New videos get into Iris by uploading them inside a project (drop the file onto the project page).
- When a request needs that, suggest opening a relevant existing project, or offer to create a new one, and ask. Don't create a project on your own initiative.
- Create a project only when the user asks for one or agrees to your offer. Then call create_project and tell them in your reply ("Creating 'Women Talking' and taking you there."). The app shows your reply, then moves them into the project.
- Pass firstMessage when there is a question to continue inside the new project, and videoIds for the videos it's about: any of the user's videos${library ? ' or video library videos' : ''}. Never ask them to upload a video they already have.
- open_project works the same way for existing projects: say where you're taking them.

${CHOICES}

Deleting projects:
- Delete a project only when the user asks. Always confirm first: call delete_project without confirmed to see what would be deleted, then ask the user, naming the project ("Delete 'Movie Trailers' and its 3 cards?"), and offer the choices "Yes, delete it" and "No, keep it". Never confirm on their behalf.
- Call it with confirmed: true only after the user clearly says yes in their latest message. If the request is ambiguous (several matching projects), ask which one.${
		library
			? `\n\n${LIBRARY}\nIf the user still wants a project for an unanalysed library video, create it with allowUnanalysed: true.`
			: ''
	}`;
}

const allTools: Anthropic.Tool[] = [
	...libraryTools,
	choicesTool,
	{
		name: 'create_project',
		description:
			'Create a new project and take the user into it. Only after the user asked or agreed.',
		input_schema: {
			type: 'object',
			properties: {
				name: { type: 'string', description: 'Short name, 2-4 words' },
				videoIds: {
					type: 'array',
					items: { type: 'string' },
					description:
						"Videos to attach: the user's videos (assets), or video library videos with library access"
				},
				firstMessage: {
					type: 'string',
					description: 'Question to ask the assistant inside the new project'
				},
				allowUnanalysed: {
					type: 'boolean',
					description:
						'Only after telling the user the video has no analysis and they still want it'
				}
			},
			required: ['name']
		}
	},
	{
		name: 'delete_project',
		description:
			'Delete a project (its cards and conversation). Without confirmed it only describes what would be deleted. Use confirmed: true only after the user said yes.',
		input_schema: {
			type: 'object',
			properties: { id: { type: 'string' }, confirmed: { type: 'boolean' } },
			required: ['id']
		}
	},
	{
		name: 'open_project',
		description: 'Take the user into an existing project.',
		input_schema: {
			type: 'object',
			properties: { id: { type: 'string' }, firstMessage: { type: 'string' } },
			required: ['id']
		}
	}
];

function toolsFor(library: boolean): Anthropic.Tool[] {
	if (library) return allTools;
	// Without library access: no browsing; the user's own videos stay available.
	return allTools.filter((t) => !LIBRARY_ONLY.includes(t.name));
}

/** Where to take the user: an existing project, or (no projectId) a draft with this name that saves on first content. */
export type Navigate = { projectId?: string; name?: string; message?: string };
export type WorkspaceResponse = {
	text: string;
	history: unknown[];
	navigate?: Navigate;
	/** The project list changed (e.g. a project was deleted). */
	refresh?: boolean;
	/** Answers offered with the reply, shown as buttons in place of the input. */
	choices?: string[];
	error?: string;
};

function describeProjects() {
	const list = projects.list();
	if (!list.length) return 'Projects: none yet.';
	const lines = list.map(
		(p) =>
			`- [${p.id}] "${p.name}"${p.summary ? ` — ${p.summary}` : ''} | videos: ${p.videoIds.join(', ') || 'none'} | ${p.cards.length} cards`
	);
	return `Projects, most recently updated first:\n${lines.join('\n')}`;
}

/**
 * Projects the assistant asked the user to confirm deleting in its previous reply: any delete_project call
 * since the last user text message (an unconfirmed one, or a confirmed one that was refused for lack of it).
 */
function pendingDeletions(history: Anthropic.MessageParam[]): Set<string> {
	const isUserText = (m: Anthropic.MessageParam) =>
		m.role === 'user' &&
		(typeof m.content === 'string' || m.content.some((b) => b.type === 'text'));
	const lastUser = history.findLastIndex(isUserText);
	const ids = new Set<string>();
	for (const m of history.slice(lastUser + 1)) {
		if (m.role !== 'assistant' || typeof m.content === 'string') continue;
		for (const b of m.content) {
			const input =
				b.type === 'tool_use' ? (b.input as { id?: string; confirmed?: boolean }) : null;
			if (b.type === 'tool_use' && b.name === 'delete_project' && input?.id) ids.add(input.id);
		}
	}
	return ids;
}

export async function workspaceChat(
	message: string,
	history: Anthropic.MessageParam[]
): Promise<WorkspaceResponse> {
	if (!env.ANTHROPIC_API_KEY) return scripted(message, history);
	let navigate: Navigate | undefined;
	let refresh = false;
	let choices: string[] | undefined;
	const awaitingConfirmation = pendingDeletions(history);
	const { libraryAccess: library } = settings.get();
	const userAssets = await assets.list();
	const assetIds = new Set(userAssets.map((a) => a.id));

	async function exec(name: string, input: Record<string, unknown>) {
		if (libraryTools.some((t) => t.name === name)) {
			if (!library && (LIBRARY_ONLY.includes(name) || !assetIds.has(input.videoId as string))) {
				throw new Error("That video isn't one of the user's videos.");
			}
			return runLibraryTool(name, input);
		}
		if (name === 'offer_choices') {
			choices = parseChoices(input);
			return { shown: true };
		}
		const firstMessage = input.firstMessage as string | undefined;
		if (name === 'create_project') {
			const videoIds = ((input.videoIds as string[] | undefined) ?? []).filter(
				(id) => library || assetIds.has(id)
			);
			// Check first: a project for an unanalysed video has nothing to show.
			const unanalysed = await Promise.all(
				videoIds.map(async (id) => (await assets.ensure(id)).status !== 'analysed')
			);
			if (unanalysed.some(Boolean) && !input.allowUnanalysed) {
				throw new Error(
					'Not created: this video has no analysis. Tell the user and suggest uploading the file into a new project; create anyway only if they insist (allowUnanalysed: true).'
				);
			}
			// Without videos there's nothing to save yet: open a draft, which is saved once it gets content.
			if (!videoIds.length) {
				navigate = { name: input.name as string, message: firstMessage };
				return { created: true };
			}
			const project = projects.create(input.name as string);
			projects.update(project.id, (p) => p.videoIds.push(...videoIds));
			navigate = { projectId: project.id, message: firstMessage };
			return { created: true, id: project.id };
		}
		if (name === 'delete_project') {
			const project = projects.get(input.id as string);
			if (!project) throw new Error(`No project with id ${input.id}`);
			// Enforced here, not just in the prompt: deleting needs a confirmation question in the previous reply.
			if (input.confirmed && !awaitingConfirmation.has(project.id)) {
				throw new Error(
					`Not deleted yet. Ask the user to confirm deleting "${project.name}" and wait for their answer; their yes will go through. Don't mention this check.`
				);
			}
			if (!input.confirmed) {
				return {
					deleted: false,
					wouldDelete: {
						name: project.name,
						cards: project.cards.length,
						videos: project.videoIds.length
					},
					next: 'Ask the user to confirm.'
				};
			}
			projects.remove(project.id);
			refresh = true;
			return { deleted: true, name: project.name };
		}
		if (name === 'open_project') {
			if (!projects.get(input.id as string)) throw new Error(`No project with id ${input.id}`);
			navigate = { projectId: input.id as string, message: firstMessage };
			return { opened: true };
		}
		throw new Error(`Unknown tool ${name}`);
	}

	try {
		const res = await runLoop({
			system: `${systemPrompt(library)}\n\n${describeProjects()}\n${describeAssets(userAssets)}`,
			tools: toolsFor(library),
			history,
			message,
			exec
		});
		return { ...res, navigate, refresh, choices };
	} catch (e) {
		if (llmUnavailable(e)) return scripted(message, history);
		throw e;
	}
}

function scripted(message: string, history: Anthropic.MessageParam[]): WorkspaceResponse {
	const text =
		'I need an LLM to chat here. Use New to start a project. (scripted mode, no LLM connected)';
	return {
		text,
		history: [...history, { role: 'user', content: message }, { role: 'assistant', content: text }]
	};
}
