import { isYouTubeTimestampUrl, formatAsMarkdownLink } from './timestamp';
import { cleanTrackingParams, cleanAmazonUrl } from './urlCleaners';
import { parseMarkdownLink, buildMarkdownLink } from './markdownLink';
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
	if (settings.stripTrackingParams) {
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

/**
 * Given pasted text and the current settings, returns the replacement text
 * plus a Notice message, or null if no enabled rule applies.
 */
export function transformPaste(
	rawText: string,
	settings: PastedUrlLinterSettings
): PasteTransform | null {
	const text = rawText.trim();
	if (!text) {
		return null;
	}

	// Rule 1: YouTube timestamp (bare URL only).
	if (settings.youtubeTimestamp && isYouTubeTimestampUrl(text)) {
		return {
			result: formatAsMarkdownLink(text),
			notice: 'Linked YouTube timestamp',
		};
	}

	// Rules 2 & 3 on a Markdown link.
	const md = parseMarkdownLink(text);
	if (md) {
		const { clean, amazon, removedCount } = cleanUrl(md.url, settings);
		if (clean !== md.url) {
			return {
				result: buildMarkdownLink(md.text, clean),
				notice: cleanerNotice(amazon, removedCount),
			};
		}
		return null;
	}

	// Rules 2 & 3 on a bare URL (opt-in).
	if (settings.cleanBareUrls && isBareUrl(text)) {
		const { clean, amazon, removedCount } = cleanUrl(text, settings);
		if (clean !== text) {
			return {
				result: clean,
				notice: cleanerNotice(amazon, removedCount),
			};
		}
	}

	return null;
}
