<script lang="ts">
	import { Table } from '@latitudelabs/design-system';
	import CardShell from './CardShell.svelte';
	import { timecode } from './format';
	import type { Card, ComparedVideo, ComparisonData } from './types';

	let { card }: { card: Card } = $props();
	const videos = $derived((card.data as ComparisonData | undefined)?.videos ?? []);

	type Row = { label: string; cells: (string | undefined)[] };

	const names = (list: string[] | undefined, max = 3) =>
		list &&
		(list.length
			? list.slice(0, max).join(', ') + (list.length > max ? ` +${list.length - max}` : '')
			: 'None');

	/** A row is only shown when at least one video has a value for it. */
	const row = (label: string, value: (v: ComparedVideo) => string | undefined): Row[] => {
		const cells = videos.map(value);
		return cells.some((c) => c !== undefined) ? [{ label, cells }] : [];
	};

	const rows = $derived([
		...row('Length', (v) => (v.duration ? timecode(v.duration) : undefined)),
		...row('Scenes', (v) => v.scenes?.toString()),
		...row('Characters', (v) => names(v.characters)),
		...row('Themes', (v) => names(v.themes)),
		...row('Brands', (v) => names(v.brands)),
		...row('Views', (v) => v.views?.toLocaleString('en-US')),
		...row('Rating', (v) => v.rating && `${v.rating.average} / ${v.rating.max}`),
		...row('Positive comments', (v) =>
			v.positive !== undefined ? `${Math.round(v.positive * 100)}%` : undefined
		),
		// The assistant's own rows: [label, one value per video].
		...(card.rows ?? []).map(([label, ...cells]) => ({
			label: String(label),
			cells: cells.map(String)
		}))
	]);
</script>

<CardShell {card}>
	{#if card.body}<p class="text-body text-muted-foreground">{card.body}</p>{/if}
	<!-- Fixed layout: equal video columns; below 12rem each, the table scrolls sideways instead. -->
	<Table.Root class="table-fixed" style="min-width: {9 + 12 * videos.length}rem">
		<Table.Header>
			<Table.Row>
				<Table.Head class="w-36"><span class="sr-only">Video</span></Table.Head>
				{#each videos as v (v.videoId)}
					<Table.Head class="align-top">
						<div class="flex flex-col gap-2 py-2">
							{#if v.poster}
								<img
									src={v.poster}
									alt=""
									class="aspect-video w-full rounded-sm bg-muted object-cover"
								/>
							{:else}
								<div class="aspect-video w-full rounded-sm bg-muted"></div>
							{/if}
							<span class="line-clamp-2 text-caption text-foreground">{v.name}</span>
						</div>
					</Table.Head>
				{/each}
			</Table.Row>
		</Table.Header>
		<Table.Body>
			{#each rows as r (r.label)}
				<Table.Row>
					<Table.Cell rowHeader>{r.label}</Table.Cell>
					{#each videos as v, i (v.videoId)}
						<Table.Cell class="align-top">
							{#if r.cells[i] !== undefined}
								{r.cells[i]}
							{:else}
								<span class="text-muted-foreground">{v.analysed ? '—' : 'Not analysed'}</span>
							{/if}
						</Table.Cell>
					{/each}
				</Table.Row>
			{/each}
		</Table.Body>
	</Table.Root>
</CardShell>
