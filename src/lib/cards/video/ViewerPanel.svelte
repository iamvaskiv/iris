<script lang="ts">
	import { Label, Select, SentimentCounts, Stat } from '@latitudelabs/design-system';
	import type { ViewerSource } from '../viewer-sources';

	/**
	 * What viewers made of a video, under its summary: with more than one source, a Source picker (Lumiere's real
	 * viewers, or a study's sample results); then that source's key numbers, as the insights card counts them or as the
	 * study's sample results do.
	 */
	let {
		id,
		sources,
		source,
		onpick
	}: {
		/** Prefix for the picker's id (the card's id). */
		id: string;
		sources: ViewerSource[];
		source: ViewerSource | undefined;
		onpick: (sourceId: string) => void;
	} = $props();

	const viewers = $derived(source?.viewers);
	const fromStudy = $derived(source?.kind === 'study');
</script>

{#if sources.length > 1}
	<div class="mt-3 flex items-center gap-2">
		<Label for="source-{id}" class="text-caption text-muted-foreground">Source</Label>
		<Select.Root type="single" value={source?.id} onValueChange={onpick}>
			<Select.Trigger id="source-{id}" size="sm">{source?.name}</Select.Trigger>
			<Select.Content>
				{#each sources as s (s.id)}
					<Select.Item
						value={s.id}
						label={s.kind === 'study' ? `${s.name} (sample data)` : s.name}
					/>
				{/each}
			</Select.Content>
		</Select.Root>
	</div>
{/if}
{#if viewers}
	<div class="mt-3 flex flex-wrap gap-5">
		{#if viewers.views}<Stat
				variant="plain"
				value={viewers.views.toLocaleString()}
				label={fromStudy ? 'Views' : 'Views, last 12 months'}
			/>{/if}
		<Stat
			variant="plain"
			value={viewers.responses.toLocaleString()}
			label={fromStudy ? 'Watched' : 'Responses'}
		/>
		{#if viewers.rating}<Stat
				variant="plain"
				value="{viewers.rating.average} / {viewers.rating.max}"
				label="Rating, {viewers.rating.count} {fromStudy && viewers.rating.max === 10
					? 'answers'
					: 'votes'}"
			/>{/if}
		{#if viewers.sentiment}
			<Stat variant="plain" label={fromStudy ? 'Reactions' : 'Comment sentiment'}>
				<SentimentCounts {...viewers.sentiment} />
			</Stat>
		{/if}
	</div>
{/if}
