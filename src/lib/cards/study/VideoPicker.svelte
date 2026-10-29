<script lang="ts" module>
	/** One of the user's videos, as `/api/assets` lists them. */
	export type VideoAsset = { id: string; name: string; thumbnail?: string };
</script>

<script lang="ts">
	import { Select } from '@latitudelabs/design-system';
	import type { Snippet } from 'svelte';
	import type { ClassValue } from 'svelte/elements';

	/**
	 * Picks one of the user's videos from a menu. `value` is the video shown as picked; leave it out for a picker that
	 * adds a video each time (it goes back to nothing picked after each). `videos` is null while they load.
	 */
	let {
		videos,
		value = '',
		id,
		label,
		class: className,
		children,
		onpick
	}: {
		videos: VideoAsset[] | null;
		value?: string;
		id?: string;
		/** For screen readers, when no visible Label points at `id`. */
		label?: string;
		class?: ClassValue;
		/** What the button shows. */
		children: Snippet;
		onpick: (id: string) => void;
	} = $props();

	let current = $derived(value);
</script>

<Select.Root
	type="single"
	bind:value={current}
	onValueChange={(picked) => {
		onpick(picked);
		// Back to what's picked (nothing, for one that adds), so the same video can be picked again.
		current = value;
	}}
>
	<Select.Trigger {id} aria-label={label} class={className}>
		{@render children()}
	</Select.Trigger>
	<Select.Content align="end">
		{#each videos ?? [] as v (v.id)}
			<Select.Item value={v.id} label={v.name} />
		{:else}
			<p class="px-3 py-2 text-caption text-muted-foreground">
				{videos ? 'No videos yet. Drop one on the page to upload it.' : 'Loading…'}
			</p>
		{/each}
	</Select.Content>
</Select.Root>
