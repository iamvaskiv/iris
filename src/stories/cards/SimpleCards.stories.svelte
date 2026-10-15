<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import ListCard from '#lib/cards/ListCard.svelte';
	import QuotesCard from '#lib/cards/QuotesCard.svelte';
	import TableCard from '#lib/cards/TableCard.svelte';
	import TextCard from '#lib/cards/TextCard.svelte';
	import UploadCard from '#lib/cards/UploadCard.svelte';
	import CardFrame from './CardFrame.svelte';
	import { fixture } from '../fixtures';

	const { Story } = defineMeta({
		title: 'Cards/Lists, quotes, tables and text',
		tags: ['autodocs'],
		parameters: {
			docs: {
				description: {
					component: `The general-purpose cards Lumi fills in itself (\`show_card\` in \`src/lib/server/agent.ts\`), and the
upload card the app manages while a video uploads and is analysed.`
				}
			}
		}
	});

	const upload = (phase: string, progress: number, subtitle: string) => ({
		id: `upload-${phase}`,
		type: 'upload',
		title: 'Women Talking - Official Trailer.mp4',
		subtitle,
		data: { phase, progress }
	});
</script>

<Story name="List">
	<CardFrame><ListCard card={fixture('Inside Out 2 Clip · Characters')} /></CardFrame>
</Story>

<Story name="Quotes">
	<CardFrame><QuotesCard card={fixture("Women Talking Trailer · Salome's Lines")} /></CardFrame>
</Story>

<Story name="Table">
	<CardFrame><TableCard card={fixture('Trailer Comparison · Trailer Numbers')} /></CardFrame>
</Story>

<Story name="Text">
	<CardFrame>
		<TextCard
			card={{
				id: 'text',
				type: 'text',
				title: 'Why the opening works',
				body: 'The trailer opens on wide, quiet shots of the colony before any dialogue.\nIt earns the first line instead of explaining the premise.'
			}}
		/>
	</CardFrame>
</Story>

<Story name="Upload: uploading">
	<CardFrame><UploadCard card={upload('uploading', 42, 'Uploading…')} /></CardFrame>
</Story>

<Story name="Upload: analysing">
	<CardFrame><UploadCard card={upload('processing', 67, 'Analysing… 67%')} /></CardFrame>
</Story>

<Story name="Upload: failed">
	<CardFrame><UploadCard card={upload('failed', 5, 'Failed: unsupported codec')} /></CardFrame>
</Story>
