import { ORB_VARIANTS, type OrbVariant } from '@latitudelabs/design-system';

const KEY = 'iris-orb-variant';
const LEGACY_KEY = 'jinn-orb-variant'; // the project's earlier codename
const DEFAULT: OrbVariant = 'eye-spiral';

/** Orb variant used in the app; chosen in Settings (or /dev/orb), kept per browser like the theme. */
export const orbVariant = $state<{ current: OrbVariant }>({ current: DEFAULT });

/** Call after mount (not during SSR/hydration) to pick up the saved choice. */
export function loadOrbVariant() {
	try {
		const saved = (localStorage.getItem(KEY) ?? localStorage.getItem(LEGACY_KEY)) as OrbVariant | null;
		// Ignore choices saved for variants that no longer exist.
		orbVariant.current = saved && ORB_VARIANTS.includes(saved) ? saved : DEFAULT;
	} catch {
		// storage unavailable: keep the default
	}
}

export function useOrbVariant(variant: OrbVariant) {
	orbVariant.current = variant;
	try {
		localStorage.setItem(KEY, variant);
	} catch {
		// private mode etc.: still applies for this session
	}
}
