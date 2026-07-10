/**
 * Pure URL-cleaning helpers with no Obsidian dependency, so they can be
 * unit-tested in isolation. Each function returns the input unchanged if the
 * rule does not apply, so they are safe to chain.
 */

/**
 * Removes every query parameter whose key begins with `utm_`, and drops the
 * URL fragment (`#…`). Other query parameters are preserved in order.
 *
 * Returns the input unchanged if it is not a parseable URL, or if there was
 * nothing to remove.
 */
export function stripUtmParams(url: string): string {
	const input = url.trim();

	let parsed: URL;
	try {
		parsed = new URL(input);
	} catch {
		return url;
	}

	let changed = false;

	// Remove utm_* parameters.
	const keysToDelete: string[] = [];
	parsed.searchParams.forEach((_value, key) => {
		if (key.toLowerCase().startsWith('utm_')) {
			keysToDelete.push(key);
		}
	});
	for (const key of keysToDelete) {
		parsed.searchParams.delete(key);
		changed = true;
	}

	// Drop the fragment.
	if (parsed.hash) {
		parsed.hash = '';
		changed = true;
	}

	if (!changed) {
		return url;
	}

	// URL.toString() re-encodes; rebuild manually to keep the original path
	// untouched and avoid a dangling "?" when no params remain.
	const query = parsed.searchParams.toString();
	return `${parsed.origin}${parsed.pathname}${query ? `?${query}` : ''}`;
}

/**
 * If the URL points at an Amazon domain and contains a `ref=` reference code,
 * removes the `/ref=` segment and everything after it (path remainder, query,
 * and fragment). Returns the input unchanged otherwise.
 */
export function stripAmazonRef(url: string): string {
	const input = url.trim();

	let parsed: URL;
	try {
		parsed = new URL(input);
	} catch {
		return url;
	}

	// Match any amazon.<tld> host (amazon.com, amazon.ca, amazon.co.uk, …).
	if (!/(^|\.)amazon\./i.test(parsed.hostname)) {
		return url;
	}

	// Look for the "/ref=" segment in the path.
	const refIndex = input.indexOf('/ref=');
	if (refIndex === -1) {
		return url;
	}

	return input.slice(0, refIndex);
}
