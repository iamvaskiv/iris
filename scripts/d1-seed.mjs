// Turns the local data/*.json collections into SQL for the D1 `docs` table, so a deploy starts with your data.
//   node scripts/d1-seed.mjs > .wrangler/seed.sql
//   npx wrangler d1 execute iris --remote --file .wrangler/seed.sql
// Existing documents with the same id are replaced.
import { existsSync, readFileSync } from 'node:fs';

const COLLECTIONS = ['projects', 'assets', 'insights', 'settings'];
// D1 rejects SQL statements over 100 KB; documents are inlined here, so leave some room.
const MAX_STATEMENT = 95_000;

const quote = (s) => `'${s.replaceAll("'", "''")}'`;

for (const collection of COLLECTIONS) {
	const file = `data/${collection}.json`;
	if (!existsSync(file)) continue;
	for (const [id, doc] of Object.entries(JSON.parse(readFileSync(file, 'utf8')))) {
		const sql = `INSERT OR REPLACE INTO docs (collection, id, value, version) VALUES (${quote(collection)}, ${quote(id)}, ${quote(JSON.stringify(doc))}, 1);`;
		if (sql.length > MAX_STATEMENT) {
			console.error(
				`${collection}/${id} is too large for one statement (${sql.length} bytes); not exported.`
			);
			process.exitCode = 1;
			continue;
		}
		console.log(sql);
	}
}
