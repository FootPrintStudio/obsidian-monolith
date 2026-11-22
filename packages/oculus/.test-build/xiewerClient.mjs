// src/xiewerClient.ts
import { readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
var DEFAULT_XIEWER_LIMIT = 500;
var DEFAULT_BASE_URL = "http://127.0.0.1:47821";
var DEFAULT_TOKEN_HEADER = "X-CollectionXiewer-Token";
var objectUrlCache = /* @__PURE__ */ new Map();
var lastKnownToken = null;
function normalizeBaseUrl(baseUrl) {
  return baseUrl.trim().replace(/\/+$/, "") || DEFAULT_BASE_URL;
}
function localApiConfigPath() {
  const xdg = process.env.XDG_CONFIG_HOME?.trim();
  const configRoot = xdg && xdg.length > 0 ? xdg : join(homedir(), ".config");
  return join(configRoot, "CollectionXiewer", "local-api.json");
}
function objectUrlCacheKey(tokenHeader, token, fileUrl) {
  return `${tokenHeader}:${token}:${fileUrl}`;
}
function revokeXiewerObjectUrls() {
  for (const url of objectUrlCache.values()) URL.revokeObjectURL(url);
  objectUrlCache.clear();
}
function clearXiewerSessionMemory() {
  lastKnownToken = null;
}
function noteXiewerSessionToken(token) {
  const next = typeof token === "string" ? token.trim() : "";
  if (!next) return false;
  if (lastKnownToken === next) return false;
  if (lastKnownToken !== null) {
    revokeXiewerObjectUrls();
  }
  lastKnownToken = next;
  return true;
}
function readLocalApiSession(preferredBaseUrl) {
  if (typeof process === "undefined" || !process.versions?.node) return null;
  try {
    const raw = readFileSync(localApiConfigPath(), "utf8");
    const parsed = JSON.parse(raw);
    const token = typeof parsed.token === "string" ? parsed.token.trim() : "";
    if (!token) return null;
    const preferred = preferredBaseUrl ? normalizeBaseUrl(preferredBaseUrl) : "";
    const fromFile = typeof parsed.host === "string" && Number.isFinite(parsed.port) ? `http://${parsed.host}:${parsed.port}` : "";
    const baseUrl = preferred || fromFile || DEFAULT_BASE_URL;
    const tokenHeader = typeof parsed.tokenHeader === "string" && parsed.tokenHeader.trim() ? parsed.tokenHeader.trim() : DEFAULT_TOKEN_HEADER;
    return { baseUrl: normalizeBaseUrl(baseUrl), token, tokenHeader };
  } catch {
    return null;
  }
}
function authHeaders(session) {
  return {
    [session.tokenHeader]: session.token,
    Authorization: `Bearer ${session.token}`
  };
}
function mapKind(kind) {
  const lower = kind.toLowerCase();
  if (lower === "image" || lower === "motion") return "image";
  if (lower === "video") return "video";
  return null;
}
function xiewerKindAllows(kind, filter) {
  const mapped = mapKind(kind);
  if (!mapped) return false;
  if (filter === "all") return true;
  if (filter === "images") return mapped === "image";
  return mapped === "video";
}
function xiewerMediaKind(kind) {
  return mapKind(kind) ?? "image";
}
function resolveSearchRoot(preferredBaseUrl, session) {
  const preferred = preferredBaseUrl.trim();
  return preferred ? normalizeBaseUrl(preferred) : session.baseUrl;
}
async function searchOnce(root, session, query, capped, signal) {
  const url = `${root}/search?q=${encodeURIComponent(query)}&limit=${capped}`;
  const health = await fetch(`${root}/health`, { signal });
  if (!health.ok) {
    return {
      error: `CollectionXiewer is not reachable at ${root} (health HTTP ${health.status}). Is the app running?`
    };
  }
  const response = await fetch(url, {
    signal,
    headers: authHeaders(session)
  });
  if (response.status === 401) {
    return {
      error: "CollectionXiewer rejected the API token (401). Restart CollectionXiewer if it is not running, then reopen the note.",
      status: 401
    };
  }
  const body = await response.json();
  if (!response.ok || !body.ok) {
    return {
      error: body.error ?? `CollectionXiewer search failed (HTTP ${response.status}).`
    };
  }
  return { items: body.items ?? [], session: { ...session, baseUrl: root } };
}
async function fetchXiewerSearch(preferredBaseUrl, query, limit, timeoutMs) {
  const session = readLocalApiSession(preferredBaseUrl);
  if (!session) {
    return {
      items: [],
      error: "CollectionXiewer local-api.json not found. Is CollectionXiewer running? (token file: ~/.config/CollectionXiewer/local-api.json)"
    };
  }
  const root = resolveSearchRoot(preferredBaseUrl, session);
  const capped = limit ?? DEFAULT_XIEWER_LIMIT;
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const first = await searchOnce(root, session, query, capped, controller.signal);
    if (!("error" in first)) {
      noteXiewerSessionToken(first.session.token);
      return first;
    }
    if (first.status !== 401) {
      return { items: [], error: first.error };
    }
    const refreshed = readLocalApiSession(preferredBaseUrl);
    if (!refreshed) {
      revokeXiewerObjectUrls();
      lastKnownToken = null;
      return { items: [], error: first.error };
    }
    noteXiewerSessionToken(refreshed.token);
    const retryRoot = resolveSearchRoot(preferredBaseUrl, refreshed);
    const second = await searchOnce(retryRoot, refreshed, query, capped, controller.signal);
    if ("error" in second) {
      return { items: [], error: second.error };
    }
    noteXiewerSessionToken(second.session.token);
    return second;
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    return {
      items: [],
      error: aborted ? `CollectionXiewer timed out at ${root}. Is the app running?` : `CollectionXiewer is not reachable at ${root}. Is the app running?`
    };
  } finally {
    window.clearTimeout(timer);
  }
}
async function resolveXiewerObjectUrl(fileUrl, token, tokenHeader = DEFAULT_TOKEN_HEADER) {
  const tryFetch = async (activeToken, activeHeader) => {
    const cacheKey = objectUrlCacheKey(activeHeader, activeToken, fileUrl);
    const cached = objectUrlCache.get(cacheKey);
    if (cached) return cached;
    const response = await fetch(fileUrl, {
      headers: {
        [activeHeader]: activeToken,
        Authorization: `Bearer ${activeToken}`
      }
    });
    if (response.status === 401) {
      const err = new Error("Unauthorized CollectionXiewer file request (stale token).");
      err.status = 401;
      throw err;
    }
    if (!response.ok) {
      throw new Error(`CollectionXiewer file HTTP ${response.status}`);
    }
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    objectUrlCache.set(cacheKey, objectUrl);
    noteXiewerSessionToken(activeToken);
    return objectUrl;
  };
  try {
    return await tryFetch(token, tokenHeader);
  } catch (err) {
    const status = err && typeof err === "object" && "status" in err ? err.status : void 0;
    if (status !== 401) throw err;
    const refreshed = readLocalApiSession();
    if (!refreshed || refreshed.token === token) {
      revokeXiewerObjectUrls();
      lastKnownToken = null;
      throw err;
    }
    noteXiewerSessionToken(refreshed.token);
    return tryFetch(refreshed.token, refreshed.tokenHeader);
  }
}
function xiewerObjectUrlCacheSize() {
  return objectUrlCache.size;
}
function __testPutXiewerObjectUrl(cacheKey, objectUrl) {
  objectUrlCache.set(cacheKey, objectUrl);
}
export {
  __testPutXiewerObjectUrl,
  clearXiewerSessionMemory,
  fetchXiewerSearch,
  noteXiewerSessionToken,
  readLocalApiSession,
  resolveXiewerObjectUrl,
  revokeXiewerObjectUrls,
  xiewerKindAllows,
  xiewerMediaKind,
  xiewerObjectUrlCacheSize
};
