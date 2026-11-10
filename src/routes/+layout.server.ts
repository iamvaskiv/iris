import { CHECKLIST_COOKIE, parseChecklist } from '#lib/checklist.svelte.js';
import type { LayoutServerLoad } from './$types';

/** The "Getting started" checklist from this browser's cookie, so pages render it as the browser will. */
export const load: LayoutServerLoad = ({ cookies }) => ({
	checklist: parseChecklist(cookies.get(CHECKLIST_COOKIE))
});
