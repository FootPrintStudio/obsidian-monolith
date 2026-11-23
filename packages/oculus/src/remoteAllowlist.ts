/**
 * Host allowlist for remote `URL:` media.
 * Empty / whitespace-only allowlist = any host (when remote media is enabled).
 * Entries are hostnames (no scheme/port); `*.example.com` matches subdomains.
 */
export function parseRemoteHostAllowlist(raw: string | undefined | null): string[] {
	if (!raw || typeof raw !== "string") return [];
	return raw
		.split(/[\n,]+/)
		.map((s) => s.trim().toLowerCase())
		.filter(Boolean);
}

export function hostnameFromUrl(url: string): string | null {
	try {
		const host = new URL(url.trim()).hostname.toLowerCase().replace(/^\[|\]$/g, "");
		return host || null;
	} catch {
		return null;
	}
}

export function isRemoteHostAllowed(url: string, allowlistRaw: string | undefined | null): boolean {
	const allowlist = parseRemoteHostAllowlist(allowlistRaw);
	if (allowlist.length === 0) return true;
	const host = hostnameFromUrl(url);
	if (!host) return false;
	for (const entry of allowlist) {
		if (entry.startsWith("*.")) {
			const suffix = entry.slice(1); // ".example.com"
			if (host === entry.slice(2) || host.endsWith(suffix)) return true;
			continue;
		}
		if (host === entry) return true;
	}
	return false;
}
