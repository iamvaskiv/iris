import { settings } from '#lib/server/settings.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => ({ settings: settings.get() });
