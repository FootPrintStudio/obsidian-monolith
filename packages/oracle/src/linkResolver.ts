const WIKILINK_RE = /\[\[(.*?)\]\]/g;

function parseWikiLinkTarget(raw: string): string | null {
	const trimmed = raw.trim();
	if (!trimmed) return null;

	const wikiMatch = trimmed.match(/^\[\[(.*?)\]\]$/);
	const inner = wikiMatch ? wikiMatch[1] : trimmed;
	if (!inner) return null;

	const pipeIndex = inner.indexOf("|");
	const target = (pipeIndex >= 0 ? inner.slice(0, pipeIndex) : inner).trim();
	return target || null;
}

function extractWikiLinksFromString(text: string): string[] {
	const links: string[] = [];
	for (const match of text.matchAll(WIKILINK_RE)) {
		const inner = match[1];
		if (!inner) continue;
		const pipeIndex = inner.indexOf("|");
		const target = (pipeIndex >= 0 ? inner.slice(0, pipeIndex) : inner).trim();
		if (target) links.push(target);
	}
	return links;
}

/** Resolve a frontmatter back-link value to the first navigable target path. */
export function resolveLinkTarget(value: unknown): string | null {
	if (value == null) return null;

	if (Array.isArray(value)) {
		for (const item of value) {
			const resolved = resolveLinkTarget(item);
			if (resolved) return resolved;
		}
		return null;
	}

	if (typeof value !== "string") return null;

	const trimmed = value.trim();
	if (!trimmed) return null;

	const wikiLinks = extractWikiLinksFromString(trimmed);
	if (wikiLinks.length > 0) return wikiLinks[0] ?? null;

	return parseWikiLinkTarget(trimmed);
}
