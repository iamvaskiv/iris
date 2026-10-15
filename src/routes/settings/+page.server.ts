import { settings } from '#lib/server/settings.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => ({ settings: await settings.get() });
