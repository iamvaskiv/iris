<script lang="ts">
	import { along } from '../curve';
	import { timecode } from '../format';

	/** The scenes along a video, a titled block each; with `onseek`, clicking one goes to its start. */
	let {
		segments,
		duration,
		onseek
	}: {
		segments: { title: string; start: number; end: number }[];
		duration: number;
		onseek?: (time: number) => void;
	} = $props();
</script>

<div class="relative h-8 flex-1">
	{#each segments as s, i (i)}
		<svelte:element
			this={onseek ? 'button' : 'div'}
			type={onseek ? 'button' : undefined}
			role={onseek ? undefined : 'presentation'}
			class={[
				'absolute inset-y-0 truncate rounded-sm bg-muted px-2 text-left text-caption leading-8',
				onseek && 'outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring'
			]}
			style:left="calc({along(s.start, duration)}% + 1px)"
			style:width="calc({along(s.end, duration) - along(s.start, duration)}% - 2px)"
			title="{s.title} · {timecode(s.start)}"
			onclick={onseek && (() => onseek(s.start))}>{s.title}</svelte:element
		>
	{/each}
</div>
