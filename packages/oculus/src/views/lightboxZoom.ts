/** User zoom of 1 = fit-to-viewport. Past this, unlock full-resolution layout. */
export const FULL_RES_ZOOM_THRESHOLD = 1.02;

/**
 * Contain-fit natural media into a box without upscaling past 1×.
 * Returns the fitted CSS pixel size and the scale factor (fitted / natural).
 */
export function computeContainSize(
	naturalW: number,
	naturalH: number,
	boxW: number,
	boxH: number,
): { width: number; height: number; scale: number } {
	if (naturalW <= 0 || naturalH <= 0 || boxW <= 0 || boxH <= 0) {
		return { width: 0, height: 0, scale: 1 };
	}
	const scale = Math.min(boxW / naturalW, boxH / naturalH, 1);
	return {
		width: naturalW * scale,
		height: naturalH * scale,
		scale,
	};
}

/** Whether zoom detail needs the native bitmap instead of a fit-sized decode. */
export function shouldUseFullRes(userScale: number, threshold = FULL_RES_ZOOM_THRESHOLD): boolean {
	return userScale > threshold;
}

/**
 * CSS transform scale applied to the media element.
 * Fit mode lays out at fitted size → scale = userScale.
 * Full-res mode lays out at natural size → scale = fitScale * userScale (visual continuity).
 */
export function transformScaleForMode(
	userScale: number,
	fitScale: number,
	fullRes: boolean,
): number {
	if (!fullRes) return userScale;
	return fitScale * userScale;
}

/** Layout width/height the `<img>` should use for the current decode tier. */
export function layoutSizeForMode(
	naturalW: number,
	naturalH: number,
	fitW: number,
	fitH: number,
	fullRes: boolean,
): { width: number; height: number } {
	if (fullRes) return { width: naturalW, height: naturalH };
	return { width: fitW, height: fitH };
}
