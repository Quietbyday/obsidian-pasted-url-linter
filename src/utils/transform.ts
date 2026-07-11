import { isYouTubeTimestampUrl, formatAsMarkdownLink } from './timestamp';
import { cleanTrackingParams, cleanAmazonUrl } from './urlCleaners';
import { parseMarkdownLink, buildMarkdownLink } from './markdownLink';
import { stripNotificationCount } from './linkTitle';
import { parseDomainList, domainMatches } from './domainList';
import type { PastedUrlLinterSettings } from '../settings';

export interface PasteTransform {
	/** The replacement text to insert. */
	result: string;
	/** Short message describing what happened, for a Notice. */
	notice: string;
}

interface CleanResult {
	clean: string;
	amazon: boolean;
	removedCount: number;
}

/** Per-link contribution to the aggregate summary. */
interface LinkStat {
	removedTracking: number;
	amazon: boolean;
	titleStripped: boolean;
	youtube: boolean;
}

/** The outcome of transforming a single link token. */
interface LinkResult {
	/** Text to substitute for the token (unchanged token if `changed` is false). */
	result: string;
	changed: boolean;
	/** Specific Notice for this one change (empty when unchanged). */
	notice: string;
	stat: LinkStat;
}

const NO_STAT: LinkStat = {
	removedTracking: 0,
	amazon: false,
	titleStripped: false,
	youtube: false,
};

/**
 * Runs the enabled cleaners over a URL. Amazon canonicalisation runs first
 * (path rewrite, which also discards the query), then tracking-parameter and
 * fragment cleaning.
 */
function cleanUrl(url: string, settings: PastedUrlLinterSettings): CleanResult {
	let clean = url;

	let amazon = false;
	if (settings.cleanAmazonLinks) {
		const next = cleanAmazonUrl(clean);
		if (next !== clean) {
			amazon = true;
			clean = next;
		}
	}

	let removedCount = 0;
	const trackingExcepted = domainMatches(
		url,
		parseDomainList(settings.trackingParamExceptions)
	);
	if (settings.stripTrackingParams && !trackingExcepted) {
		const res = cleanTrackingParams(clean);
		if (res.url !== clean) {
			clean = res.url;
			removedCount = res.removedCount;
		}
	}

	return { clean, amazon, removedCount };
}

/** Picks the Notice message based on which cleaners changed the URL. */
function cleanerNotice(amazon: boolean, removedCount: number): string {
	if (amazon && removedCount > 0) {
		return `Cleaned Amazon link · removed ${removedCount} parameter${
			removedCount === 1 ? '' : 's'
		}`;
	}
	if (amazon) {
		return 'Cleaned Amazon link';
	}
	return `Removed ${removedCount} tracking parameter${
		removedCount === 1 ? '' : 's'
	}`;
}

/**
 * Builds the Notice for a Markdown link, combining the title-strip message with
 * the URL cleaner message when both changed.
 */
function markdownNotice(
	titleChanged: boolean,
	urlChanged: boolean,
	amazon: boolean,
	removedCount: number
): string {
	const parts: string[] = [];
	if (titleChanged) {
		parts.push('Removed notification count');
	}
	if (urlChanged) {
		parts.push(cleanerNotice(amazon, removedCount));
	}
	return parts.join(' · ');
}

/**
 * Transforms one Markdown link (`[text](url)`): cleans the URL and, when the
 * host is whitelisted, strips a notification count from the title. Returns the
 * rebuilt link only when something changed.
 */
function transformMarkdownToken(
	text: string,
	url: string,
	settings: PastedUrlLinterSettings
): LinkResult {
	const { clean, amazon, removedCount } = cleanUrl(url, settings);
	const stripCounts =
		settings.stripNotificationCounts &&
		domainMatches(url, parseDomainList(settings.notificationCountDomains));
	const title = stripCounts
		? stripNotificationCount(text)
		: { title: text, changed: false };

	const urlChanged = clean !== url;
	if (urlChanged || title.changed) {
		return {
			result: buildMarkdownLink(title.title, clean),
			changed: true,
			notice: markdownNotice(
				title.changed,
				urlChanged,
				amazon,
				removedCount
			),
			stat: {
				removedTracking: removedCount,
				amazon,
				titleStripped: title.changed,
				youtube: false,
			},
		};
	}
	return {
		result: buildMarkdownLink(text, url),
		changed: false,
		notice: '',
		stat: NO_STAT,
	};
}

/**
 * Transforms one bare URL: YouTube-timestamp conversion first (always, when the
 * toggle is on), then — only if `cleanBareUrls` is on — the URL cleaners.
 */
function transformBareToken(
	url: string,
	settings: PastedUrlLinterSettings
): LinkResult {
	if (settings.youtubeTimestamp && isYouTubeTimestampUrl(url)) {
		return {
			result: formatAsMarkdownLink(url),
			changed: true,
			notice: 'Linked YouTube timestamp',
			stat: { ...NO_STAT, youtube: true },
		};
	}

	if (settings.cleanBareUrls) {
		const { clean, amazon, removedCount } = cleanUrl(url, settings);
		if (clean !== url) {
			return {
				result: clean,
				changed: true,
				notice: cleanerNotice(amazon, removedCount),
				stat: { ...NO_STAT, removedTracking: removedCount, amazon },
			};
		}
	}

	return { result: url, changed: false, notice: '', stat: NO_STAT };
}

/** Returns true if `text` parses as a URL on its own. */
function isBareUrl(text: string): boolean {
	try {
		// eslint-disable-next-line no-new
		new URL(text);
		return true;
	} catch {
		return false;
	}
}

/** What a single line's transform produced. */
interface LineResult {
	result: string;
	/** Number of link candidates seen on the line. */
	seen: number;
	/** One entry per link that actually changed. */
	changes: LinkResult[];
}

// Finds each Markdown link OR bare http(s) URL within a line. Group 1 is the
// whole Markdown link; group 2 is a bare URL. The Markdown alternative comes
// first so a URL inside `(...)` is consumed as part of its link, never matched
// again as a bare URL.
const INLINE_LINK_RE =
	/(\[[^\]]*\]\([^\s)]+\))|(https?:\/\/[^\s<>()]+)/g;
// Pulls text/url back out of a single inline Markdown-link token.
const INLINE_MD_RE = /^\[([^\]]*)\]\(([^\s)]+)\)$/;
// Trailing sentence punctuation to peel off a bare URL before parsing.
const TRAILING_PUNCT_RE = /[.,;:!?"'’]+$/;

/**
 * Transforms every link on a single line, preserving the surrounding text and
 * the line's own leading/trailing whitespace.
 *
 * Order: (1) a whole-line Markdown link keeps the strict path (so a URL
 * containing `)` still works); (2) a whole-line bare URL; (3) otherwise an
 * inline scan that rewrites each link in place.
 */
function transformLine(
	line: string,
	settings: PastedUrlLinterSettings
): LineResult {
	if (line.trim() === '') {
		return { result: line, seen: 0, changes: [] };
	}

	const lead = (line.match(/^\s*/) as RegExpMatchArray)[0];
	const trail = (line.match(/\s*$/) as RegExpMatchArray)[0];
	const core = line.slice(lead.length, line.length - trail.length);

	// (1) Whole-line Markdown link.
	const md = parseMarkdownLink(core);
	if (md) {
		const t = transformMarkdownToken(md.text, md.url, settings);
		return {
			result: lead + t.result + trail,
			seen: 1,
			changes: t.changed ? [t] : [],
		};
	}

	// (2) Whole-line bare URL — only when the line is a lone token (no internal
	// whitespace), else `new URL()` misreads prose like "link: https://…" whose
	// leading word looks like a scheme. Prose falls through to the inline scan.
	if (!/\s/.test(core) && isBareUrl(core)) {
		const t = transformBareToken(core, settings);
		return {
			result: lead + t.result + trail,
			seen: 1,
			changes: t.changed ? [t] : [],
		};
	}

	// (3) Inline scan.
	let seen = 0;
	const changes: LinkResult[] = [];
	const scanned = core.replace(
		INLINE_LINK_RE,
		(match, mdTok?: string, bareTok?: string) => {
			if (mdTok) {
				const inner = INLINE_MD_RE.exec(mdTok);
				if (!inner) {
					return match;
				}
				seen++;
				const t = transformMarkdownToken(inner[1], inner[2], settings);
				if (t.changed) {
					changes.push(t);
				}
				return t.result;
			}
			// bareTok
			seen++;
			const punct = (bareTok as string).match(TRAILING_PUNCT_RE);
			const suffix = punct ? punct[0] : '';
			const urlCore = suffix
				? (bareTok as string).slice(0, -suffix.length)
				: (bareTok as string);
			const t = transformBareToken(urlCore, settings);
			if (t.changed) {
				changes.push(t);
			}
			return t.result + suffix;
		}
	);

	return { result: lead + scanned + trail, seen, changes };
}

/** Builds the aggregate Notice for two or more changed links. */
function summaryNotice(seen: number, changes: LinkResult[]): string {
	let tracking = 0;
	let titles = 0;
	let amazon = 0;
	let youtube = 0;
	for (const c of changes) {
		tracking += c.stat.removedTracking;
		if (c.stat.titleStripped) titles++;
		if (c.stat.amazon) amazon++;
		if (c.stat.youtube) youtube++;
	}

	const parts: string[] = [];
	if (tracking > 0) {
		parts.push(
			`removed ${tracking} tracking parameter${tracking === 1 ? '' : 's'}`
		);
	}
	if (titles > 0) {
		parts.push(
			`stripped ${titles} notification count${titles === 1 ? '' : 's'}`
		);
	}
	if (amazon > 0) {
		parts.push(`cleaned ${amazon} Amazon link${amazon === 1 ? '' : 's'}`);
	}
	if (youtube > 0) {
		parts.push(
			`linked ${youtube} YouTube timestamp${youtube === 1 ? '' : 's'}`
		);
	}

	const base = `Linted ${changes.length} of ${seen} links`;
	return parts.length ? `${base} · ${parts.join(' · ')}` : base;
}

/**
 * Transforms pasted (or selected) text of any shape: single or multi-line,
 * bare or bulleted, one or many links per line. Returns the replacement text
 * plus a Notice, or `null` if no enabled rule changed anything (so the paste
 * passes through untouched).
 */
export function transformText(
	rawText: string,
	settings: PastedUrlLinterSettings
): PasteTransform | null {
	const lines = rawText.split('\n');
	const outLines: string[] = [];
	let seen = 0;
	const changes: LinkResult[] = [];

	for (const line of lines) {
		const r = transformLine(line, settings);
		outLines.push(r.result);
		seen += r.seen;
		for (const c of r.changes) {
			changes.push(c);
		}
	}

	if (changes.length === 0) {
		return null;
	}

	const notice =
		changes.length === 1
			? changes[0].notice
			: summaryNotice(seen, changes);

	return { result: outLines.join('\n'), notice };
}

/**
 * Back-compatible single-shot entry point. Delegates to `transformText`, so a
 * single whole-line link behaves exactly as before while multi-line and inline
 * cases are handled too.
 */
export function transformPaste(
	rawText: string,
	settings: PastedUrlLinterSettings
): PasteTransform | null {
	return transformText(rawText, settings);
}
