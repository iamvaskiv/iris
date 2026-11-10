import { readLocal, writeLocal } from './local.js';

/** Projects-page conversation, kept for the browser session so it survives visiting a project and coming back. */
export const workspaceChat = $state({
	history: [] as unknown[],
	reply: '',
	choices: [] as string[]
});

export type WorkspaceResponse = {
	text: string;
	history: unknown[];
	/** Set when the assistant created or opened a project. */
	navigate?: { projectId?: string; name?: string; message?: string };
	/** The project list changed (e.g. a project was deleted). */
	refresh?: boolean;
	choices?: string[];
	error?: string;
};

/** Set once someone has answered Lumi's welcome (or chatted at all), so it isn't shown again on this device. */
const WELCOMED = 'iris.welcomed';

/** Lumi's welcome for someone new: what she does, and a first step to pick. */
export const WELCOME = {
	reply:
		"Hi, I'm **Lumi**. Ask me about a video and I'll answer with cards: its scenes and characters, what viewers thought, side-by-side comparisons.\n\nWant to see an example first?",
	example: 'Show me an example',
	upload: 'Upload my own video',
	choices: ['Show me an example', 'Upload my own video', 'What can you do?']
};

/** Shows the welcome when this device hasn't seen it and nothing else is in the conversation yet. */
export function maybeWelcome() {
	if (readLocal(WELCOMED) || workspaceChat.reply || workspaceChat.history.length) return;
	workspaceChat.reply = WELCOME.reply;
	workspaceChat.choices = WELCOME.choices;
}

export const markWelcomed = () => writeLocal(WELCOMED, '1');

/** Settings: show the welcome again on the next visit to the projects page. */
export function resetWelcome() {
	try {
		localStorage.removeItem(WELCOMED);
	} catch {
		// Storage blocked: the welcome shows every visit anyway.
	}
	Object.assign(workspaceChat, { history: [], reply: '', choices: [] });
}
