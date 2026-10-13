import { defineEnvVars } from '@sveltejs/kit/env';

const optional = (value: string | undefined) => value || undefined;

export const variables = defineEnvVars({
	ANTHROPIC_API_KEY: { schema: optional, description: 'Without it, chat falls back to scripted mode.' },
	ANTHROPIC_WORKSPACE_ID: { schema: optional, description: 'Needed for user-scoped (sk-ant-usr-) keys.' },
	LUMIERE_API_KEY: { description: 'Lumiere: Settings → Account → API Keys' },
	LUMIERE_TEAM_ID: {}
});
