<script lang="ts">
	import { Table } from '@latitudelabs/design-system';
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
</script>

<CardShell {card}>
	{#if card.body}<p class="text-body text-muted-foreground">{card.body}</p>{/if}
	<Table.Root>
		<Table.Header>
			<Table.Row>
				{#each columns as column, c (c)}
					<Table.Head numeric={numeric[c] && c > 0}>{column}</Table.Head>
				{/each}
			</Table.Row>
		</Table.Header>
		<Table.Body>
			{#each rows as row, r (r)}
				<Table.Row>
					{#each row as cell, c (c)}
						<Table.Cell rowHeader={c === 0} numeric={numeric[c] && c > 0}>{cell}</Table.Cell>
					{/each}
				</Table.Row>
			{/each}
		</Table.Body>
	</Table.Root>
</CardShell>
