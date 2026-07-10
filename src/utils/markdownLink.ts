/**
 * Helpers for recognising and rebuilding a single Markdown link of the form
 * `[text](url)`. Pure, no Obsidian dependency.
 */

export interface MarkdownLink {
	text: string;
	url: string;
}

// Matches a whole-string Markdown link: [text](url).
// - text: anything that is not a closing bracket (allows most titles).
// - url: anything that is not a space or closing paren.
const MARKDOWN_LINK_RE = /^\[([^\]]*)\]\((\S+)\)$/;

/**
 * Parses `text` as a single Markdown link spanning the entire (trimmed) string.
 * Returns null if it is not exactly one Markdown link.
 */
export function parseMarkdownLink(text: string): MarkdownLink | null {
	const match = MARKDOWN_LINK_RE.exec(text.trim());
	if (!match) {
		return null;
	}
	return { text: match[1], url: match[2] };
}

/** Builds a Markdown link string from its parts. */
export function buildMarkdownLink(text: string, url: string): string {
	return `[${text}](${url})`;
}
