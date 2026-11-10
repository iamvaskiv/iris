<script lang="ts">
	import { Table } from '@latitudelabs/design-system';
	import { askable, quoted } from '#lib/ask-lumi.js';
	import CardShell from './CardShell.svelte';
	import type { Card } from './types';

	let { card }: { card: Card } = $props();
	const columns = $derived(card.columns ?? []);
	const rows = $derived(card.rows ?? []);
	// A column is numeric when every non-empty cell in it is a number (or a number with a short unit, like "102 s").
	const numeric = $derived(
		columns.map((_, c) =>
			rows.every(
				(r) =>
					r[c] === undefined || r[c] === '' || /^[-+]?[\d.,]+\s*[%a-z]{0,3}$/i.test(String(r[c]))
			)
		)
	);

	/**
	 * What the table can ask Lumi (see ask-lumi.ts): about a row, with its values under their column names, or about a
	 * column. Worded to read right whichever way the table runs (videos as rows or as columns).
	 */
	const table = $derived(quoted(card.title));
	function rowQuestion(row: (string | number)[]) {
		const name = String(row[0] ?? '').trim();
		if (!name) return null;
		const cells = row
			.slice(1)
			.map((cell, c) =>
				cell === '' || cell === undefined
					? ''
					: columns[c + 1]
						? `${cell} for ${quoted(columns[c + 1])}`
						: String(cell)
			)
			.filter(Boolean);
		if (!cells.length) return `Tell me more about ${quoted(name)} in ${table}.`;
		// Values with commas of their own are set apart with semicolons; the last joins with "and".
		const sep = cells.some((c) => c.includes(',')) ? '; ' : ', ';
		const values = row.slice(1).filter((cell) => cell !== '' && cell !== undefined);
		const differ = new Set(values.map(String)).size > 1;
		const joined =
			cells.length > 2
				? `${cells.slice(0, -1).join(sep)}${sep === '; ' ? ';' : ','} and ${cells.at(-1)}`
				: cells.join(' and ');
		return `In ${table}, ${quoted(name)} is ${joined}. What's behind ${differ ? 'the difference' : 'that'}?`;
	}
	const columnQuestion = (c: number) =>
		c > 0 && columns[c] && rows.length > 1
			? `What stands out about ${quoted(columns[c])} in ${table}, and why?`
			: null;
</script>

<CardShell {card}>
	{#if card.body}<p class="text-body text-muted-foreground">{card.body}</p>{/if}
	<Table.Root>
		<Table.Header>
			<Table.Row>
				{#each columns as column, c (c)}
					<Table.Head numeric={numeric[c] && c > 0} {@attach askable(columnQuestion(c))}
						>{column}</Table.Head
					>
				{/each}
			</Table.Row>
		</Table.Header>
		<Table.Body>
			{#each rows as row, r (r)}
				<Table.Row {@attach askable(rowQuestion(row))}>
					{#each row as cell, c (c)}
						<Table.Cell rowHeader={c === 0} numeric={numeric[c] && c > 0}>{cell}</Table.Cell>
					{/each}
				</Table.Row>
			{/each}
		</Table.Body>
	</Table.Root>
</CardShell>
