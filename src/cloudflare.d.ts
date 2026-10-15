// The slice of the Cloudflare Workers runtime this app uses. Declared by hand rather than with `wrangler types`,
// whose global runtime types replace the DOM's Request/Response types across the whole app.

/** Cloudflare D1, as used by the store (src/lib/server/store.ts). */
interface D1Database {
	prepare(query: string): D1PreparedStatement;
}

interface D1PreparedStatement {
	bind(...values: unknown[]): D1PreparedStatement;
	first<T>(): Promise<T | null>;
	all<T>(): Promise<{ results: T[] }>;
	run(): Promise<{ meta: { changes: number } }>;
}

declare module 'cloudflare:workers' {
	/** Bindings from wrangler.jsonc. */
	export const env: { DB: D1Database };
}
