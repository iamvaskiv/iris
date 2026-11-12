<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import type { ComponentProps } from 'svelte';
	import { ChartColumn, Users, Video } from '@latitudelabs/design-system/icons';
	import AiDock from '#lib/components/AiDock.svelte';
	import { WELCOME } from '#lib/workspace-chat.svelte.js';

	const { Story } = defineMeta({
		title: 'Lumi/Dock',
		component: AiDock,
		tags: ['autodocs'],
		parameters: {
			layout: 'fullscreen',
			docs: {
				description: {
					component: `Lumi's prompt box with its latest reply. Centred on empty pages (inline above the projects grid),
docked at the bottom once a project has cards. Choices replace the input until one is picked or something else is
typed. Messages sent here are only logged.`
				},
				story: { inline: false, iframeHeight: 420 }
			}
		},
		args: { onsubmit: (message: string) => console.info('[Lumi] send', message) }
	});
</script>

<!-- The dock is fixed to the viewport when docked; this gives it a page-sized area to sit in. -->
{#snippet page(args: ComponentProps<typeof AiDock>)}
	<div class="relative h-[420px]"><AiDock {...args} /></div>
{/snippet}

<Story
	name="Docked, reply"
	args={{
		mode: 'default',
		reply:
			'The clip has two themes, and they are on the new card. Coping with Change shows in the reaction shot.'
	}}
	template={page}
/>

<Story
	name="Docked, thinking"
	args={{ mode: 'default', reply: 'Looking at the characters…', thinking: true }}
	template={page}
/>

<Story
	name="Docked, choices"
	args={{
		mode: 'default',
		reply:
			'You have two Inside Out 2 videos: the 14-second clip and the full trailer. Which one should I compare?',
		choices: ['Use the 14s clip', 'Use the full trailer']
	}}
	template={page}
/>

<Story
	name="Docked, formatted reply"
	args={{
		mode: 'default',
		reply:
			'Only the first Inside Out 2 upload has real audience data: **1,470 views**.\n\n- The second upload: 3 responses, 0 views\n- A Man Called Otto: 2 responses, no rating\n- The 14-second clip: no audience data'
	}}
	template={page}
/>

<Story
	name="Docked, error"
	args={{ mode: 'default', error: "Couldn't start the upload (500)." }}
	template={page}
/>

<Story
	name="Compact"
	args={{
		mode: 'compact',
		reply:
			'The clip has two themes, and they are on the new card. Coping with Change shows in the reaction shot.'
	}}
	template={page}
/>

<Story name="Compact, thinking" args={{ mode: 'compact', thinking: true }} template={page} />

<!-- What a reply looks like when it lands: in a bubble above the dock, pointing at Lumi. -->
<Story
	name="Compact, reply bubble"
	args={{
		mode: 'compact',
		bubble: true,
		reply:
			'The clip has two themes, and they are on the new card. Coping with Change shows in the reaction shot.'
	}}
	template={page}
/>

<Story
	name="Compact, thinking bubble"
	args={{ mode: 'compact', bubble: true, thinking: true }}
	template={page}
/>

<Story
	name="Compact, choices"
	args={{
		mode: 'compact',
		reply: 'Which one should I compare?',
		choices: ['Use the 14s clip', 'Use the full trailer']
	}}
	template={page}
/>

<Story
	name="Centred, inline (projects page)"
	args={{
		centered: true,
		inline: true,
		greeting: 'Good afternoon!',
		suggestions: [
			{ label: 'Analyse and understand video content', icon: Video },
			{ label: 'Get opinion from viewers', icon: Users },
			{ label: 'Compare videos', icon: ChartColumn }
		]
	}}
	template={page}
/>

<Story
	name="Expanded"
	args={{
		mode: 'expanded',
		reply:
			'Coping with Change shows in the reaction shot, and Growing Up runs through the whole clip.',
		messages: [
			{ from: 'user', text: 'What is this clip about?' },
			{
				from: 'assistant',
				text: 'A 14-second **Inside Out 2** clip: Riley meets her new emotions. I put the details on a card.'
			},
			{ from: 'user', text: 'Which themes come through?' },
			{
				from: 'assistant',
				text: 'Two themes:\n\n- Coping with Change\n- Growing Up\n\nBoth are on the new card.'
			},
			{ from: 'user', text: 'Where does each one show?' },
			{
				from: 'assistant',
				text: 'Coping with Change shows in the reaction shot, and Growing Up runs through the whole clip.'
			}
		]
	}}
	template={page}
/>

<Story
	name="Expanded, thinking"
	args={{
		mode: 'expanded',
		thinking: true,
		messages: [
			{ from: 'user', text: 'What is this clip about?' },
			{ from: 'assistant', text: 'A 14-second Inside Out 2 clip: Riley meets her new emotions.' },
			{ from: 'user', text: 'Compare it with the trailer' }
		]
	}}
	template={page}
/>

<!-- What someone new sees first on the projects page (see maybeWelcome). -->
<Story
	name="Centred, welcome"
	args={{ centered: true, inline: true, reply: WELCOME.reply, choices: WELCOME.choices }}
	template={page}
/>
