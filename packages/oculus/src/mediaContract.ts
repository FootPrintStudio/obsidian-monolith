/** Shared Oculus ↔ Augur gallery media contract (enums + extensions). */

export type GalleryViewType =
	| "grid"
	| "thumbnails"
	| "carousel"
	| "masonry-h"
	| "masonry-v";

export type MediaFilter = "images" | "video" | "all";

export type GallerySortMode =
	| "name-asc"
	| "name-dsc"
	| "date-asc"
	| "date-dsc"
	| "random";

export const VIEW_TYPES: GalleryViewType[] = [
	"grid",
	"thumbnails",
	"carousel",
	"masonry-h",
	"masonry-v",
];

export const MEDIA_FILTERS: MediaFilter[] = ["images", "video", "all"];

export const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp"]);
export const VIDEO_EXTENSIONS = new Set(["mp4", "webm", "mov"]);
export const MEDIA_EXTENSIONS = new Set([...IMAGE_EXTENSIONS, ...VIDEO_EXTENSIONS]);
