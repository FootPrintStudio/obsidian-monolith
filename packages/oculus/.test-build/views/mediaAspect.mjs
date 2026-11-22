// src/views/mediaAspect.ts
var PLACEHOLDER_ASPECT = { w: 4, h: 3 };
function readMediaAspectRatio(media) {
  if (media.tagName === "IMG") {
    const image = media;
    if (image.naturalWidth > 0 && image.naturalHeight > 0) {
      return { w: image.naturalWidth, h: image.naturalHeight };
    }
    return null;
  }
  const video = media;
  if (video.videoWidth > 0 && video.videoHeight > 0) {
    return { w: video.videoWidth, h: video.videoHeight };
  }
  return null;
}
function attachAspectRatioListener(media, onRatio) {
  const emit = () => {
    const ratio = readMediaAspectRatio(media);
    if (ratio) onRatio(ratio);
  };
  if (media.tagName === "IMG") {
    if (readMediaAspectRatio(media)) emit();
    else media.addEventListener("load", emit, { once: true });
    return;
  }
  const video = media;
  if (video.readyState >= 1) emit();
  else video.addEventListener("loadedmetadata", emit, { once: true });
}
export {
  PLACEHOLDER_ASPECT,
  attachAspectRatioListener,
  readMediaAspectRatio
};
