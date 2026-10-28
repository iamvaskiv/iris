import { building } from '$app/env';
import { defineEnvVars } from '@sveltejs/kit/env';

const optional = (value: string | undefined) => value || undefined;

/**
 * Required when the app runs, but not while it's being built: the build only analyses the routes, and on Cloudflare
 * (Workers Builds) these come from the worker's runtime variables, which the build step doesn't get.
 */
const atRuntime = (value: string | undefined) => {
	if (value !== undefined) return value;
	if (building) return '';
	throw new Error('Not set: add it to .env, or to the worker’s runtime variables.');
};

export const variables = defineEnvVars({
	ANTHROPIC_API_KEY: {
		schema: optional,
		description: 'Without it, chat falls back to scripted mode.'
	},
	ANTHROPIC_WORKSPACE_ID: {
		schema: optional,
		description: 'Needed for user-scoped (sk-ant-usr-) keys.'
	},
	LUMIERE_API_KEY: { schema: atRuntime, description: 'Lumiere: Settings → Account → API Keys' },
	LUMIERE_TEAM_ID: { schema: atRuntime },
	SITE_PASSWORD: {
		schema: optional,
		description:
			'Shared team password. Production only: without it the deployed app refuses to serve; dev never asks.'
	},
	LUMIERE_FOLDER_ID: {
		schema: atRuntime,
		description:
			'Folder that uploads go into (named "jinn", the project\'s earlier codename, in The Gradient).'
	}
});
