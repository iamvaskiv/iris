import { goto, invalidateAll } from '$app/navigation';
import { page } from '$app/state';
import { readLocal, writeLocal } from './local.js';
import { resetChecklist } from './checklist.svelte.js';
import { INTRO_STEPS } from './intro.js';
import { isIntroSeen, resetIntro, startOnboarding, whileRestarting } from './onboarding.js';

/** Projects-page conversation, kept for the browser session so it survives visiting a project and coming back. */
export const workspaceChat = $state({
	history: [] as unknown[],
	reply: '',
	choices: [] as string[],
	/** "How Iris works" playing in the dock: the step shown, or null when it isn't (see intro.ts). */
	introStep: null as number | null
});

/** Plays one step of "How Iris works": Lumi's line and the answers to it. */
export function showIntroStep(step: number) {
	Object.assign(workspaceChat, {
		introStep: step,
		reply: INTRO_STEPS[step].reply,
		choices: []
	});
}

/** Starts "How Iris works" if this browser hasn't seen it yet; true when it did. */
export function maybeIntro() {
	if (isIntroSeen() || workspaceChat.history.length) return false;
	if (workspaceChat.introStep === null) showIntroStep(0);
	return true;
}

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
		"Hi, I'm **Lumi**. Ask me about a video and I'll answer with cards: its scenes and characters, what viewers thought, side-by-side comparisons.\n\nWant to see a demo first?",
	example: 'Show me a demo',
	upload: 'Upload my own video',
	choices: ['Show me a demo', 'Upload my own video', 'What can you do?']
};

/**
 * Shows the welcome when this device hasn't seen it and nothing else is in the conversation yet. Returns true when
 * it did: the onboarding sequence starts with it (see onboarding.ts).
 */
export function maybeWelcome() {
	if (readLocal(WELCOMED) || workspaceChat.history.length || workspaceChat.introStep !== null)
		return false;
	// The intro comes first; the welcome follows it (see the projects page).
	if (!isIntroSeen()) return false;
	if (workspaceChat.reply) return false;
	workspaceChat.reply = WELCOME.reply;
	workspaceChat.choices = WELCOME.choices;
	startOnboarding();
	return true;
}

export const markWelcomed = () => writeLocal(WELCOMED, '1');

/** Restarts onboarding on this device: the example back to how it starts, then Lumi's welcome on the projects page. */
export async function restartOnboarding() {
	try {
		localStorage.removeItem(WELCOMED);
	} catch {
		// Storage blocked: the welcome shows every visit anyway.
	}
	Object.assign(workspaceChat, { history: [], reply: '', choices: [], introStep: null });
	startOnboarding();
	resetChecklist();
	resetIntro();
	await fetch('/api/onboarding', { method: 'DELETE' }).catch(() => {});
	await whileRestarting(() => (page.url.pathname === '/' ? invalidateAll() : goto('/')));
	// Already on the projects page, its onMount won't run again: the intro starts here (the welcome follows it).
	maybeIntro();
}

/** The shortcut for restartOnboarding, anywhere in the app. */
export const RESTART_KEYS = {
	label: '⌥⇧O',
	matches: (e: KeyboardEvent) =>
		e.altKey && e.shiftKey && !e.metaKey && !e.ctrlKey && e.code === 'KeyO'
};
