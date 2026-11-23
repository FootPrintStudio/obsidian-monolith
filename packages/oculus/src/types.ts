export type {
	GallerySortMode,
	GalleryViewType,
	MediaFilter,
} from "./mediaContract";
export {
	IMAGE_EXTENSIONS,
	MEDIA_EXTENSIONS,
	MEDIA_FILTERS,
	VIDEO_EXTENSIONS,
	VIEW_TYPES,
} from "./mediaContract";
import type { GallerySortMode, GalleryViewType, MediaFilter } from "./mediaContract";

export type MediaKind = "image" | "video";

export interface MediaGallerySettings {
	allowRemoteImages: boolean;
	/**
	 * Optional host allowlist for remote `URL:` media (comma/newline separated).
	 * Empty = any host when Allow remote media is on. Supports `*.example.com`.
	 */
	remoteMediaHostAllowlist: string;
	remoteLoadTimeoutMs: number;
	validateRemoteContentType: boolean;
	showCaptions: boolean;
	captionMaxLines: number;
	defaultView: GalleryViewType;
	/** Used when a block omits FILTER. */
	defaultFilter: MediaFilter;
	/** When Media Extended is installed, open local/direct URL videos in its player. Hosted URLs always use ME. */
	useMediaExtendedPlayback: boolean;
	/** Click markdown / wiki-embed images in notes to open the Oculus lightbox. */
	lightboxMarkdownImages: boolean;
	/** CollectionXiewer loopback API base URL (no trailing slash). */
	collectionXiewerBaseUrl: string;
}

export const DEFAULT_SETTINGS: MediaGallerySettings = {
	allowRemoteImages: false,
	remoteMediaHostAllowlist: "",
	remoteLoadTimeoutMs: 30000,
	validateRemoteContentType: false,
	showCaptions: true,
	captionMaxLines: 2,
	defaultView: "grid",
	defaultFilter: "all",
	useMediaExtendedPlayback: true,
	lightboxMarkdownImages: true,
	collectionXiewerBaseUrl: "http://127.0.0.1:47821",
};

export interface ParseError {
	line: number;
	message: string;
}

export interface LocalMediaEntry {
	kind: "local";
	path: string;
	recursive: boolean;
	caption?: string;
	line: number;
}

export interface UrlMediaEntry {
	kind: "url";
	url: string;
	caption?: string;
	line: number;
}

export interface SearchMediaEntry {
	kind: "search";
	path: string;
	recursive: boolean;
	queries: string[];
	line: number;
}

export interface XiewerMediaEntry {
	kind: "xiewer";
	/** Opaque CollectionXiewer search query. */
	query: string;
	line: number;
}

export type MediaEntry = LocalMediaEntry | SearchMediaEntry | UrlMediaEntry | XiewerMediaEntry;

export interface ParsedGalleryBlock {
	view: GalleryViewType;
	filter: MediaFilter;
	/** Cap results per SEARCH and XIEWER source; null = unlimited. */
	limit: number | null;
	/** Global sort after merge; null = preserve source order. */
	sort: GallerySortMode | null;
	/** Grid column template; only used when view is `grid`. Values: `auto`, a number, or raw CSS. */
	gridColumns: string;
	/** Thumbnail column template; only used when view is `thumbnails`. Values: `auto`, a number, or raw CSS. */
	thumbnailColumns: string;
	/** Carousel main stage height in px; null uses default (420). */
	carouselHeightPx: number | null;
	/** Show thumbnail strip under carousel main view. */
	carouselShowThumbnails: boolean;
	/** Horizontal masonry target row height in px; null uses default (200). */
	masonryRowHeightPx: number | null;
	/** Vertical masonry column width; `auto`, a number, `200px`, or minmax CSS. */
	masonryColumnWidth: string;
	entries: MediaEntry[];
	errors: ParseError[];
}

export type UrlVariant = "direct" | "hosted";

export interface GalleryItem {
	id: string;
	mediaKind: MediaKind;
	source: "local" | "url" | "xiewer";
	path?: string;
	url?: string;
	/** Distinguishes direct file URLs from hosted platform links (YouTube, etc.). */
	urlVariant?: UrlVariant;
	caption?: string;
	src: string;
	name: string;
	/** Filesystem mtime (ms) when known; used for SORT date. */
	mtime?: number;
	/** CollectionXiewer session token for authenticated /file fetches. */
	authToken?: string;
	/** Header name for authToken (default X-CollectionXiewer-Token). */
	authHeader?: string;
}

export interface ResolveWarning {
	line: number;
	message: string;
}
