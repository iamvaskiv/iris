<script lang="ts">
	import CardShell from './CardShell.svelte';
	import type { Card } from './types';

	let { card }: { card: Card } = $props();
	const columns = $derived(card.columns ?? []);
	const rows = $derived(card.rows ?? []);
	// A column is numeric when every non-empty cell in it is a number (or a number with a short unit, like "102 s").
	const numeric = $derived(
		columns.map((_, c) =>
			rows.every((r) => r[c] === undefined || r[c] === '' || /^[-+]?[\d.,]+\s*[%a-z]{0,3}$/i.test(String(r[c])))
		)
	);
</script>

<CardShell {card}>
	{#if card.body}<p class="text-body text-muted-foreground">{card.body}</p>{/if}
	<div class="overflow-x-auto">
		<table class="w-full text-body">
			<thead>
				<tr class="border-b border-border">
					{#each columns as column, c (c)}
						<th
							scope="col"
							class={['py-2 pr-4 text-caption font-medium text-muted-foreground last:pr-0', numeric[c] && c > 0 ? 'text-right' : 'text-left']}
						>
							{column}
						</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each rows as row, r (r)}
					<tr class="border-b border-border last:border-0">
						{#each row as cell, c (c)}
							{#if c === 0}
								<th scope="row" class="py-2 pr-4 text-left font-medium">{cell}</th>
							{:else}
								<td class={['py-2 pr-4 last:pr-0', numeric[c] && 'text-right tabular-nums']}>{cell}</td>
							{/if}
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</CardShell>
