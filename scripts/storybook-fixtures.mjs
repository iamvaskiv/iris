// Captures real cards for the app Storybook: card data from the running dev server, with every image downloaded into
// src/stories/fixtures/images (Lumiere's signed image links expire after a couple of hours).
//   pnpm dev   (in another terminal)
//   node scripts/storybook-fixtures.mjs [http://localhost:5173]
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { unflatten } from 'devalue';

const BASE = process.argv[2] ?? 'http://localhost:5173';
const OUT = 'src/stories/fixtures';
// Projects whose cards make good examples: a video with full analysis, insights + lists, comparisons, a study, and a
// video with viewer data (Inside Out 2 Trailer 1).
const PROJECTS = ['261e9e50', 'a796d6eb', '19d3003d', 'b701005e', '7e7aec56'];

mkdirSync(`${OUT}/images`, { recursive: true });

async function projectData(id) {
	const res = await fetch(`${BASE}/projects/${id}/__data.json`);
	if (!res.ok) throw new Error(`${id}: ${res.status} (is the dev server running?)`);
	const { nodes } = await res.json();
	const page = nodes.findLast((n) => n?.type === 'data');
	// Not on this machine's dev server (projects live in each machine's data): its cards are kept as they were.
	return page ? unflatten(page.data).project : null;
}

/**
 * What identifies an image, the same on every capture: its path and its settings (Mux keeps the frame's time and
 * width inside the signed token), without the token's dates, which change each time. So the same frame keeps its
 * file, and a capture doesn't leave old copies behind.
 */
function imageKey(url) {
	const { pathname, searchParams } = new URL(url);
	const token = searchParams.get('token');
	let claims = {};
	try {
		claims = JSON.parse(Buffer.from(token?.split('.')[1] ?? '', 'base64url').toString());
	} catch {
		// Not a token we can read: fall back to the path alone.
	}
	for (const changing of ['exp', 'iat', 'nbf']) delete claims[changing];
	const settings = Object.keys(claims)
		.sort()
		.map((k) => `${k}=${JSON.stringify(claims[k])}`);
	return [pathname, ...settings].join('&');
}

/** Downloads a signed image once and returns the path Storybook serves it at. */
const saved = new Map();
async function localImage(url) {
	if (!saved.has(url)) {
		const name = createHash('sha1').update(imageKey(url)).digest('hex').slice(0, 12) + '.jpg';
		const res = await fetch(url);
		if (!res.ok) throw new Error(`Image ${res.status}: ${url.slice(0, 80)}`);
		writeFileSync(`${OUT}/images/${name}`, Buffer.from(await res.arrayBuffer()));
		saved.set(url, `/fixtures/${name}`);
	}
	return saved.get(url);
}

/** Replaces every signed image URL in a value with a local copy; drops video stream URLs. */
async function localise(value) {
	if (Array.isArray(value)) return Promise.all(value.map(localise));
	if (value && typeof value === 'object') {
		const out = {};
		for (const [k, v] of Object.entries(value)) {
			if (k === 'streamUrl') continue;
			out[k] = await localise(v);
		}
		return out;
	}
	if (typeof value === 'string' && value.startsWith('https://image.mux.com/'))
		return localImage(value);
	return value;
}

// Starts from the cards captured before, so a project missing here keeps its fixtures.
const file = `${OUT}/cards.json`;
const cards = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
for (const id of PROJECTS) {
	const project = await projectData(id);
	if (!project) {
		console.warn(`${id}: not found here, keeping its cards as they were`);
		continue;
	}
	for (const key of Object.keys(cards)) if (key.startsWith(`${project.name} · `)) delete cards[key];
	for (const card of project.cards) cards[`${project.name} · ${card.title}`] = await localise(card);
}
writeFileSync(file, JSON.stringify(cards, null, '\t') + '\n');
console.log(`${Object.keys(cards).length} cards, ${saved.size} images → ${OUT}`);
