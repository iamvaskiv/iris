import { dev } from '$app/env';
import { env } from 'cloudflare:workers';

/**
 * Prototype storage: JSON documents grouped in collections (projects, assets, insights, settings), one document per
 * item. In development they live in data/<collection>.json, so local data stays easy to read and edit; deployed,
 * they live in Cloudflare D1 (a `docs` table, see migrations/).
 *
 * `update` is the only safe way to change a document that others may be changing too: it re-reads the document and
 * re-applies the change if someone else saved in between.
 */
export type Collection = 'projects' | 'assets' | 'insights' | 'settings';

/** `version` is opaque: whatever the backend uses to notice that a document changed since it was read. */
type Row = { value: unknown; version: unknown };

interface Backend {
	all(collection: Collection): Promise<Map<string, Row>>;
	get(collection: Collection, id: string): Promise<Row | undefined>;
	/** Saves if the stored version is still `version` (undefined: the document must not exist yet). */
	put(collection: Collection, id: string, value: unknown, version: unknown): Promise<boolean>;
	delete(collection: Collection, id: string): Promise<void>;
}

/** Development: one JSON file per collection, `{ [id]: document }`. A document's version is its JSON text. */
const files: Backend = (() => {
	// Loaded lazily so the deployed bundle never touches the file system. Once loaded, every read-compare-write below
	// is synchronous, so nothing can slip in between.
	const fsModule = () => import('node:fs');
	type Fs = Awaited<ReturnType<typeof fsModule>>;
	const path = (c: Collection) => `data/${c}.json`;
	const read = (fs: Fs, c: Collection): Record<string, unknown> =>
		fs.existsSync(path(c)) ? JSON.parse(fs.readFileSync(path(c), 'utf8')) : {};
	const write = (fs: Fs, c: Collection, docs: Record<string, unknown>) => {
		fs.mkdirSync('data', { recursive: true });
		fs.writeFileSync(path(c), JSON.stringify(docs, null, '\t'));
	};
	const version = (doc: unknown) => (doc === undefined ? undefined : JSON.stringify(doc));
	return {
		async all(c) {
			const docs = read(await fsModule(), c);
			return new Map(
				Object.entries(docs).map(([id, value]) => [id, { value, version: version(value) }])
			);
		},
		async get(c, id) {
			const docs = read(await fsModule(), c);
			return id in docs ? { value: docs[id], version: version(docs[id]) } : undefined;
		},
		async put(c, id, value, expected) {
			const fs = await fsModule();
			const docs = read(fs, c);
			if (version(docs[id]) !== expected) return false;
			write(fs, c, { ...docs, [id]: value });
			return true;
		},
		async delete(c, id) {
			const fs = await fsModule();
			const docs = read(fs, c);
			delete docs[id];
			write(fs, c, docs);
		}
	};
})();

/** Deployed: D1, with a version per document for safe concurrent updates. */
const d1: Backend = (() => {
	const db = () => env.DB;
	type DocRow = { id: string; value: string; version: number };
	return {
		async all(c) {
			const { results } = await db()
				.prepare('SELECT id, value, version FROM docs WHERE collection = ?')
				.bind(c)
				.all<DocRow>();
			return new Map(
				results.map((r) => [r.id, { value: JSON.parse(r.value), version: r.version }])
			);
		},
		async get(c, id) {
			const r = await db()
				.prepare('SELECT id, value, version FROM docs WHERE collection = ? AND id = ?')
				.bind(c, id)
				.first<DocRow>();
			return r ? { value: JSON.parse(r.value), version: r.version } : undefined;
		},
		async put(c, id, value, version) {
			const json = JSON.stringify(value);
			const res =
				version === undefined
					? await db()
							.prepare(
								'INSERT OR IGNORE INTO docs (collection, id, value, version) VALUES (?, ?, ?, 1)'
							)
							.bind(c, id, json)
							.run()
					: await db()
							.prepare(
								'UPDATE docs SET value = ?, version = version + 1 WHERE collection = ? AND id = ? AND version = ?'
							)
							.bind(json, c, id, version)
							.run();
			return res.meta.changes === 1;
		},
		async delete(c, id) {
			await db().prepare('DELETE FROM docs WHERE collection = ? AND id = ?').bind(c, id).run();
		}
	};
})();

const backend = (): Backend => (dev ? files : d1);

export const store = {
	async all<T>(collection: Collection): Promise<T[]> {
		return [...(await backend().all(collection)).values()].map((r) => r.value as T);
	},
	async get<T>(collection: Collection, id: string): Promise<T | undefined> {
		return (await backend().get(collection, id))?.value as T | undefined;
	},
	/** Writes the whole document, replacing whatever is there. */
	async set<T>(collection: Collection, id: string, value: T): Promise<void> {
		for (let attempt = 0; attempt < 5; attempt++) {
			const current = await backend().get(collection, id);
			if (await backend().put(collection, id, value, current?.version)) return;
		}
		throw new Error(`Couldn't save ${collection}/${id}: it keeps changing.`);
	},
	/**
	 * Applies `change` to the latest saved copy and saves it. If someone else saved in between, it starts over from
	 * their version, so `change` may run more than once: keep it free of side effects and awaiting.
	 * `create` makes the document when it doesn't exist yet; without it a missing document returns undefined.
	 */
	async update<T>(
		collection: Collection,
		id: string,
		change: (doc: T) => void,
		create?: () => T
	): Promise<T | undefined> {
		for (let attempt = 0; attempt < 5; attempt++) {
			const current = await backend().get(collection, id);
			if (!current && !create) return undefined;
			const doc = current ? (structuredClone(current.value) as T) : create!();
			change(doc);
			if (await backend().put(collection, id, doc, current?.version)) return doc;
		}
		throw new Error(`Couldn't save ${collection}/${id}: it keeps changing.`);
	},
	async delete(collection: Collection, id: string): Promise<void> {
		await backend().delete(collection, id);
	}
};
