<script lang="ts">
	import { Badge, SentimentBar, Table, type Sentiment } from '@latitudelabs/design-system';
	import { askable, quoted } from '#lib/ask-lumi.js';
	import CardShell from './CardShell.svelte';
	import { timecode } from './format';
	import type { Card, ComparedVideo, ComparisonData, InsightComment, Insights } from './types';

	let { card }: { card: Card } = $props();
	const data = $derived(card.data as ComparisonData | undefined);
	const videos = $derived(data?.videos ?? []);
	const focus = $derived(data?.focus ?? 'all');

	/**
	 * How a cell compares with the same row of the baseline video: `of` is the number to subtract, `format` shows the
	 * difference, `neutral` rows (length, scenes) aren't better or worse when higher, and `scale` (a rating's maximum)
	 * must match for the two to be comparable.
	 */
	type Diff = { of: number; format: (d: number) => string; neutral?: boolean; scale?: number };
	/** `value` ranks numeric cells: the highest one in a row is emphasised. `comment` is a quoted comment's own. */
	type Cell =
		| { text: string; value?: number; diff?: Diff; sentiment?: Sentiment; comment?: InsightComment }
		| undefined;
	/** `kind` is what the row holds, for its questions to Lumi (see `question` below). */
	type Kind = 'number' | 'names' | 'sentiment' | 'liked' | 'disliked' | 'question' | 'custom';
	type Row = { label: string; cells: Cell[]; empty: (v: ComparedVideo) => string; kind: Kind };

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

	// Differences against the baseline, in each row's own units.
	const signed = (d: number, abs: string) => (d > 0 ? '+' : d < 0 ? '−' : '±') + abs;
	const countDiff = (d: number) => signed(d, number(Math.abs(d)));
	const pointsDiff = (d: number) => signed(d, `${Math.round(Math.abs(d) * 100)} pts`);
	const decimalDiff = (d: number) => signed(d, String(Math.round(Math.abs(d) * 10) / 10));
	const durationDiff = (d: number) => signed(d, timecode(Math.abs(d)));

	/** A row is only shown when at least one video has a value for it. */
	function row(
		label: string,
		cell: (v: ComparedVideo) => Cell,
		empty: Row['empty'],
		kind: Kind = 'number'
	): Row[] {
		const cells = videos.map(cell);
		return cells.some((c) => c !== undefined) ? [{ label, cells, empty, kind }] : [];
	}
	const audience = (
		label: string,
		cell: (a: Insights, v: ComparedVideo) => Cell,
		kind: Kind = 'number'
	) => row(label, (v) => v.audience && cell(v.audience, v), noAudience, kind);

	/** Questions asked in more than one of the videos, by their wording. */
	const sharedQuestions = $derived.by(() => {
		const asked = new Map<string, number>();
		for (const v of videos)
			for (const q of v.audience?.questions ?? [])
				asked.set(q.question, (asked.get(q.question) ?? 0) + 1);
		return [...asked].filter(([, n]) => n > 1).map(([question]) => question);
	});

	const quote = (c: InsightComment | undefined): Cell =>
		c && { text: `“${c.text}” ${timecode(c.time)}`, comment: c };

	const contentRows = $derived([
		...row(
			'Length',
			(v) =>
				v.duration
					? {
							text: timecode(v.duration),
							diff: { of: v.duration, format: durationDiff, neutral: true }
						}
					: undefined,
			notAnalysed
		),
		...row(
			'Scenes',
			(v) =>
				v.scenes !== undefined
					? {
							text: String(v.scenes),
							diff: { of: v.scenes, format: countDiff, neutral: true }
						}
					: undefined,
			notAnalysed
		),
		...row('Characters', (v) => names(v.characters), notAnalysed, 'names'),
		...row('Themes', (v) => names(v.themes), notAnalysed, 'names'),
		...row('Brands', (v) => names(v.brands), notAnalysed, 'names')
	]);

	const audienceRows = $derived([
		...audience('Views', (a) =>
			a.views !== undefined
				? { text: number(a.views), value: a.views, diff: { of: a.views, format: countDiff } }
				: undefined
		),
		...audience('Responses', (a) => ({
			text: number(a.responses),
			value: a.responses,
			diff: { of: a.responses, format: countDiff }
		})),
		...audience('Response rate', (a) =>
			a.views
				? {
						text: percent(a.responses / a.views),
						value: a.responses / a.views,
						diff: { of: a.responses / a.views, format: pointsDiff }
					}
				: undefined
		),
		...audience(
			'Rating',
			(a) =>
				a.rating && {
					text: `${a.rating.average} / ${a.rating.max} (${a.rating.count})`,
					value: a.rating.average / a.rating.max,
					diff: { of: a.rating.average, format: decimalDiff, scale: a.rating.max }
				}
		),
		...audience(
			'Sentiment',
			(a) =>
				a.sentiment && total(a.sentiment)
					? {
							text: `${a.sentiment.positive} · ${a.sentiment.neutral} · ${a.sentiment.negative}`,
							sentiment: a.sentiment
						}
					: undefined,
			'sentiment'
		),
		...audience('Positive comments', (a) =>
			a.sentiment && total(a.sentiment)
				? {
						text: percent(a.sentiment.positive / total(a.sentiment)),
						value: a.sentiment.positive / total(a.sentiment),
						diff: { of: a.sentiment.positive / total(a.sentiment), format: pointsDiff }
					}
				: undefined
		),
		...sharedQuestions.flatMap((question) =>
			audience(
				question,
				(a) => {
					const q = a.questions.find((x) => x.question === question);
					if (!q) return undefined;
					if (q.average !== undefined && q.max)
						return {
							text: `${q.average} / ${q.max} (${q.responses})`,
							value: q.average / q.max,
							diff: { of: q.average, format: decimalDiff, scale: q.max }
						};
					const top = q.options?.[0];
					const all = q.options?.reduce((sum, o) => sum + o.count, 0) ?? 0;
					return top && { text: `${top.label} ${percent(top.count / all)} (${q.responses})` };
				},
				'question'
			)
		),
		...audience('Most liked', (a) => quote(a.liked[0]), 'liked'),
		...audience('Top criticism', (a) => quote(a.disliked[0]), 'disliked')
	]);

	// The assistant's own rows: [label, one value per video].
	const customRows = $derived(
		(card.rows ?? []).map(([label, ...cells]) => ({
			label: String(label),
			cells: cells.map((c) => ({ text: String(c) })),
			empty: () => '—',
			kind: 'custom' as const
		}))
	);

	const rows: Row[] = $derived([
		...(focus !== 'audience' ? contentRows : []),
		...(focus !== 'content' ? audienceRows : []),
		...customRows
	]);

	/** The video the others are compared against (by column); click a video to choose it, again to clear it. */
	let chosen = $state<string>();
	const baseline = $derived(videos.findIndex((v) => v.videoId === chosen));

	/** A cell's difference from the baseline in the same row, when both have a comparable number. */
	function difference(r: Row, i: number) {
		const own = r.cells[i]?.diff;
		const base = baseline >= 0 && i !== baseline ? r.cells[baseline]?.diff : undefined;
		if (!own || !base || own.scale !== base.scale) return undefined;
		const d = own.of - base.of;
		const tone =
			own.neutral || Math.abs(d) < 1e-9
				? 'text-muted-foreground'
				: d > 0
					? 'text-success'
					: 'text-destructive';
		return { text: own.format(d), tone };
	}

	/** Index of the cell to emphasise: the single highest value, when at least two videos have one. */
	function leader(cells: Cell[]) {
		const values = cells.map((c) => c?.value);
		const known = values.filter((v) => v !== undefined);
		if (known.length < 2) return -1;
		const best = Math.max(...known);
		return known.filter((v) => v === best).length === 1 ? values.indexOf(best) : -1;
	}

	// Questions for Lumi (see ask-lumi.ts), worded from the table: each names the videos it's about.
	const listed = (items: string[]) =>
		items.length < 2 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;
	const allVideos = $derived(listed(videos.map((v) => quoted(v.name))));

	/** A video's column: how it compares with the others. */
	function videoQuestion(i: number) {
		const others = videos.filter((_, j) => j !== i).map((v) => quoted(v.name));
		return others.length
			? `How does ${quoted(videos[i].name)} compare with ${listed(others)}, and what stands out?`
			: `What stands out about ${quoted(videos[i].name)}?`;
	}

	/** A row's label: how the videos compare on it. */
	function rowQuestion(r: Row) {
		if (videos.length < 2) return null;
		switch (r.kind) {
			case 'question':
				return `How did viewers of ${allVideos} answer ${quoted(r.label)}, and why do they differ?`;
			case 'liked':
				return `What did viewers like most about ${allVideos}?`;
			case 'disliked':
				return `What did viewers criticise most in ${allVideos}?`;
			case 'sentiment':
				return `How do viewers feel about ${allVideos}, and why do they differ?`;
			default:
				return `How do ${allVideos} compare on ${r.label.toLowerCase()}, and why?`;
		}
	}

	/** A cell: why this video's value is what it is, against the others in its row (or the baseline). */
	function cellQuestion(r: Row, i: number) {
		const cell = r.cells[i];
		if (!cell) return null;
		const video = quoted(videos[i].name);
		const others = videos
			.map((v, j) => ({ v, cell: r.cells[j], j }))
			.filter((o) => o.j !== i && o.cell) as { v: ComparedVideo; cell: NonNullable<Cell> }[];
		const against = others.length
			? `, against ${listed(others.map((o) => `${o.cell.text} for ${quoted(o.v.name)}`))}`
			: '';
		switch (r.kind) {
			case 'liked':
			case 'disliked': {
				const c = cell.comment;
				if (!c) return null;
				return r.kind === 'liked'
					? `The most positive comment on ${video} is ${quoted(c.text)} (at ${timecode(c.time)}). What were viewers reacting to?`
					: `The top criticism of ${video} is ${quoted(c.text)} (at ${timecode(c.time)}). What put viewers off, and do others agree?`;
			}
			case 'names':
				return others.length
					? `How do the ${r.label.toLowerCase()} in ${video} (${cell.text}) differ from those in ${listed(others.map((o) => quoted(o.v.name)))}?`
					: `What part do ${cell.text} play in ${video}?`;
			case 'sentiment': {
				const s = cell.sentiment!;
				return `Comments on ${video} are ${s.positive} positive, ${s.neutral} neutral and ${s.negative} negative. What did viewers like and dislike${
					others.length ? `, compared with ${listed(others.map((o) => quoted(o.v.name)))}` : ''
				}?`;
			}
			case 'question':
				return `Viewers of ${video} answered ${quoted(r.label)} with ${cell.text}${against}. Why?`;
		}
		const diff = difference(r, i);
		const label = r.kind === 'custom' ? r.label : r.label.toLowerCase();
		if (diff)
			return `The ${label} of ${video} is ${cell.text}, ${diff.text} against ${quoted(videos[baseline].name)}. Why?`;
		if (!others.length) return `Why is the ${label} of ${video} ${cell.text}?`;
		const best = leader(r.cells);
		const values = r.cells.map((c) => c?.value).filter((v) => v !== undefined);
		const why =
			cell.value === undefined
				? 'What makes the difference?'
				: i === best
					? others.length > 1
						? 'Why is it the highest?'
						: 'Why is it higher?'
					: cell.value === Math.min(...values) && values.length > 1
						? others.length > 1
							? 'Why is it the lowest?'
							: 'Why is it lower?'
						: 'What makes the difference?';
		return `The ${label} of ${video} is ${cell.text}${against}. ${why}`;
	}
</script>

<CardShell {card}>
	{#if card.body}<p class="text-body text-muted-foreground">{card.body}</p>{/if}
	<p class="text-caption text-muted-foreground">
		{#if baseline >= 0}
			Differences are against {videos[baseline].name}. Select it again to clear.
		{:else}
			Select a video to compare the others against it.
		{/if}
	</p>
	<!-- Fixed layout: equal video columns; below 12rem each, the table scrolls sideways instead. -->
	<Table.Root class="table-fixed" style="min-width: {9 + 12 * videos.length}rem">
		<Table.Header>
			<Table.Row>
				<Table.Head class="w-36"><span class="sr-only">Video</span></Table.Head>
				{#each videos as v, i (v.videoId)}
					<Table.Head class="align-top">
						<button
							type="button"
							{@attach askable(videoQuestion(i))}
							aria-pressed={i === baseline}
							aria-label="Compare the others against {v.name}"
							onclick={() => (chosen = i === baseline ? undefined : v.videoId)}
							class="group my-2 flex w-full cursor-pointer flex-col gap-2 rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
						>
							{#if v.poster}
								<img
									src={v.poster}
									alt=""
									class={[
										'aspect-video w-full rounded-sm bg-muted object-cover transition-opacity group-hover:opacity-80',
										i === baseline && 'ring-2 ring-primary ring-offset-2 ring-offset-card'
									]}
								/>
							{:else}
								<div class="aspect-video w-full rounded-sm bg-muted"></div>
							{/if}
							<span class="line-clamp-2 text-caption text-foreground">{v.name}</span>
							{#if i === baseline}<Badge variant="secondary" class="w-fit">Baseline</Badge>{/if}
						</button>
					</Table.Head>
				{/each}
			</Table.Row>
		</Table.Header>
		<Table.Body>
			{#each rows as r (r.label)}
				{@const best = leader(r.cells)}
				<Table.Row>
					<Table.Cell rowHeader {@attach askable(rowQuestion(r))}>{r.label}</Table.Cell>
					{#each videos as v, i (v.videoId)}
						{@const cell = r.cells[i]}
						<Table.Cell class="align-top" {@attach askable(cellQuestion(r, i))}>
							{#if !cell}
								<span class="text-muted-foreground">{r.empty(v)}</span>
							{:else if cell.sentiment}
								<SentimentBar {...cell.sentiment} />
							{:else}
								{@const diff = difference(r, i)}
								<span class={i === best ? 'font-medium' : undefined}>{cell.text}</span>
								{#if diff}
									<span class="ml-1 text-caption whitespace-nowrap {diff.tone}">{diff.text}</span>
								{/if}
							{/if}
						</Table.Cell>
					{/each}
				</Table.Row>
			{/each}
		</Table.Body>
	</Table.Root>
</CardShell>
