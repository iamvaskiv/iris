import type Anthropic from '@anthropic-ai/sdk';
import * as env from '$app/env/private';
import { libraryTools, llmUnavailable, runLibraryTool, runLoop } from './agent.js';
import { lumiere } from './lumiere.js';
import { projects } from './projects.js';

const SYSTEM = `You are Lumi, the assistant inside a video intelligence platform backed by Lumiere.

Where you are: the PROJECTS page (workspace level), not inside a project.
- The user sees a grid of their projects and your latest reply in a small bubble above the input. There are no cards here.
- Reply in one or two short, friendly sentences. Plain text only: no markdown, no bullet lists, no headings. For many items, give the count and name a few ("Seven trailers, including House Party and Women Talking."). Answer quick questions directly: about their projects, or about videos in the Lumiere library (you can browse and read it).

Projects:
- Deep work on a video (cards, analysis, quotes, comparisons) happens inside a project.
- When a request needs that, suggest opening a relevant existing project, or offer to create a new one, and ask. Don't create a project on your own initiative.
- Create a project only when the user asks for one or agrees to your offer. Then call create_project and tell them in your reply ("Creating 'Women Talking' and taking you there."). The app shows your reply, then moves them into the project.
- Pass firstMessage when there is a question to continue inside the new project, and videoId when you know which video it is about.
- open_project works the same way for existing projects: say where you're taking them.

Deleting projects:
- Delete a project only when the user asks. Always confirm first: call delete_project without confirmed to see what would be deleted, then ask the user, naming the project ("Delete 'Movie Trailers' and its 3 cards? Its videos stay in Lumiere."). Never confirm on their behalf.
- Call it with confirmed: true only after the user clearly says yes in their latest message. If the request is ambiguous (several matching projects), ask which one.

Analysis status:
- Many library videos have never been analysed by Lumiere (list_folder / get_video show \`analysed\`). An unanalysed video has no summary, characters, scenes or transcript, so a project about it has little to work with.
- Check before offering a project for a video. If it isn't analysed, say so in your offer and suggest uploading the video file into a new project instead (Lumiere analyses uploads automatically, in a few minutes).
- If the user still wants a project for an unanalysed video, create it with allowUnanalysed: true.`;

const tools: Anthropic.Tool[] = [
	...libraryTools,
	{
		name: 'create_project',
		description: 'Create a new project and take the user into it. Only after the user asked or agreed.',
		input_schema: {
			type: 'object',
			properties: {
				name: { type: 'string', description: 'Short name, 2-4 words' },
				videoId: { type: 'string', description: 'Lumiere video to attach, if known' },
				firstMessage: { type: 'string', description: 'Question to ask the assistant inside the new project' },
				allowUnanalysed: {
					type: 'boolean',
					description: 'Only after telling the user the video has no Lumiere analysis and they still want it'
				}
			},
			required: ['name']
		}
	},
	{
		name: 'delete_project',
		description:
			"Delete a project (its cards and conversation; videos stay in Lumiere). Without confirmed it only describes what would be deleted. Use confirmed: true only after the user said yes.",
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

export type Navigate = { projectId: string; message?: string };
export type WorkspaceResponse = {
	text: string;
	history: unknown[];
	navigate?: Navigate;
	/** The project list changed (e.g. a project was deleted). */
	refresh?: boolean;
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
		m.role === 'user' && (typeof m.content === 'string' || m.content.some((b) => b.type === 'text'));
	const lastUser = history.findLastIndex(isUserText);
	const ids = new Set<string>();
	for (const m of history.slice(lastUser + 1)) {
		if (m.role !== 'assistant' || typeof m.content === 'string') continue;
		for (const b of m.content) {
			const input = b.type === 'tool_use' ? (b.input as { id?: string; confirmed?: boolean }) : null;
			if (b.type === 'tool_use' && b.name === 'delete_project' && input?.id) ids.add(input.id);
		}
	}
	return ids;
}

export async function workspaceChat(message: string, history: Anthropic.MessageParam[]): Promise<WorkspaceResponse> {
	if (!env.ANTHROPIC_API_KEY) return scripted(message, history);
	let navigate: Navigate | undefined;
	let refresh = false;
	const awaitingConfirmation = pendingDeletions(history);

	async function exec(name: string, input: Record<string, unknown>) {
		if (libraryTools.some((t) => t.name === name)) return runLibraryTool(name, input);
		const firstMessage = input.firstMessage as string | undefined;
		if (name === 'create_project') {
			const videoId = input.videoId as string | undefined;
			// Check first: a project for an unanalysed video has nothing to show.
			if (videoId && !input.allowUnanalysed && !(await lumiere.isAnalysed(videoId))) {
				throw new Error(
					'Not created: this video has not been analysed by Lumiere. Tell the user and suggest uploading the file into a new project; create anyway only if they insist (allowUnanalysed: true).'
				);
			}
			const project = projects.create(input.name as string);
			if (videoId) projects.update(project.id, (p) => p.videoIds.push(videoId));
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
					wouldDelete: { name: project.name, cards: project.cards.length, videos: project.videoIds.length },
					next: 'Ask the user to confirm. Videos stay in Lumiere.'
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
		const res = await runLoop({ system: `${SYSTEM}\n\n${describeProjects()}`, tools, history, message, exec });
		return { ...res, navigate, refresh };
	} catch (e) {
		if (llmUnavailable(e)) return scripted(message, history);
		throw e;
	}
}

function scripted(message: string, history: Anthropic.MessageParam[]): WorkspaceResponse {
	const text = 'I need an LLM to chat here. Use New to start a project. (scripted mode, no LLM connected)';
	return { text, history: [...history, { role: 'user', content: message }, { role: 'assistant', content: text }] };
}
