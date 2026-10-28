<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import CardPagination from '#lib/components/CardPagination.svelte';

	// Sizes as on a wide screen: a normal card (max-w-3xl), a full-size study, and two wide ones (max-w-5xl).
	const cards = [
		{ id: 'a', title: 'Inside Out 2 clip', width: 768, height: 1020 },
		{ id: 'b', title: 'Shrooms quiz', width: 1280, height: 1020 },
		{ id: 'c', title: 'Viewer insights', width: 1024, height: 520 },
		{ id: 'd', title: 'Compare videos', width: 1024, height: 560 }
	];

	const { Story } = defineMeta({
		title: 'App/Card pagination',
		component: CardPagination,
		tags: ['autodocs'],
		parameters: {
			docs: {
				description: {
					component: `A map of a project's cards in the left safe zone (hidden on narrow screens): each card as a block with its
real proportions, scaled down and lined up on the left. The focused card's block is solid; clicking a block brings
that card into focus. It shrinks further when \`maxHeight\` can't fit the whole stack.`
				}
			}
		},
		args: { cards, onselect: (id: string) => console.info('[Cards] select', id) }
	});
</script>

<Story name="First card in focus" args={{ current: 'a' }} />

<Story name="Third card in focus" args={{ current: 'c' }} />

<Story name="Short on room" args={{ current: 'b', maxHeight: 120 }} />
