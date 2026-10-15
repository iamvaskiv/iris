/**
 * Shared-password gate for the deployed app. The session cookie holds a hash of the password, so changing the
 * password signs everyone out.
 */
export const SESSION_COOKIE = 'iris_session';
export const SESSION_DAYS = 30;

export async function sessionToken(password: string) {
	const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`iris-session:${password}`));
	return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Only same-site paths, so the login page can't be used to bounce people elsewhere. */
export const safeRedirect = (to: string | null) => (to?.startsWith('/') && !to.startsWith('//') ? to : '/');
