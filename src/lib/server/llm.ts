import Anthropic from '@anthropic-ai/sdk';
import * as env from '$app/env/private';

/** The model behind Lumi. */
export const MODEL = 'claude-sonnet-5-5';

/** For small side jobs, like the next steps after each lane. */
export const FAST_MODEL = 'claude-haiku-5-5';

/** A Claude client with the app's key (and workspace, for user-scoped keys). */
export const claude = () =>
	new Anthropic({
		apiKey: env.ANTHROPIC_API_KEY,
		defaultHeaders: env.ANTHROPIC_WORKSPACE_ID
			? { 'anthropic-workspace-id': env.ANTHROPIC_WORKSPACE_ID }
			: undefined
	});
