#!/usr/bin/env node
// Audits a Latitude product for design-system drift.
//
//   node audit.mjs [dir=src] [--json]
//
// Exits 1 when it finds errors (warnings alone exit 0). No dependencies.

import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const json = args.includes('--json');
const root = path.resolve(args.find((a) => !a.startsWith('--')) ?? 'src');
const SKIP = new Set(['node_modules', '.svelte-kit', 'dist', 'build', '.git', 'storybook-static']);
const EXT = new Set(['.svelte', '.ts', '.js', '.css']);

const TW_PALETTE =
	'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black';
const COLOR_UTIL =
	'bg|text|border|ring|outline|fill|stroke|from|via|to|divide|placeholder|shadow|decoration|accent|caret';

// [id, severity, regex, message, fix]
const RULES = [
	[
		'raw-color-class',
		'error',
		new RegExp(`\\b(?:${COLOR_UTIL})-\\[(?:#|rgb|hsl|oklch|color)`, 'g'),
		'Arbitrary color value in a class',
		'Use a role: bg-card, text-muted-foreground, border-border…'
	],
	[
		'palette-color',
		'error',
		new RegExp(
			`\\b(?:dark:)?(?:${COLOR_UTIL})-(?:${TW_PALETTE})(?:-\\d{2,3})?(?:\\/\\d+)?\\b`,
			'g'
		),
		'Tailwind palette color instead of a design-system role',
		'Use a role: bg-background, bg-primary, text-destructive…'
	],
	[
		'hex-color',
		'error',
		/(?<![\w&])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b(?![\w-]*\s*[:{])/g,
		'Hardcoded hex color',
		'Use a role utility or var(--role) in CSS'
	],
	[
		'rgb-color',
		'error',
		/\b(?:rgb|rgba|hsl|hsla)\(\s*\d/g,
		'Hardcoded rgb/hsl color',
		'Use a role utility or var(--role)'
	],
	[
		'dark-override',
		'warn',
		new RegExp(`\\bdark:(?:${COLOR_UTIL})-`, 'g'),
		'dark: color override',
		'Roles already switch in dark mode; remove the override'
	],
	[
		'bold-weight',
		'error',
		/\bfont-(?:semibold|bold|extrabold|black)\b/g,
		'Font weight above 500',
		'Use font-medium (the system uses 400/500 only)'
	],
	[
		'tw-font-size',
		'warn',
		/\btext-(?:xs|sm|base|lg|xl|[2-9]xl)\b/g,
		'Raw Tailwind font size',
		'Use a text style: text-heading, text-title, text-body-lg, text-body, text-caption, text-body-sm'
	],
	[
		'arbitrary-font-size',
		'error',
		/\btext-\[\d+(?:px|rem)\]/g,
		'Arbitrary font size',
		'Use a text style'
	],
	[
		'arbitrary-radius',
		'warn',
		/\brounded(?:-[trbl]{1,2})?-\[[^\]]+\]/g,
		'Arbitrary radius',
		'Use rounded-sm/md/lg/xl/full'
	],
	[
		'arbitrary-spacing',
		'warn',
		/\b(?:p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|gap|gap-x|gap-y|space-x|space-y)-\[\d+(?:\.\d+)?px\]/g,
		'Off-scale spacing',
		'Use the 4px scale: 1, 2, 3, 4, 5, 8'
	],
	[
		'direct-lucide',
		'warn',
		/from\s+['"](?:@lucide\/svelte|lucide-svelte)(?:\/[^'"]*)?['"]/g,
		'Icon imported straight from Lucide',
		"Import from '@latitudelabs/design-system/icons' (shared curated set)"
	],
	[
		'shadow-default',
		'warn',
		/\bshadow-(?:sm|md|lg|xl|2xl)\b/g,
		'Tailwind shadow instead of system elevation',
		'Use shadow-hairline (cards) or shadow-raised (floating panels)'
	],
	[
		'local-progress',
		'warn',
		/role=["']progressbar["']/g,
		'Hand-built progress bar',
		'Use Progress (value, max, aria-label)'
	],
	[
		'local-table',
		'warn',
		/<table\b/g,
		'Raw <table>',
		'Use Table.Root › Table.Header/Body › Table.Row › Table.Head/Cell'
	],
	[
		'local-radio-group',
		'warn',
		/role=["']radiogroup["']/g,
		'Hand-built radio group',
		'Use SegmentedControl for a few short options that apply immediately'
	],
	[
		'img-no-alt',
		'error',
		/<img\b(?![^>]*\balt=)[^>]*>/g,
		'<img> without alt',
		'Add alt text (alt="" if purely decorative)'
	]
];

const findings = [];
const localUiCopies = [];

function walk(dir) {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		if (SKIP.has(entry.name)) continue;
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			// A local shadcn copy of components the design system already provides.
			if (entry.name === 'ui' && fs.existsSync(path.join(full, 'button'))) localUiCopies.push(full);
			walk(full);
		} else if (EXT.has(path.extname(entry.name))) {
			check(full);
		}
	}
}

function check(file) {
	const text = fs.readFileSync(file, 'utf8');
	const lines = text.split('\n');
	lines.forEach((line, i) => {
		if (/audit-ignore/.test(line)) return;
		for (const [id, severity, re, message, fix] of RULES) {
			// Hex colors are fine inside @font-face/url() and in comments-only lines of CSS custom property definitions.
			if (id === 'hex-color' && (/url\(|<path|d="/.test(line) || /^\s*(\/\/|\*|\/\*)/.test(line)))
				continue;
			for (const m of line.matchAll(re)) {
				findings.push({
					file: path.relative(process.cwd(), file),
					line: i + 1,
					rule: id,
					severity,
					match: m[0],
					message,
					fix
				});
			}
		}
	});
}

if (!fs.existsSync(root)) {
	console.error(`No such directory: ${root}`);
	process.exit(2);
}
walk(root);
for (const dir of localUiCopies) {
	findings.push({
		file: path.relative(process.cwd(), dir),
		line: 0,
		rule: 'local-ui-copy',
		severity: 'warn',
		match: 'ui/button',
		message: 'Local copy of design-system components',
		fix: 'Import from @latitudelabs/design-system instead of copying shadcn components'
	});
}

const errors = findings.filter((f) => f.severity === 'error').length;
if (json) {
	console.log(
		JSON.stringify({ root, errors, warnings: findings.length - errors, findings }, null, 2)
	);
} else if (findings.length === 0) {
	console.log(`✔ No design-system issues in ${path.relative(process.cwd(), root) || '.'}`);
} else {
	const byFile = Map.groupBy
		? Map.groupBy(findings, (f) => f.file)
		: findings.reduce((m, f) => m.set(f.file, [...(m.get(f.file) ?? []), f]), new Map());
	for (const [file, items] of byFile) {
		console.log(`\n${file}`);
		for (const f of items)
			console.log(
				`  ${f.line ? `${f.line}`.padStart(4) : '   -'}  ${f.severity === 'error' ? '✖' : '⚠'} ${f.message}: ${f.match}\n        → ${f.fix}`
			);
	}
	console.log(`\n${errors} error(s), ${findings.length - errors} warning(s)`);
}
process.exit(errors > 0 ? 1 : 0);
