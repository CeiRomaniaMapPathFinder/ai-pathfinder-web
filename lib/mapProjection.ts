// Places the Romania map photo (and the cities on it) inside a box of any
// size. City positions are stored as a percentage of the PHOTO itself (see
// lib/cityPositions.ts), so the one thing every page has to agree on is where
// the photo ends up on screen — this computes that, and both the <Image> and
// the vis-network nodes are positioned from the same result, so they can't
// drift apart on screens with a different shape.
import type { CityPosition } from './cityPositions';

// Intrinsic size of public/images/romania-fantasy-map.png.
export const MAP_IMAGE_WIDTH = 1536;
export const MAP_IMAGE_HEIGHT = 1024;

// Where the photo is drawn, in px relative to the box's top-left corner.
export type MapBox = { left: number; top: number; width: number; height: number };
export type Rect = { left: number; top: number; right: number; bottom: number };

// Behaves like `object-fit: cover` (fills the box, centered), except it
// shrinks the photo whenever cover would push a city outside `safe` — the
// part of the box where nodes are actually visible (in box coordinates). So a
// short, wide card or a small window still shows every node. `pad` is the
// room (px) to keep between the outermost cities and each edge of `safe`,
// for their icon and label.
export function computeMapBox(
  boxWidth: number,
  boxHeight: number,
  cities: CityPosition[],
  safe: Rect,
  pad: Rect,
): MapBox {
  const centerX = boxWidth / 2;
  const centerY = boxHeight / 2;
  let scale = Math.max(boxWidth / MAP_IMAGE_WIDTH, boxHeight / MAP_IMAGE_HEIGHT);

  for (const city of cities) {
    // Offset from the photo's center, in photo pixels.
    const dx = (city.xPct / 100 - 0.5) * MAP_IMAGE_WIDTH;
    const dy = (city.yPct / 100 - 0.5) * MAP_IMAGE_HEIGHT;
    if (dx > 0) scale = Math.min(scale, (safe.right - pad.right - centerX) / dx);
    if (dx < 0) scale = Math.min(scale, (safe.left + pad.left - centerX) / dx);
    if (dy > 0) scale = Math.min(scale, (safe.bottom - pad.bottom - centerY) / dy);
    if (dy < 0) scale = Math.min(scale, (safe.top + pad.top - centerY) / dy);
  }
  // A safe area that doesn't reach past the center can't be satisfied by
  // shrinking alone — don't let the photo vanish, just keep it small.
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

// When the photo is shrunk to fit, its edges sit inside the box — fade those
// edges into the dark background instead of showing a hard line (the sea glow
// on the right side is bright). Sides where the photo reaches the box edge
// are left alone, so the usual cover look is unchanged.
export function mapEdgeFadeStyle(box: MapBox) {
  const gradients: string[] = [];
  if (box.left > 0.5) gradients.push('linear-gradient(to right, transparent, #000 6%, #000 94%, transparent)');
  if (box.top > 0.5) gradients.push('linear-gradient(to bottom, transparent, #000 6%, #000 94%, transparent)');
  if (gradients.length === 0) return {};
  const mask = gradients.join(', ');
  return {
    WebkitMaskImage: mask,
    WebkitMaskComposite: 'source-in',
    maskImage: mask,
    maskComposite: 'intersect',
  } as const;
}
