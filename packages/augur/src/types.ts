export type {
	GallerySortMode,
	GalleryViewType,
	MediaFilter,
} from "../../oculus/src/mediaContract";
export {
	IMAGE_EXTENSIONS,
	MEDIA_EXTENSIONS,
	MEDIA_FILTERS,
	VIDEO_EXTENSIONS,
	VIEW_TYPES,
} from "../../oculus/src/mediaContract";
export type { TabAlign, TabPosition } from "../../visage/src/tabs/types";
export { TAB_ALIGNS, TAB_POSITIONS } from "../../visage/src/tabs/types";

import type { GalleryViewType, MediaFilter } from "../../oculus/src/mediaContract";
import type { TabAlign, TabPosition } from "../../visage/src/tabs/types";

export interface AugurSettings {
	defaultView: GalleryViewType;
	defaultFilter: MediaFilter;
	defaultTabPosition: TabPosition;
	defaultTabAlign: TabAlign;
	defaultTabTitle1: string;
	defaultTabTitle2: string;
	grimoirePrefix: string;
	lexiconFolder: string;
}

export const DEFAULT_SETTINGS: AugurSettings = {
	defaultView: "grid",
	defaultFilter: "all",
	defaultTabPosition: "top",
	defaultTabAlign: "left",
	defaultTabTitle1: "Tab 1",
	defaultTabTitle2: "Tab 2",
	grimoirePrefix: "q=",
	lexiconFolder: "Dictionary",
};

export const AUGUR_PATH_MIME = "application/x-augur-path";
