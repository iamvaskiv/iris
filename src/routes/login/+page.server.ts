import { fail, redirect } from '@sveltejs/kit';
import { dev } from '$app/env';
import * as env from '$app/env/private';
import { SESSION_COOKIE, SESSION_DAYS, safeRedirect, sessionToken } from '#lib/server/auth.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	// No gate in development, so nothing to sign in to.
	if (dev) redirect(303, '/');
};

export const actions: Actions = {
	default: async ({ request, cookies, url }) => {
		const password = String((await request.formData()).get('password') ?? '');
		if (!env.SITE_PASSWORD || password !== env.SITE_PASSWORD) return fail(400, { wrong: true });
		cookies.set(SESSION_COOKIE, await sessionToken(env.SITE_PASSWORD), {
			path: '/',
			httpOnly: true,
			secure: !dev,
			sameSite: 'lax',
			maxAge: SESSION_DAYS * 24 * 60 * 60
		});
		redirect(303, safeRedirect(url.searchParams.get('to')));
	}
};
