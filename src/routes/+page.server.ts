import { isFielding } from '#lib/cards/study/fielding.js';
import type { StudyData } from '#lib/cards/types.js';
import { thumbnail } from '#lib/server/assets.js';
import { refreshCardData } from '#lib/server/card-data.js';
import { projects } from '#lib/server/projects.js';
import type { PageServerLoad } from './$types';

/** How many of a project's latest cards its tile shows. */
const PREVIEW_CARDS = 2;

export const load: PageServerLoad = async () => ({
	projects: await Promise.all(
		(await projects.list()).map(async (p) => ({
			id: p.id,
			name: p.name,
			summary: p.summary,
			status: p.status,
			/** A study in the project is fielding (has sample results on): the tile says so, like the card does. */
			fielding: p.cards.some(isFielding),
			// The latest cards peek out of the bottom of the tile, oldest first (the newest lies on top). Their data
			// is refreshed like on the project page, so videos and charts show as they are now.
			cards: await (async () => {
				const latest = structuredClone(p.cards.slice(-PREVIEW_CARDS));
				await refreshCardData(latest);
				return latest;
			})(),
			// Its studies with sample results, for previews of video and sources cards to find their viewer data in.
			studies: p.cards.filter(
				(c) => c.type === 'study' && (c.data as StudyData | undefined)?.sample?.results
			),
			// A project without cards yet shows up to two of its video thumbnails instead.
			thumbnails: p.cards.length
				? []
				: await Promise.all(p.videoIds.slice(0, 2).map((id) => thumbnail(id))).then((urls) =>
						urls.filter((u): u is string => !!u)
					)
		}))
	)
});
