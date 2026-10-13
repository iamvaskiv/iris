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
- open_project works the same way for existing projects: say where you're taking them.`;

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
				firstMessage: { type: 'string', description: 'Question to ask the assistant inside the new project' }
			},
			required: ['name']
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
export type WorkspaceResponse = { text: string; history: unknown[]; navigate?: Navigate; error?: string };

function describeProjects() {
	const list = projects.list();
	if (!list.length) return 'Projects: none yet.';
	const lines = list.map(
		(p) =>
			`- [${p.id}] "${p.name}"${p.summary ? ` — ${p.summary}` : ''} | videos: ${p.videoIds.join(', ') || 'none'} | ${p.cards.length} cards`
	);
	return `Projects, most recently updated first:\n${lines.join('\n')}`;
}

export async function workspaceChat(message: string, history: Anthropic.MessageParam[]): Promise<WorkspaceResponse> {
	if (!env.ANTHROPIC_API_KEY) return scripted(message, history);
	let navigate: Navigate | undefined;

	async function exec(name: string, input: Record<string, unknown>) {
		if (libraryTools.some((t) => t.name === name)) return runLibraryTool(name, input);
		const firstMessage = input.firstMessage as string | undefined;
		if (name === 'create_project') {
			const project = projects.create(input.name as string);
			if (input.videoId) {
				await lumiere.video(input.videoId as string); // validates the id
				project.videoIds.push(input.videoId as string);
				projects.save(project);
			}
			navigate = { projectId: project.id, message: firstMessage };
			return { created: true, id: project.id };
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
		return { ...res, navigate };
	} catch (e) {
		if (llmUnavailable(e)) return scripted(message, history);
		throw e;
	}
}

function scripted(message: string, history: Anthropic.MessageParam[]): WorkspaceResponse {
	const text = 'I need an LLM to chat here. Use New to start a project. (scripted mode, no LLM connected)';
	return { text, history: [...history, { role: 'user', content: message }, { role: 'assistant', content: text }] };
}
