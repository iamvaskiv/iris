import { browser } from '$app/env';
import { page } from '$app/state';

/**
 * The "Getting started" checklist: the first tile on the projects page and a pill pinned to the top right of every
 * project page. Steps tick themselves off as the person does them in their own projects (never in the example; see
 * the project page). Restarting onboarding clears it.
 *
 * Kept per browser in a cookie, so the server renders the same state the browser has (no tile popping in).
 */
export const CHECKLIST_COOKIE = 'iris_checklist';

export const STEPS = [
	{ id: 'upload', label: 'Upload your first video', hint: 'Drop a video into a new project.' },
	{
		id: 'review',
		label: 'Review the analysed video',
		hint: "Lumi shows its scenes and characters once it's ready."
	},
	{ id: 'ask', label: 'Ask a question about it', hint: 'Ask Lumi anything about your video.' },
	{
		id: 'study',
		label: 'Start a study for a video',
		hint: 'Ask Lumi to draft a few questions for viewers.'
	},
	{
		id: 'feedback',
		label: 'Review viewer feedback',
		hint: "Ask Lumi what viewers thought, or open a study's results."
	}
] as const;

export type StepId = (typeof STEPS)[number]['id'];
export type Checklist = { done: StepId[]; dismissed: boolean };

/** Cookie value: "dismissed", or the done steps joined with dots. */
export function parseChecklist(value: string | undefined): Checklist {
	if (value === 'dismissed') return { done: STEPS.map((s) => s.id), dismissed: true };
	const ids = new Set(value?.split('.'));
	return { done: STEPS.map((s) => s.id).filter((id) => ids.has(id)), dismissed: false };
}

const readCookie = () =>
	decodeURIComponent(
		document.cookie.match(new RegExp(`(?:^|; )${CHECKLIST_COOKIE}=([^;]*)`))?.[1] ?? ''
	);

function writeCookie(value: string) {
	document.cookie = value
		? `${CHECKLIST_COOKIE}=${value}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
		: `${CHECKLIST_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

// In the browser only: the server reads the request's cookie through the layout data instead, since module state
// there would be shared between requests.
let state: Checklist | undefined = $state(browser ? parseChecklist(readCookie()) : undefined);

/** The checklist as it is now: from the request on the server, from the cookie in the browser. */
export function checklist(): Checklist {
	if (!browser) return (page.data.checklist as Checklist | undefined) ?? parseChecklist(undefined);
	return state!;
}

/** Ticks off steps (already done ones are ignored). */
export function completeSteps(...ids: StepId[]) {
	const current = checklist();
	const missing = ids.filter((id) => !current.done.includes(id));
	if (!missing.length || current.dismissed) return;
	state = {
		...current,
		done: STEPS.map((s) => s.id).filter((id) => current.done.includes(id) || missing.includes(id))
	};
	writeCookie(state.done.join('.'));
}

/** Hides the checklist for good (offered once every step is done). */
export function dismissChecklist() {
	state = { ...checklist(), dismissed: true };
	writeCookie('dismissed');
}

/** Restarting onboarding: every step open again. */
export function resetChecklist() {
	state = parseChecklist(undefined);
	writeCookie('');
}
