// src/xiewerClient.ts
import { readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
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

// src/views/deferredMedia.ts
var DEFERRED_MEDIA_ROOT_MARGIN = "600px";
var deferredMediaLoaders = /* @__PURE__ */ new WeakMap();
function isImageElement(target) {
  return target.tagName === "IMG";
}
function isMediaElement(target) {
  const tagName = target.tagName;
  return tagName === "IMG" || tagName === "VIDEO";
}
function applySrc(media, src) {
  const markLoaded = () => media.classList.add("mg-lazy-loaded");
  if (isImageElement(media)) {
    media.addEventListener("load", markLoaded, { once: true });
    media.src = src;
    if (media.complete && media.naturalWidth > 0) markLoaded();
    return;
  }
  media.addEventListener("loadedmetadata", markLoaded, { once: true });
  media.src = src;
  media.preload = "metadata";
  media.load();
}
function activateDeferredMedia(media) {
  const src = media.dataset.src;
  if (!src) return;
  delete media.dataset.src;
  const token = media.dataset.authToken;
  const header = media.dataset.authHeader;
  if (!token) {
    applySrc(media, src);
    return;
  }
  void resolveXiewerObjectUrl(src, token, header).then((objectUrl) => applySrc(media, objectUrl)).catch(() => {
    media.dispatchEvent(new Event("error"));
  });
}
function resetDeferredMediaLoader(component) {
  const loader = deferredMediaLoaders.get(component);
  if (!loader) return;
  for (const observer of loader.observers.values()) observer.disconnect();
  loader.observers.clear();
}
function observeDeferredMedia(component, media) {
  media.classList.add("mg-lazy");
  const document = media.ownerDocument;
  const Observer = document.defaultView?.IntersectionObserver;
  if (!Observer) {
    activateDeferredMedia(media);
    return;
  }
  let loader = deferredMediaLoaders.get(component);
  if (!loader) {
    const createdLoader = { observers: /* @__PURE__ */ new Map() };
    loader = createdLoader;
    deferredMediaLoaders.set(component, createdLoader);
    component.register(() => {
      for (const observer2 of createdLoader.observers.values()) observer2.disconnect();
      createdLoader.observers.clear();
      deferredMediaLoaders.delete(component);
    });
  }
  let observer = loader.observers.get(document);
  if (!observer) {
    const createdObserver = new Observer(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const target = entry.target;
          if (!isMediaElement(target)) continue;
          createdObserver.unobserve(target);
          activateDeferredMedia(target);
        }
      },
      { rootMargin: DEFERRED_MEDIA_ROOT_MARGIN }
    );
    observer = createdObserver;
    loader.observers.set(document, createdObserver);
  }
  observer.observe(media);
}
function unobserveDeferredMedia(component, media) {
  deferredMediaLoaders.get(component)?.observers.get(media.ownerDocument)?.unobserve(media);
}
export {
  observeDeferredMedia,
  resetDeferredMediaLoader,
  unobserveDeferredMedia
};
