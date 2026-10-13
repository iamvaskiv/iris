<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { Badge, Button, Card } from '@latitudelabs/design-system';
	import { Plus } from '@latitudelabs/design-system/icons';
	import AiDock from '#lib/components/AiDock.svelte';
	import AppHeader from '#lib/components/AppHeader.svelte';
	import { workspaceChat, type WorkspaceResponse } from '#lib/workspace-chat.svelte.js';
	import { draftProjectUrl, newProject } from '#lib/new-project.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let thinking = $state(false);
	let error = $state('');
	let draft = $state('');

	/** Chat at the projects level: quick answers above the input; the assistant creates/opens projects only when asked. */
	async function send(message: string) {
		draft = '';
		error = '';
		thinking = true;
		try {
			const res: WorkspaceResponse = await fetch('/api/workspace', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ message, history: workspaceChat.history })
			}).then((r) => r.json());
			workspaceChat.history = res.history;
			workspaceChat.reply = res.text;
			error = res.error ?? '';
			if (res.refresh) await invalidateAll();
			if (res.navigate) {
				// Let the user read where they're being taken before moving.
				const { projectId, name, message: question } = res.navigate;
				const url = projectId
					? `/projects/${projectId}${question ? `?q=${encodeURIComponent(question)}` : ''}`
					: draftProjectUrl({ name, question });
				setTimeout(() => goto(url), 1500);
			}
		} catch (e) {
			error = String(e);
		} finally {
			thinking = false;
		}
	}
</script>

<svelte:head><title>Projects · Jinn</title></svelte:head>

<div class="min-h-dvh bg-background">
	<AppHeader />

	<main class="mx-auto mt-12 grid w-full max-w-[970px] grid-cols-1 gap-8 px-4 pb-56 sm:grid-cols-2">
		{#each data.projects as project (project.id)}
			<a
				href="/projects/{project.id}"
				class="rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
			>
				<Card.Root class="relative h-72 overflow-hidden transition-shadow hover:shadow-raised">
					<Card.Header>
						<Card.Title>{project.name}</Card.Title>
						{#if project.summary}<Card.Description>{project.summary}</Card.Description>{/if}
						{#if project.status}
							<Card.Action><Badge variant="secondary">{project.status}</Badge></Card.Action>
						{/if}
					</Card.Header>
					{#each project.thumbnails as src, i (src)}
						<img
							{src}
							alt=""
							class={[
								'absolute -bottom-10 aspect-video w-48 rounded-md object-cover shadow-raised',
								project.thumbnails.length === 1 && 'left-1/2 -translate-x-1/2 rotate-3',
								project.thumbnails.length === 2 &&
									(i === 0 ? 'left-1/4 -rotate-6' : 'left-1/2 rotate-3')
							]}
						/>
					{/each}
				</Card.Root>
			</a>
		{/each}

		<button
			class="flex h-72 cursor-pointer items-center justify-center gap-2 rounded-xl bg-card text-title text-muted-foreground shadow-hairline transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
			onclick={() => newProject()}
		>
			<Plus class="size-4" />New
		</button>
	</main>

	<AiDock reply={workspaceChat.reply} {thinking} {error} bind:draft onsubmit={send} />
</div>
