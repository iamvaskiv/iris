import { assets } from '#lib/server/assets.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => ({ assets: await assets.list({ withThumbnails: true }) });
