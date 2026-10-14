<script lang="ts">
	import { Table } from '@latitudelabs/design-system';
	import CardShell from './CardShell.svelte';
	import { timecode } from './format';
	import type { Card, ComparedVideo, ComparisonData, Insights } from './types';

	let { card }: { card: Card } = $props();
	const data = $derived(card.data as ComparisonData | undefined);
	const videos = $derived(data?.videos ?? []);
	const focus = $derived(data?.focus ?? 'all');

	type Sentiment = NonNullable<Insights['sentiment']>;
	/** `value` ranks numeric cells: the highest one in a row is emphasised. */
	type Cell = { text: string; value?: number; sentiment?: Sentiment } | undefined;
	type Row = { label: string; cells: Cell[]; empty: (v: ComparedVideo) => string };

	const notAnalysed = (v: ComparedVideo) => (v.analysed ? '—' : 'Not analysed');
	const noAudience = (v: ComparedVideo) => (v.audience ? '—' : 'No viewers yet');

	const names = (list: string[] | undefined, max = 3): Cell =>
		list && {
			text: list.length
				? list.slice(0, max).join(', ') + (list.length > max ? ` +${list.length - max}` : '')
				: 'None'
		};
	const percent = (n: number) => `${Math.round(n * 100)}%`;
	const number = (n: number) => n.toLocaleString('en-US');
	const total = (s: Sentiment) => s.positive + s.neutral + s.negative;

	/** A row is only shown when at least one video has a value for it. */
	function row(label: string, cell: (v: ComparedVideo) => Cell, empty: Row['empty']): Row[] {
		const cells = videos.map(cell);
		return cells.some((c) => c !== undefined) ? [{ label, cells, empty }] : [];
	}
	const audience = (label: string, cell: (a: Insights, v: ComparedVideo) => Cell) =>
		row(label, (v) => v.audience && cell(v.audience, v), noAudience);

	/** Questions asked in more than one of the videos, by their wording. */
	const sharedQuestions = $derived.by(() => {
		const asked = new Map<string, number>();
		for (const v of videos)
			for (const q of v.audience?.questions ?? [])
				asked.set(q.question, (asked.get(q.question) ?? 0) + 1);
		return [...asked].filter(([, n]) => n > 1).map(([question]) => question);
	});

	const quote = (c: { text: string; time: number } | undefined): Cell =>
		c && { text: `“${c.text}” ${timecode(c.time)}` };

	const contentRows = $derived([
		...row('Length', (v) => (v.duration ? { text: timecode(v.duration) } : undefined), notAnalysed),
		...row(
			'Scenes',
			(v) => (v.scenes !== undefined ? { text: String(v.scenes) } : undefined),
			notAnalysed
		),
		...row('Characters', (v) => names(v.characters), notAnalysed),
		...row('Themes', (v) => names(v.themes), notAnalysed),
		...row('Brands', (v) => names(v.brands), notAnalysed)
	]);

	const audienceRows = $derived([
		...audience('Views', (a) =>
			a.views !== undefined ? { text: number(a.views), value: a.views } : undefined
		),
		...audience('Responses', (a) => ({ text: number(a.responses), value: a.responses })),
		...audience('Response rate', (a) =>
			a.views ? { text: percent(a.responses / a.views), value: a.responses / a.views } : undefined
		),
		...audience(
			'Rating',
			(a) =>
				a.rating && {
					text: `${a.rating.average} / ${a.rating.max} (${a.rating.count})`,
					value: a.rating.average / a.rating.max
				}
		),
		...audience('Sentiment', (a) =>
			a.sentiment && total(a.sentiment)
				? {
						text: `${a.sentiment.positive} · ${a.sentiment.neutral} · ${a.sentiment.negative}`,
						sentiment: a.sentiment
					}
				: undefined
		),
		...audience('Positive comments', (a) =>
			a.sentiment && total(a.sentiment)
				? {
						text: percent(a.sentiment.positive / total(a.sentiment)),
						value: a.sentiment.positive / total(a.sentiment)
					}
				: undefined
		),
		...sharedQuestions.flatMap((question) =>
			audience(question, (a) => {
				const q = a.questions.find((x) => x.question === question);
				if (!q) return undefined;
				if (q.average !== undefined && q.max)
					return { text: `${q.average} / ${q.max} (${q.responses})`, value: q.average / q.max };
				const top = q.options?.[0];
				const all = q.options?.reduce((sum, o) => sum + o.count, 0) ?? 0;
				return top && { text: `${top.label} ${percent(top.count / all)} (${q.responses})` };
			})
		),
		...audience('Most liked', (a) => quote(a.liked[0])),
		...audience('Top criticism', (a) => quote(a.disliked[0]))
	]);

	// The assistant's own rows: [label, one value per video].
	const customRows = $derived(
		(card.rows ?? []).map(([label, ...cells]) => ({
			label: String(label),
			cells: cells.map((c) => ({ text: String(c) })),
			empty: () => '—'
		}))
	);

	const rows: Row[] = $derived([
		...(focus !== 'audience' ? contentRows : []),
		...(focus !== 'content' ? audienceRows : []),
		...customRows
	]);

	/** Index of the cell to emphasise: the single highest value, when at least two videos have one. */
	function leader(cells: Cell[]) {
		const values = cells.map((c) => c?.value);
		const known = values.filter((v) => v !== undefined);
		if (known.length < 2) return -1;
		const best = Math.max(...known);
		return known.filter((v) => v === best).length === 1 ? values.indexOf(best) : -1;
	}
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
				{@const best = leader(r.cells)}
				<Table.Row>
					<Table.Cell rowHeader>{r.label}</Table.Cell>
					{#each videos as v, i (v.videoId)}
						{@const cell = r.cells[i]}
						<Table.Cell class="align-top">
							{#if !cell}
								<span class="text-muted-foreground">{r.empty(v)}</span>
							{:else if cell.sentiment}
								<div class="flex flex-col gap-1">
									<div class="flex h-2 gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
										<div class="bg-success" style:flex-grow={cell.sentiment.positive}></div>
										<div class="bg-control" style:flex-grow={cell.sentiment.neutral}></div>
										<div class="bg-destructive" style:flex-grow={cell.sentiment.negative}></div>
									</div>
									<span class="text-caption text-muted-foreground">
										{cell.sentiment.positive} positive · {cell.sentiment.neutral} neutral · {cell
											.sentiment.negative} negative
									</span>
								</div>
							{:else}
								<span class={i === best ? 'font-medium' : undefined}>{cell.text}</span>
							{/if}
						</Table.Cell>
					{/each}
				</Table.Row>
			{/each}
		</Table.Body>
	</Table.Root>
</CardShell>
