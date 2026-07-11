/**
 * Helpers for the user-editable domain lists (the notification-count whitelist
 * and the tracking-param exception list). Pure, no Obsidian dependency.
 *
 * A list is stored as a single free-text string; users separate entries with
 * commas and/or newlines. Entries are normalised leniently so that pasting a
 * full URL, a `www.`-prefixed host, or a bare domain all work.
 */

/**
 * Parses a raw list string into an array of normalised, lowercased domains.
 * Accepts commas and newlines as separators. Each entry is stripped of any
 * scheme, path, and leading `www.`, so `https://www.x.com/home`, `www.x.com`,
 * and `x.com` all normalise to `x.com`. Empty entries are dropped.
 */
export function parseDomainList(raw: string): string[] {
	if (!raw) {
		return [];
	}
	return raw
		.split(/[\n,]+/)
		.map((entry) => normaliseDomain(entry))
		.filter((entry) => entry.length > 0);
}

/** Normalises a single list entry to a bare, lowercased host. */
function normaliseDomain(entry: string): string {
	let host = entry.trim().toLowerCase();
	if (!host) {
		return '';
	}
	// Drop a scheme if present (http://, https://, etc.).
	host = host.replace(/^[a-z][a-z0-9+.-]*:\/\//, '');
	// Drop anything from the first path/query/fragment separator onward.
	host = host.replace(/[/?#].*$/, '');
	// Drop a leading `www.` so entries match their bare domain too.
	host = host.replace(/^www\./, '');
	// Drop a trailing dot (fully-qualified form) and any port.
	host = host.replace(/\.$/, '').replace(/:\d+$/, '');
	return host;
}

/** Extracts the lowercased hostname from a URL, or null if it can't be parsed. */
function hostnameOf(url: string): string | null {
	try {
		return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
	} catch {
		return null;
	}
}

/**
 * Returns true if `url`'s host matches any domain in `domains`. Matching is
 * subdomain-inclusive: an entry `x.com` matches `x.com`, `www.x.com`, and
 * `mobile.x.com`; an entry `google.com` matches `mail.google.com`. An empty
 * `domains` list never matches.
 */
export function domainMatches(url: string, domains: string[]): boolean {
	if (domains.length === 0) {
		return false;
	}
	const host = hostnameOf(url);
	if (!host) {
		return false;
	}
	return domains.some(
		(domain) => host === domain || host.endsWith(`.${domain}`)
	);
}
