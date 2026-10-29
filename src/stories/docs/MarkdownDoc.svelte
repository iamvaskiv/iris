<script lang="ts">
	import { marked } from 'marked';
	import mermaid from 'mermaid';

	/**
	 * A Markdown document from the repo, with ```mermaid blocks drawn live as diagrams (in the Storybook theme, unless
	 * a diagram sets its own with a `config` header). The same component renders docs in the design system's Storybook.
	 */
	let { source }: { source: string } = $props();

	const diagrams: string[] = [];
	const html = $derived.by(() => {
		diagrams.length = 0;
		const renderer = new marked.Renderer();
		const code = renderer.code.bind(renderer);
		renderer.code = (token) => {
			if (token.lang !== 'mermaid') return code(token);
			diagrams.push(token.text);
			// A diagram that sets its own theme was drawn for a light page; keep it on a light panel in dark mode.
			const ownTheme = /^---[\s\S]*?\btheme:/.test(token.text);
			return `<div class="diagram${ownTheme ? ' own-theme' : ''}" data-diagram="${diagrams.length - 1}"></div>`;
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
			// Flat boxes and lines: no drop shadows or glow (the newer "neo" look adds them).
			look: 'classic',
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
	.doc :global(ul),
	.doc :global(ol) {
		padding-left: 1.5rem;
	}
	.doc :global(ul) {
		list-style: disc;
	}
	.doc :global(ol) {
		list-style: decimal;
	}
	.doc :global(a) {
		text-decoration: underline;
		text-underline-offset: 2px;
	}
	/* The design system's weights are 400 and 500 only. */
	.doc :global(strong) {
		font-weight: 500;
	}
	.doc :global(code) {
		font-size: 0.9em;
		color: var(--muted-foreground);
	}
	.doc :global(pre) {
		overflow-x: auto;
		border-radius: var(--radius-md);
		background: var(--muted);
		padding: 1rem;
		line-height: 1.5;
	}
	.doc :global(pre code) {
		color: var(--foreground);
	}
	.doc :global(table) {
		border-collapse: collapse;
	}
	.doc :global(th),
	.doc :global(td) {
		border-bottom: 1px solid var(--border);
		padding: 0.5rem 1rem 0.5rem 0;
		text-align: left;
		vertical-align: top;
	}
	.doc :global(.diagram) {
		overflow-x: auto;
		border-radius: var(--radius-md);
		background: var(--card);
		padding: 1rem;
	}
	.doc :global(.diagram.own-theme) {
		background: white;
	}
	.doc :global(.diagram svg) {
		max-width: none;
		margin: 0 auto;
	}
</style>
