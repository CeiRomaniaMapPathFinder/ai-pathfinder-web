// Theme, colours and number formatting shared by every part of the
// "How it works" explainer on /page3.

import { pixelFont } from '../../lib/pixelNetworkTheme';
import type { XgtResult } from '../../lib/xgtHeuristic';

export const PIXEL = pixelFont.className;
export const MONO = { fontFamily: 'var(--font-geist-mono), ui-monospace, monospace' };
export const GLOW = { textShadow: '0 0 8px rgba(34,211,238,0.7)' };

/**
 * One colour per quantity, used for the symbol in formulas, the column in
 * tables and the marks in illustrations, so a reader can follow a term by
 * colour alone. g/h/f match the tree's FormulaRow above.
 */
export const TERM = {
  g: '#93c5fd',
  h: '#fbbf24',
  f: '#67e8f9',
  xgt: '#34d399',
  completion: '#f472b6',
  shortness: '#a78bfa',
  choice: '#fb923c',
} as const;

export type TermKey = keyof typeof TERM;

/** Start and goal markers, matching the tree and map icons. */
export const ROLE = { start: '#4ade80', goal: '#f87171' } as const;

export const MUTED = '#5b7a94';

/** Everything the chapters need about the route being explained. */
export type ExplainerModel = {
  start: string;
  goal: string;
  result: XgtResult;
};

/** A probability as a readable percentage, keeping two significant digits when tiny. */
export function pct(x: number): string {
  const value = x * 100;
  if (value >= 99.95) return '100%';
  if (value >= 10) return `${value.toFixed(1)}%`;
  if (value >= 1) return `${value.toFixed(2)}%`;
  return `${Number(value.toPrecision(2))}%`;
}

/** A small number with a fixed number of decimals (default 4). */
export function dec(x: number, digits = 4): string {
  return x.toFixed(digits);
}
