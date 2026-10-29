/**
 * This device's remembered UI choices (localStorage), for conveniences only: storage can be blocked (a private
 * window), so reading gives null and writing does nothing then.
 */
export function readLocal(key: string): string | null {
	try {
		return localStorage.getItem(key);
	} catch {
		return null;
	}
}

export function writeLocal(key: string, value: string) {
	try {
		localStorage.setItem(key, value);
	} catch {
		// Blocked: it's kept for this visit only.
	}
}
