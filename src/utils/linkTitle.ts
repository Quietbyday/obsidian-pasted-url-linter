/**
 * Helpers for cleaning the *title* of a pasted Markdown link. Pure, no Obsidian
 * dependency, so it can be unit-tested directly.
 */

export interface StripResult {
	/** The cleaned title. */
	title: string;
	/** True if a notification count was removed. */
	changed: boolean;
}

/**
 * A notification/badge "count" token: an opening paren, 1–3 digits, an optional
 * trailing `+`, then a closing paren — e.g. `(14)`, `(8)`, `(20+)`.
 *
 * The 1–3 digit cap is deliberate: it keeps counts (0–999) in scope while
 * leaving 4-digit numbers like years (`(2049)`, `(2023)`) untouched, which is
 * the main false-positive risk for legitimate titles.
 */
const COUNT_TOKEN = /\(\d{1,3}\+?\)/g;

/** True if `ch` is undefined (string edge) or a whitespace character. */
function isBoundary(ch: string | undefined): boolean {
	return ch === undefined || /\s/.test(ch);
}

/**
 * Removes a leading or standalone-embedded notification count from a Markdown
 * link title.
 *
 * Matching rules (see the handover note for the decisions behind them):
 *  - A count at the very start of the title is stripped (`(14) Home` → `Home`).
 *  - A count embedded mid-title is stripped only when it is a standalone,
 *    whitespace-delimited token (`Inbox (47) - Gmail` → `Inbox - Gmail`), so a
 *    number glued to other text is left alone.
 *  - Only the FIRST qualifying token is removed; a second count elsewhere in the
 *    title is left in place (`(3) Foo (5)` → `Foo (5)`).
 *  - Surrounding whitespace is tidied: a leading token takes the space after it,
 *    and an embedded token collapses its two surrounding spaces down to one (or
 *    trims cleanly if it sat at the end).
 */
export function stripNotificationCount(title: string): StripResult {
	COUNT_TOKEN.lastIndex = 0;
	let match: RegExpExecArray | null;

	while ((match = COUNT_TOKEN.exec(title)) !== null) {
		const start = match.index;
		const end = start + match[0].length;
		const before = start === 0 ? undefined : title[start - 1];
		const after = end === title.length ? undefined : title[end];

		const atStart = start === 0;
		const boundedBefore = isBoundary(before);
		const boundedAfter = isBoundary(after);

		// Leading token: strip it plus any whitespace that followed it.
		if (atStart && boundedAfter) {
			const cleaned = title.slice(end).replace(/^\s+/, '');
			return { title: cleaned, changed: cleaned !== title };
		}

		// Standalone embedded token: whitespace (or edge) on both sides.
		if (!atStart && boundedBefore && boundedAfter) {
			const left = title.slice(0, start);
			const right = title.slice(end);
			// If nothing but whitespace follows, the token was at the end: trim.
			const cleaned =
				right.trim() === ''
					? left.replace(/\s+$/, '')
					: left.replace(/\s+$/, ' ') + right.replace(/^\s+/, '');
			return { title: cleaned, changed: cleaned !== title };
		}

		// Otherwise this token is glued to surrounding text (e.g. `abc(3)def`);
		// keep scanning for a later qualifying one.
	}

	return { title, changed: false };
}
