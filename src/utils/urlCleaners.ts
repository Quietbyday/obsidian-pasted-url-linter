/**
 * Pure URL-cleaning helpers with no Obsidian dependency, so they can be
 * unit-tested in isolation. Each function returns the input unchanged if the
 * rule does not apply, so they are safe to chain.
 *
 * Two independent cleaners:
 *   - cleanTrackingParams: removes tracking query params (merged list + prefix
 *     matching) and intelligently cleans the fragment. Replaces stripUtmParams.
 *   - cleanAmazonUrl: canonicalises Amazon product links to `…/dp/<ASIN>`.
 *     Replaces stripAmazonRef.
 */

import { isTrackingParam } from './trackingParams';

export interface TrackingCleanResult {
	/** The cleaned URL (unchanged input string if nothing was removed). */
	url: string;
	/** How many tracking parameters were removed (query + fragment). */
	removedCount: number;
}

/**
 * Cleans tracking data out of a URL fragment (the part after `#`), ported from
 * clean-url's `cleanHashFragment`.
 *
 * Behaviour:
 *   - empty / plain anchor (`#section`) → preserved;
 *   - SPA / hash route (`#/dashboard`, `#anchor?params`) → preserved;
 *   - encoded query-style tracking data (`#utm_source%3Dgoogle`) → tracking
 *     keys removed, any real keys kept; fragment dropped if purely tracking.
 *
 * @param hashContent the fragment WITHOUT the leading `#`
 * @returns `hash`: cleaned fragment content (without `#`), or null if the whole
 *          fragment should be dropped; `removed`: count of tracking keys removed.
 */
export function cleanHashFragment(hashContent: string): {
	hash: string | null;
	removed: number;
} {
	if (!hashContent) {
		return { hash: null, removed: 0 };
	}

	// Try to decode; if it fails, leave the fragment untouched.
	let decodedHash: string;
	try {
		decodedHash = decodeURIComponent(hashContent);
	} catch {
		return { hash: hashContent, removed: 0 };
	}

	// SPA routing paths (starting with "/") are real routes — preserve.
	if (decodedHash.startsWith('/')) {
		return { hash: hashContent, removed: 0 };
	}

	// Some frameworks encode complex campaign/state blobs into the hash.
	const looksLikeMalformedTracking =
		hashContent.includes('Vite%20RSC') ||
		hashContent.includes('Next.js') ||
		hashContent.includes('TypeScript') ||
		/^\d+:/.test(hashContent) ||
		/^\d+:/.test(decodedHash);
	if (looksLikeMalformedTracking) {
		return { hash: null, removed: 0 };
	}

	const hasQueryParamStructure = decodedHash.includes('=');
	// "anchor?params" (SPA/hash routing) — preserve as-is.
	const startsWithPathLikeContent = /^[a-zA-Z0-9_-]+\?/.test(decodedHash);
	if (startsWithPathLikeContent) {
		return { hash: hashContent, removed: 0 };
	}
	if (!hasQueryParamStructure) {
		// Plain anchor like "#body" / "#section-1" — preserve.
		return { hash: hashContent, removed: 0 };
	}

	// Looks like encoded query params — filter out tracking keys.
	try {
		const hashParams = new URLSearchParams(decodedHash);
		const cleaned = new URLSearchParams();
		let removed = 0;

		hashParams.forEach((value, key) => {
			if (isTrackingParam(key)) {
				removed++;
			} else {
				cleaned.append(key, value);
			}
		});

		if (removed === 0) {
			// Nothing tracking here — preserve the original fragment verbatim.
			return { hash: hashContent, removed: 0 };
		}

		const cleanedString = cleaned.toString();
		return { hash: cleanedString ? cleanedString : null, removed };
	} catch {
		return { hash: hashContent, removed: 0 };
	}
}

/**
 * Removes tracking query parameters (merged exact-match list + `utm_`-style
 * prefixes, case-insensitive) and cleans the fragment via cleanHashFragment.
 *
 * Returns the input unchanged with `removedCount: 0` if the URL is unparseable
 * or nothing needed cleaning.
 */
export function cleanTrackingParams(url: string): TrackingCleanResult {
	const input = url.trim();

	let parsed: URL;
	try {
		parsed = new URL(input);
	} catch {
		return { url, removedCount: 0 };
	}

	let removedCount = 0;

	// Filter query parameters, preserving order and non-tracking pairs.
	const kept = new URLSearchParams();
	let queryChanged = false;
	parsed.searchParams.forEach((value, key) => {
		if (isTrackingParam(key)) {
			removedCount++;
			queryChanged = true;
		} else {
			kept.append(key, value);
		}
	});

	// Clean the fragment.
	let fragmentChanged = false;
	let newHash = parsed.hash; // includes the leading "#", or "" if none.
	if (parsed.hash) {
		const frag = cleanHashFragment(parsed.hash.slice(1));
		removedCount += frag.removed;
		if (frag.hash === null) {
			if (parsed.hash !== '') {
				fragmentChanged = true;
			}
			newHash = '';
		} else {
			const rebuilt = `#${frag.hash}`;
			if (rebuilt !== parsed.hash) {
				fragmentChanged = true;
			}
			newHash = rebuilt;
		}
	}

	if (!queryChanged && !fragmentChanged) {
		return { url, removedCount: 0 };
	}

	// Rebuild manually so the original path is untouched and there is no
	// dangling "?" when no query params remain.
	const query = kept.toString();
	const rebuilt = `${parsed.origin}${parsed.pathname}${
		query ? `?${query}` : ''
	}${newHash}`;

	return { url: rebuilt, removedCount };
}

// Matches an Amazon product ASIN segment: /dp/<ASIN> or /gp/product/<ASIN>,
// where <ASIN> is exactly 10 alphanumerics (bounded so a longer token is not
// truncated mid-segment).
const AMAZON_ASIN_RE = /\/(?:dp|gp\/product)\/([A-Za-z0-9]{10})(?![A-Za-z0-9])/;

/**
 * Canonicalises an Amazon product URL down to `…/dp/<ASIN>` (or
 * `…/gp/product/<ASIN>`), dropping the trailing `/ref=…`, query, and fragment.
 *
 * Falls back to cutting at `/ref=` when no ASIN segment is present. Returns the
 * input unchanged for non-Amazon hosts, unparseable input, or already-canonical
 * links.
 */
export function cleanAmazonUrl(url: string): string {
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

	const asinMatch = AMAZON_ASIN_RE.exec(parsed.pathname);
	if (asinMatch) {
		const endIndex = (asinMatch.index ?? 0) + asinMatch[0].length;
		const truncatedPath = parsed.pathname.slice(0, endIndex);
		const canonical = `${parsed.origin}${truncatedPath}`;
		// Only report a change if we actually trimmed something.
		return canonical === input ? url : canonical;
	}

	// Fallback: no ASIN segment — cut at "/ref=" if present.
	const refIndex = input.indexOf('/ref=');
	if (refIndex !== -1) {
		return input.slice(0, refIndex);
	}

	return url;
}
