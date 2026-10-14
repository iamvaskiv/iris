/** Projects-page conversation, kept for the browser session so it survives visiting a project and coming back. */
export const workspaceChat = $state({ history: [] as unknown[], reply: '', choices: [] as string[] });

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
