// Map geometry for the explainer's SVG illustrations, derived from the same
// city positions the map pages use (a percentage of the 3:2 map photo).

import { cityPositions } from '../../../lib/cityPositions';
import { MAP_IMAGE_HEIGHT, MAP_IMAGE_WIDTH } from '../../../lib/mapProjection';

const ASPECT = MAP_IMAGE_HEIGHT / MAP_IMAGE_WIDTH;

/** City position in SVG units: x 0–100 across the photo, y scaled to keep its aspect. */
export const CITY_XY: Record<string, { x: number; y: number }> = Object.fromEntries(
  cityPositions.map((city) => [city.id, { x: city.xPct, y: city.yPct * ASPECT }]),
);

/** Compass angle (radians, SVG y-down) from one city to another. */
export function angleBetween(from: string, to: string): number {
  const a = CITY_XY[from];
  const b = CITY_XY[to];
  return Math.atan2(b.y - a.y, b.x - a.x);
}

/**
 * Spreads angles apart so no two are closer than `minGap`, keeping their
 * order around the circle. Used to fan out receivers that lie in almost the
 * same direction on the real map.
 */
export function spreadAngles(angles: number[], minGap = Math.PI / 4.5): number[] {
  const order = angles.map((angle, index) => ({ angle, index })).sort((a, b) => a.angle - b.angle);
  for (let pass = 0; pass < 12; pass++) {
    for (let i = 0; i < order.length; i++) {
      const current = order[i];
      const next = order[(i + 1) % order.length];
      let gap = next.angle - current.angle;
      if (i === order.length - 1) gap += 2 * Math.PI;
      if (order.length > 1 && gap < minGap) {
        const push = (minGap - gap) / 2;
        current.angle -= push;
        next.angle += push;
      }
    }
  }
  const result: number[] = [];
  for (const { angle, index } of order) result[index] = angle;
  return result;
}

/** 0 (hopeless) … 1 (the goal) on a log scale, for colouring a probability. */
export function threatLevel(xgt: number): number {
  if (xgt <= 0) return 0;
  return Math.max(0, Math.min(1, 1 + Math.log(xgt) / 10));
}

/** Mixes two #rrggbb colours. */
export function mix(from: string, to: string, t: number): string {
  const parse = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const a = parse(from);
  const b = parse(to);
  const channel = (i: number) =>
    Math.round(a[i] + (b[i] - a[i]) * t)
      .toString(16)
      .padStart(2, '0');
  return `#${channel(0)}${channel(1)}${channel(2)}`;
}

export const THREAT_LOW = '#16263a';
export const THREAT_HIGH = '#34d399';

/** threatLevel bent so the long tail of tiny values stays dim — what the eye should read as brightness. */
export function threatShade(xgt: number): number {
  return Math.pow(threatLevel(xgt), 1.6);
}

export function threatColor(xgt: number): string {
  return mix(THREAT_LOW, THREAT_HIGH, threatShade(xgt));
}

/**
 * Rounds an SVG coordinate or style number. The server and the browser can
 * disagree in the last bit of Math.exp/log/cos, which React reports as a
 * hydration mismatch; three decimals is far below one pixel.
 */
export function snap(n: number): number {
  return Math.round(n * 1000) / 1000;
}
