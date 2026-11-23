import assert from "node:assert/strict";
import test from "node:test";

const {
	FULL_RES_ZOOM_THRESHOLD,
	computeContainSize,
	shouldUseFullRes,
	transformScaleForMode,
	layoutSizeForMode,
} = await import("../.test-build/views/lightboxZoom.mjs");

test("contain-fit shrinks large media into the box without upscaling", () => {
	const fitted = computeContainSize(4000, 3000, 800, 600);
	assert.equal(fitted.width, 800);
	assert.equal(fitted.height, 600);
	assert.equal(fitted.scale, 0.2);
});

test("contain-fit keeps small media at natural size", () => {
	const fitted = computeContainSize(400, 300, 800, 600);
	assert.equal(fitted.width, 400);
	assert.equal(fitted.height, 300);
	assert.equal(fitted.scale, 1);
});

test("contain-fit returns zeros for invalid inputs", () => {
	assert.deepEqual(computeContainSize(0, 100, 800, 600), { width: 0, height: 0, scale: 1 });
	assert.deepEqual(computeContainSize(100, 100, 0, 600), { width: 0, height: 0, scale: 1 });
});

test("full-res unlocks past zoom threshold and resets at 1×", () => {
	assert.equal(shouldUseFullRes(1), false);
	assert.equal(shouldUseFullRes(FULL_RES_ZOOM_THRESHOLD), false);
	assert.equal(shouldUseFullRes(FULL_RES_ZOOM_THRESHOLD + 0.001), true);
	assert.equal(shouldUseFullRes(2), true);
});

test("transform scale stays visually continuous across fit → full-res", () => {
	const userScale = 2;
	const fitScale = 0.25;
	const fitCss = transformScaleForMode(userScale, fitScale, false);
	const fullCss = transformScaleForMode(userScale, fitScale, true);
	// Fit layout 1000px * scale 2 = 2000 visual
	// Full layout 4000px * scale 0.5 = 2000 visual
	assert.equal(fitCss, 2);
	assert.equal(fullCss, 0.5);
	assert.equal(1000 * fitCss, 4000 * fullCss);
});

test("layout size switches between fitted and natural", () => {
	assert.deepEqual(layoutSizeForMode(4000, 3000, 800, 600, false), { width: 800, height: 600 });
	assert.deepEqual(layoutSizeForMode(4000, 3000, 800, 600, true), { width: 4000, height: 3000 });
});
