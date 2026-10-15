import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit/hooks';
import { dev } from '$app/env';
import * as env from '$app/env/private';
import { SESSION_COOKIE, sessionToken } from '#lib/server/auth.js';

/** Production only: everything sits behind the team password. The dev server never asks. */
export const handle: Handle = async ({ event, resolve }) => {
	if (dev || event.url.pathname === '/login') return resolve(event);
	// Fail closed: a deploy without a password must not be open to anyone with the link.
	if (!env.SITE_PASSWORD)
		return new Response('Sign-in is not set up yet (SITE_PASSWORD is missing).', { status: 503 });
	if (event.cookies.get(SESSION_COOKIE) === (await sessionToken(env.SITE_PASSWORD)))
		return resolve(event);
	if (event.url.pathname.startsWith('/api/')) return new Response('Not signed in', { status: 401 });
	redirect(303, `/login?to=${encodeURIComponent(event.url.pathname + event.url.search)}`);
};
