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

	/** What the table can ask Lumi (see ask-lumi.ts): about a row, from its cells, or how the rows compare on a column. */
	const table = $derived(quoted(card.title));
	function rowQuestion(row: (string | number)[]) {
		const name = String(row[0] ?? '').trim();
		if (!name) return null;
		const cells = row
			.slice(1)
			.map((cell, c) =>
				cell === '' || cell === undefined ? '' : `${columns[c + 1] ?? ''} ${cell}`.trim()
			)
			.filter(Boolean);
		return cells.length && numeric.slice(1).some(Boolean)
			? `In ${table}, ${quoted(name)} has ${cells.join(', ')}. What's behind those numbers?`
			: `Tell me more about ${quoted(name)} in ${table}.`;
	}
	const columnQuestion = (c: number) =>
		c > 0 && columns[c] && rows.length > 1
			? `How do the rows in ${table} compare on ${quoted(columns[c])}, and why?`
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
