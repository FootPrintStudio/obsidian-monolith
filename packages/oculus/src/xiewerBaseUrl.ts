/** True when the CollectionXiewer base URL targets loopback or a private LAN host. */
export function isPrivateOrLoopbackBaseUrl(raw: string): boolean {
	try {
		const url = new URL(raw.trim());
		if (url.protocol !== "http:" && url.protocol !== "https:") return false;
		const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
		if (host === "localhost" || host === "127.0.0.1" || host === "::1") return true;
		if (host === "0.0.0.0") return true;
		const parts = host.split(".");
		if (parts.length === 4 && parts.every((p) => /^\d{1,3}$/.test(p))) {
			const a = Number(parts[0]);
			const b = Number(parts[1]);
			if (a === 10) return true;
			if (a === 192 && b === 168) return true;
			if (a === 172 && b >= 16 && b <= 31) return true;
			if (a === 127) return true;
		}
		return false;
	} catch {
		return false;
	}
}
