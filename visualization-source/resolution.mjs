// Raster sharpness is independent of mesh sampling and the simulation clock.
// Bound the framebuffer on very large/HiDPI screens and modest devices.
export function displayPixelRatio(width, height, dpr = 1, lowDetail = false) {
  const area = Math.max(1, Number(width) || 1) * Math.max(1, Number(height) || 1);
  const requested = Number.isFinite(dpr) && dpr > 0 ? dpr : 1;
  return Math.min(requested, lowDetail ? 1.5 : 2,
    Math.sqrt((lowDetail ? 2_000_000 : 4_000_000) / area));
}
export function modestDevice(device = {}) {
  return (device.deviceMemory > 0 && device.deviceMemory <= 4) ||
    (device.hardwareConcurrency > 0 && device.hardwareConcurrency <= 4);
}
