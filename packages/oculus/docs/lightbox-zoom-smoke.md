# Lightbox zoom full-res — manual smoke

UI pan/zoom against Chromium decode is hard to unit-test; run this in Obsidian after installing the build.

## Setup

1. Vault with a large local image (e.g. ≥3000px on the long edge).
2. Note with either `![[large.png]]` or an `oculus` gallery that includes that file.
3. Settings → Oculus → **Lightbox note images** on (default).

## Steps

1. Open the lightbox on the large image (click embed or gallery tile).
2. At 1× (fit): image should fill the viewport contain-box; DevTools on the `<img>` should show CSS width/height ≈ viewport contain size (not full natural).
3. Zoom in with `+` or wheel past ~1×: `<img>` should gain class `mg-lightbox-media-fullres`, layout size ≈ `naturalWidth` × `naturalHeight`, and detail should stay sharp (not soft/blurry upscaling of the fit bitmap).
4. Pan while zoomed: drag still works; edges clamp.
5. **Reset**: returns to fit size (`mg-lightbox-media-fit`); zoom/pan cleared.
6. Prev/Next to another image: each item starts in fit mode again.

## Pass criteria

- Fit open stays memory-friendly (layout capped to viewport).
- Zoomed view uses native pixels and looks sharp relative to the original file.
- No jump/glitch in visual size when crossing the full-res threshold.
