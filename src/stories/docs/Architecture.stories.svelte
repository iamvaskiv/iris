<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import MarkdownDoc from './MarkdownDoc.svelte';
	// The document itself lives in docs/architecture.md; edit it there.
	import architecture from '../../../docs/architecture.md?raw';

	const { Story } = defineMeta({
		title: 'Docs/Architecture',
		parameters: { layout: 'fullscreen', a11y: { disable: true } }
	});
</script>

<Story name="Architecture">
	<MarkdownDoc source={architecture} />
</Story>
