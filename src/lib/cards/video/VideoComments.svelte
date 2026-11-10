<script lang="ts">
	import { Card, Tile } from '@latitudelabs/design-system';
	import { askable } from '#lib/ask-lumi.js';
	import { timecode } from '../format';
	import { TONE_DOT, TONE_TINT, type Tone } from '../viewer';
	import type { InsightComment } from '../types';
	import type { VideoQuestions } from './questions';

	/**
	 * Every comment viewers left on a video, each at its moment (click to play from there), then a study's reactions to
	 * the whole video. On the video card's Viewers tab; each tile lightly tinted by its tone.
	 */
	let {
		comments,
		reactions,
		canPlay,
		ask,
		onplay
	}: {
		comments: (InsightComment & { tone: Tone })[];
		reactions: { text: string; tone: Tone }[];
		canPlay: boolean;
		ask?: VideoQuestions;
		onplay: (time: number) => void;
	} = $props();
</script>

{#if comments.length || reactions.length}
	<Card.Section title="Comments" count={comments.length + reactions.length}>
		{#each comments as c, i (i)}
			<li class="w-56">
				<Tile
					{@attach askable(ask?.comment(c))}
					class={['h-full w-full', TONE_TINT[c.tone]]}
					disabled={!canPlay}
					onclick={() => onplay(c.time)}
				>
					<span class="line-clamp-3 text-caption">“{c.text}”</span>
					<span class="flex items-center gap-1.5 text-caption text-muted-foreground">
						<span class={['size-1.5 shrink-0 rounded-full', TONE_DOT[c.tone]]} aria-hidden="true"
						></span>
						{[timecode(c.time), ...(c.emotions ?? []).slice(0, 2)].join(' · ')}
						<span class="sr-only">({c.tone})</span>
					</span>
				</Tile>
			</li>
		{/each}
		{#each reactions as r, i (i)}
			<li class="w-56">
				<Tile {@attach askable(ask?.comment(r))} class={['h-full w-full', TONE_TINT[r.tone]]}>
					<span class="line-clamp-3 text-caption">“{r.text}”</span>
					<span class="flex items-center gap-1.5 text-caption text-muted-foreground">
						<span class={['size-1.5 shrink-0 rounded-full', TONE_DOT[r.tone]]} aria-hidden="true"
						></span>
						About the whole video
						<span class="sr-only">({r.tone})</span>
					</span>
				</Tile>
			</li>
		{/each}
	</Card.Section>
{/if}
