export const timecode = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/** `n` as a whole-number share of `total` (0 when there's nothing to share): 37 for 37 of 100. */
export const share = (n: number, total: number) => (total ? Math.round((n / total) * 100) : 0);
