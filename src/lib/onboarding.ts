/**
 * The onboarding sequence: from Lumi's welcome until the person has been into the example project and out again, or
 * opened any other project (a new one included). While it's on, the projects page lists only the example.
 *
 * Kept in a cookie (not localStorage) so the server can leave the other projects out of the page it renders, without
 * them flashing in first. Per browser, like the welcome.
 */
export const ONBOARDING_COOKIE = 'iris_onboarding';

/** Set while a restart is navigating away from the example, so leaving it doesn't end the new sequence. */
let restarting = false;

export function startOnboarding() {
	document.cookie = `${ONBOARDING_COOKIE}=on; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}

export const isOnboarding = () => document.cookie.includes(`${ONBOARDING_COOKIE}=on`);

export function endOnboarding() {
	if (restarting || !isOnboarding()) return;
	document.cookie = `${ONBOARDING_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

/** Runs `navigate` (a restart's trip to the projects page) without it counting as leaving the example. */
export async function whileRestarting(navigate: () => Promise<unknown>) {
	restarting = true;
	try {
		await navigate();
	} finally {
		restarting = false;
	}
}

/**
 * "How Iris works" (intro.ts): played in Lumi's dock on the projects page until it's finished or skipped once,
 * then her welcome follows. A cookie, so the server knows to leave the project tiles out on a first visit.
 */
export const INTRO_COOKIE = 'iris_intro';

export const isIntroSeen = () => document.cookie.includes(`${INTRO_COOKIE}=seen`);

export function markIntroSeen() {
	document.cookie = `${INTRO_COOKIE}=seen; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}

export function resetIntro() {
	document.cookie = `${INTRO_COOKIE}=; path=/; max-age=0; samesite=lax`;
}
