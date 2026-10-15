<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import MarkdownDoc from './MarkdownDoc.svelte';
	// The changelog lives in CHANGELOG.md at the repo root; edit it there.
	import changelog from '../../../CHANGELOG.md?raw';

	const { Story } = defineMeta({
		title: 'Docs/Changelog',
		parameters: { layout: 'fullscreen', a11y: { disable: true } }
	});
</script>

<Story name="Changelog">
	<MarkdownDoc source={changelog} />
</Story>
