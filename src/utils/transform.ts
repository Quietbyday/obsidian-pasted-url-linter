import { isYouTubeTimestampUrl, formatAsMarkdownLink } from './timestamp';
import { stripUtmParams, stripAmazonRef } from './urlCleaners';
import { parseMarkdownLink, buildMarkdownLink } from './markdownLink';
import type { PastedUrlLinterSettings } from '../settings';

export interface PasteTransform {
	/** The replacement text to insert. */
	result: string;
	/** Short message describing what happened, for a Notice. */
	notice: string;
}

/** Runs the enabled UTM/Amazon cleaners over a URL, tracking which fired. */
function cleanUrl(
	url: string,
	settings: PastedUrlLinterSettings
): { clean: string; utm: boolean; amazon: boolean } {
	let clean = url;

	let utm = false;
	if (settings.stripUtm) {
		const next = stripUtmParams(clean);
		if (next !== clean) {
			utm = true;
			clean = next;
		}
	}

	let amazon = false;
	if (settings.stripAmazonRef) {
		const next = stripAmazonRef(clean);
		if (next !== clean) {
			amazon = true;
			clean = next;
		}
	}

	return { clean, utm, amazon };
}

/** Picks the Notice message based on which cleaners changed the URL. */
function cleanerNotice(utm: boolean, amazon: boolean): string {
	if (utm && amazon) return 'Cleaned pasted URL';
	if (amazon) return 'Stripped Amazon ref code';
	return 'Stripped tracking parameters';
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
		const { clean, utm, amazon } = cleanUrl(md.url, settings);
		if (clean !== md.url) {
			return {
				result: buildMarkdownLink(md.text, clean),
				notice: cleanerNotice(utm, amazon),
			};
		}
		return null;
	}

	// Rules 2 & 3 on a bare URL (opt-in).
	if (settings.cleanBareUrls && isBareUrl(text)) {
		const { clean, utm, amazon } = cleanUrl(text, settings);
		if (clean !== text) {
			return {
				result: clean,
				notice: cleanerNotice(utm, amazon),
			};
		}
	}

	return null;
}
