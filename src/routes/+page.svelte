<script lang="ts">
	import { toggleMode } from 'mode-watcher';
	import { Breadcrumb, Button, Card, ChatMessage, PromptInput } from '@latitudelabs/design-system';
	import { Moon, Sun } from '@latitudelabs/design-system/icons';

	let messages = $state<{ from: 'assistant' | 'user'; text: string }[]>([
		{ from: 'assistant', text: 'Your product is set up with the Latitude design system. What are we building?' }
	]);

	let draft = $state('');

	function send(text: string) {
		draft = '';
		messages.push({ from: 'user', text });
		messages.push({ from: 'assistant', text: 'Edit src/routes/+page.svelte to make this page yours.' });
	}
</script>

<div class="min-h-screen px-8 py-8">
	<header class="flex items-center justify-between">
		<Breadcrumb.Root>
			<Breadcrumb.List>
				<Breadcrumb.Item><Breadcrumb.Link href="/">Projects</Breadcrumb.Link></Breadcrumb.Item>
				<Breadcrumb.Separator>/</Breadcrumb.Separator>
				<Breadcrumb.Item><Breadcrumb.Page>Jinn</Breadcrumb.Page></Breadcrumb.Item>
			</Breadcrumb.List>
		</Breadcrumb.Root>
		<Button variant="ghost" size="icon" onclick={toggleMode} aria-label="Toggle theme">
			<Sun class="dark:hidden" />
			<Moon class="hidden dark:block" />
		</Button>
	</header>

	<main class="mx-auto mt-16 flex max-w-[640px] flex-col gap-4">
		<h1 class="text-heading">Welcome to Jinn</h1>
		<Card.Root>
			<Card.Header>
				<Card.Title>Start here</Card.Title>
				<Card.Description>Components, tokens and guidelines live in the design system docs.</Card.Description>
			</Card.Header>
			<Card.Content class="flex flex-col gap-5">
				{#each messages as message, i (i)}
					<ChatMessage from={message.from}>{message.text}</ChatMessage>
				{/each}
				<PromptInput bind:value={draft} placeholder="Describe your product..." onsubmit={send} />
			</Card.Content>
		</Card.Root>
	</main>
</div>
