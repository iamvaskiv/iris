<script lang="ts">
	import { Button, Input, Label, Select, Switch } from '@latitudelabs/design-system';
	import { Plus, Trash } from '@latitudelabs/design-system/icons';
	import VideoPicker, { type VideoAsset } from './VideoPicker.svelte';
	import { QUESTION_TYPES, timecode, typeLabel } from './question-types';
	import type { Question } from '../types';

	/**
	 * The selected step's settings, in the sidebar beside the preview: its type (a channel's videos stay videos), the
	 * video (and adding a question at the preview's playhead), a channel's vertical sliding, when a question pops up
	 * in its video, and deleting it. Changes go through the callbacks; the card saves them.
	 */
	let {
		id,
		question,
		parent,
		inVideo,
		videos,
		videoTime,
		onsettype,
		onsetvideo,
		onaddquestion,
		onsetvertical,
		onsettime,
		onremove
	}: {
		/** Prefix for the fields' ids (the card's id). */
		id: string;
		question: Question;
		/** The step it's inside: a channel (for its videos) or a video (for questions popping up in it). */
		parent?: Question;
		inVideo: boolean;
		videos: VideoAsset[] | null;
		/** Where the preview's video is playing, in seconds. */
		videoTime: number;
		onsettype: (type: Question['type']) => void;
		onsetvideo: (videoId: string) => void;
		onaddquestion: (time: number) => void;
		onsetvertical: (on: boolean) => void;
		onsettime: (text: string) => void;
		onremove: () => void;
	} = $props();

	// The type picked shows only once it's been changed (changing it can ask first, and be cancelled).
	let type = $derived<string>(question.type);
</script>

<p class="absolute top-4 left-4 text-caption text-muted-foreground">Settings</p>
{#if parent?.type !== 'channel'}
	<div class="flex flex-col gap-2">
		<Label for="study-type-{id}">Type</Label>
		<Select.Root
			type="single"
			bind:value={type}
			onValueChange={(picked) => {
				onsettype(picked as Question['type']);
				type = question.type;
			}}
		>
			<Select.Trigger id="study-type-{id}" class="w-full">
				{typeLabel(question.type)}
			</Select.Trigger>
			<Select.Content align="end">
				<!-- Questions inside a video can't be videos or channels themselves. -->
				{#each QUESTION_TYPES.filter((t) => !inVideo || (t.value !== 'video' && t.value !== 'channel')) as t (t.value)}
					<Select.Item value={t.value} label={t.label} />
				{/each}
			</Select.Content>
		</Select.Root>
	</div>
{/if}
{#if question.type === 'video'}
	<div class="flex flex-col gap-2">
		<Label for="study-video-{id}">Video</Label>
		<VideoPicker
			{videos}
			id="study-video-{id}"
			value={question.videoId ?? ''}
			class="w-full min-w-0"
			onpick={onsetvideo}
		>
			<span class="truncate">{question.videoName ?? 'Choose a video'}</span>
		</VideoPicker>
	</div>
	<!-- At the preview's playhead: play or scrub to the moment, then add. -->
	<Button
		variant="outline"
		class="self-start"
		disabled={!question.videoId}
		onclick={() => onaddquestion(Math.floor(videoTime))}
	>
		<Plus data-icon="inline-start" />Add question at {timecode(videoTime)}
	</Button>
{/if}
{#if question.type === 'channel'}
	<div class="flex items-center justify-between gap-4">
		<Label for="study-vertical-{id}">Vertical sliding</Label>
		<Switch
			id="study-vertical-{id}"
			checked={!!question.vertical}
			onCheckedChange={onsetvertical}
		/>
	</div>
{/if}
{#if inVideo}
	<!-- When it pops up in the video: type a new time to move it. -->
	<div class="flex flex-col gap-2">
		<Label for="study-time-{id}">Pops up in the video at</Label>
		{#key question.id}
			<Input
				id="study-time-{id}"
				value={timecode(question.time ?? 0)}
				onchange={(e: Event & { currentTarget: HTMLInputElement }) =>
					onsettime(e.currentTarget.value)}
				placeholder="m:ss"
			/>
		{/key}
	</div>
{/if}
<Button variant="outline" class="self-start text-destructive" onclick={onremove}>
	<Trash data-icon="inline-start" />{parent?.type === 'channel'
		? 'Remove from channel'
		: question.type === 'channel'
			? 'Delete channel'
			: 'Delete question'}
</Button>
