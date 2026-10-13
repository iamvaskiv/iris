<script lang="ts">
	import { goto } from '$app/navigation';
	import { Badge, Button, Card } from '@latitudelabs/design-system';
	import { Plus } from '@latitudelabs/design-system/icons';
	import AiDock from '#lib/components/AiDock.svelte';
	import AppHeader from '#lib/components/AppHeader.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let creating = $state(false);

	const hour = new Date().getHours();
	const greeting = hour < 12 ? 'Good morning!' : hour < 18 ? 'Good afternoon!' : 'Good evening!';

	/** Starts a project; an optional first question is asked as soon as it opens. */
	async function newProject(question?: string) {
		creating = true;
		const { id } = await fetch('/api/projects', { method: 'POST' }).then((r) => r.json());
		await goto(question ? `/projects/${id}?q=${encodeURIComponent(question)}` : `/projects/${id}`);
	}
</script>

<svelte:head><title>Projects · Jinn</title></svelte:head>

<div class="min-h-dvh bg-background">
	<AppHeader crumbs={[{ label: 'Lumiere' }, { label: 'Projects' }]} nav={[{ label: 'New', onclick: () => newProject() }]} />

	<main class="mx-auto mt-12 grid w-full max-w-[970px] grid-cols-1 gap-8 px-4 pb-56 sm:grid-cols-2">
		{#each data.projects as project (project.id)}
			<a href="/projects/{project.id}" class="rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
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
								project.thumbnails.length === 2 && (i === 0 ? 'left-1/4 -rotate-6' : 'left-1/2 rotate-3')
							]}
						/>
					{/each}
				</Card.Root>
			</a>
		{/each}

		<button
			class="flex h-72 cursor-pointer items-center justify-center gap-2 rounded-xl bg-card text-title text-muted-foreground shadow-hairline transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
			disabled={creating}
			onclick={() => newProject()}
		>
			<Plus class="size-4" />New
		</button>
	</main>

	<AiDock reply={greeting} thinking={creating} onsubmit={newProject} />
</div>
