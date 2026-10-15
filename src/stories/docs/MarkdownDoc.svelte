<script lang="ts">
	import { marked } from 'marked';
	import mermaid from 'mermaid';

	/** A Markdown document from the repo, with ```mermaid blocks drawn as diagrams. */
	let { source }: { source: string } = $props();

	const diagrams: string[] = [];
	const html = $derived.by(() => {
		diagrams.length = 0;
		const renderer = new marked.Renderer();
		const code = renderer.code.bind(renderer);
		renderer.code = (token) => {
			if (token.lang !== 'mermaid') return code(token);
			diagrams.push(token.text);
			return `<div class="diagram" data-diagram="${diagrams.length - 1}"></div>`;
		};
		return marked.parse(source, { renderer, async: false }) as string;
	});

	let root = $state<HTMLElement>();
	let dark = $state(false);

	// Follow the Storybook theme switch (a class on <html>).
	$effect(() => {
		const update = () => (dark = document.documentElement.classList.contains('dark'));
		update();
		const observer = new MutationObserver(update);
		observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
		return () => observer.disconnect();
	});

	$effect(() => {
		void html;
		const theme = dark ? 'dark' : 'neutral';
		// Natural size (scrolling sideways when wide) rather than shrunk to fit, so labels stay readable.
		mermaid.initialize({
			startOnLoad: false,
			theme,
			fontFamily: 'Inter, sans-serif',
			flowchart: { useMaxWidth: false },
			sequence: { useMaxWidth: false }
		});
		root?.querySelectorAll<HTMLElement>('[data-diagram]').forEach(async (el, i) => {
			const { svg } = await mermaid.render(
				`diagram-${i}-${theme}`,
				diagrams[Number(el.dataset.diagram)]
			);
			el.innerHTML = svg;
		});
	});
</script>

<!-- Repo docs are our own content, so rendering their HTML is safe. -->
<article
	bind:this={root}
	class="doc mx-auto flex max-w-7xl flex-col gap-4 p-8 text-body text-foreground"
>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html html}
</article>

<style>
	.doc :global(h1) {
		font-size: var(--text-heading);
		font-weight: 500;
	}
	.doc :global(h2),
	.doc :global(h3) {
		font-size: var(--text-title);
		font-weight: 500;
		margin-top: 1rem;
	}
	.doc :global(p),
	.doc :global(li) {
		line-height: 1.6;
	}
	.doc :global(ul) {
		list-style: disc;
		padding-left: 1.5rem;
	}
	/* The design system's weights are 400 and 500 only. */
	.doc :global(strong) {
		font-weight: 500;
	}
	.doc :global(code) {
		font-size: 0.9em;
		color: var(--muted-foreground);
	}
	.doc :global(.diagram) {
		overflow-x: auto;
		border-radius: var(--radius-md);
		background: var(--card);
		padding: 1rem;
	}
	.doc :global(.diagram svg) {
		max-width: none;
		margin: 0 auto;
	}
</style>
