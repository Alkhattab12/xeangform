/**
 * Posisi panel notifikasi relatif terhadap pembungkus lonceng (yang `position: relative`).
 * Panel dirapatkan ke tepi kanan lonceng, lalu digeser agar SELALU berada di dalam layar
 * (lonceng ada di tengah header, jadi `right-0` biasa membuat panel keluar layar di HP).
 */
export const PANEL_MAX_WIDTH = 420;
export const PANEL_MARGIN = 16;

export function computePanelPlacement(
  anchorLeft: number,
  anchorRight: number,
  viewportWidth: number,
  maxWidth = PANEL_MAX_WIDTH,
  margin = PANEL_MARGIN,
): { left: number; width: number } {
  const width = Math.max(0, Math.min(maxWidth, viewportWidth - margin * 2));
  const desiredLeft = anchorRight - width; // rata kanan dengan lonceng
  const clampedLeft = Math.max(margin, Math.min(desiredLeft, viewportWidth - width - margin));
  return { left: clampedLeft - anchorLeft, width }; // `left` relatif ke pembungkus lonceng
}
