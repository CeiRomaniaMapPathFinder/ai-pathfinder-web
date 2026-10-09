import type { CityPosition } from './cityPositions';

export const MAP_IMAGE_WIDTH = 1536;
export const MAP_IMAGE_HEIGHT = 1024;

export type MapBox = { left: number; top: number; width: number; height: number };
export type Rect = { left: number; top: number; right: number; bottom: number };

export type MapBoxOptions = { fit?: 'cover' | 'contain' };

export function computeMapBox(
  boxWidth: number,
  boxHeight: number,
  cities: CityPosition[],
  safe: Rect,
  pad: Rect,
  options: MapBoxOptions = {},
): MapBox {
  const centerX = boxWidth / 2;
  const centerY = boxHeight / 2;
  let scale = options.fit === 'contain'
    ? Math.min(boxWidth / MAP_IMAGE_WIDTH, boxHeight / MAP_IMAGE_HEIGHT)
    : Math.max(boxWidth / MAP_IMAGE_WIDTH, boxHeight / MAP_IMAGE_HEIGHT);

  for (const city of cities) {
    const dx = (city.xPct / 100 - 0.5) * MAP_IMAGE_WIDTH;
    const dy = (city.yPct / 100 - 0.5) * MAP_IMAGE_HEIGHT;
    if (dx > 0) scale = Math.min(scale, (safe.right - pad.right - centerX) / dx);
    if (dx < 0) scale = Math.min(scale, (safe.left + pad.left - centerX) / dx);
    if (dy > 0) scale = Math.min(scale, (safe.bottom - pad.bottom - centerY) / dy);
    if (dy < 0) scale = Math.min(scale, (safe.top + pad.top - centerY) / dy);
  }
  scale = Math.max(scale, 0.05);

  const width = MAP_IMAGE_WIDTH * scale;
  const height = MAP_IMAGE_HEIGHT * scale;
  return { left: centerX - width / 2, top: centerY - height / 2, width, height };
}

export function projectCity(city: CityPosition, box: MapBox) {
  return {
    x: box.left + (city.xPct / 100) * box.width,
    y: box.top + (city.yPct / 100) * box.height,
  };
}

export function sameMapBox(a: MapBox | null, b: MapBox) {
  return (
    !!a &&
    Math.abs(a.left - b.left) < 0.5 &&
    Math.abs(a.top - b.top) < 0.5 &&
    Math.abs(a.width - b.width) < 0.5 &&
    Math.abs(a.height - b.height) < 0.5
  );
}

export function mapEdgeFadeStyle(box: MapBox, frame?: { width: number; height: number }) {
  const gapX = box.left > 0.5 || (!!frame && box.left + box.width < frame.width - 0.5);
  const gapY = box.top > 0.5 || (!!frame && box.top + box.height < frame.height - 0.5);
  const gradients: string[] = [];
  if (gapX) gradients.push('linear-gradient(to right, transparent, #000 6%, #000 94%, transparent)');
  if (gapY) gradients.push('linear-gradient(to bottom, transparent, #000 6%, #000 94%, transparent)');
  if (gradients.length === 0) return {};
  const mask = gradients.join(', ');
  return {
    WebkitMaskImage: mask,
    WebkitMaskComposite: 'source-in',
    maskImage: mask,
    maskComposite: 'intersect',
  } as const;
}
