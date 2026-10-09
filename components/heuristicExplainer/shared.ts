import { pixelFont } from '../../lib/pixelNetworkTheme';
import type { XgtResult } from '../../lib/xgtHeuristic';

export const PIXEL = pixelFont.className;
export const MONO = { fontFamily: 'var(--font-geist-mono), ui-monospace, monospace' };
export const GLOW = { textShadow: '0 0 8px rgba(34,211,238,0.7)' };

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

export const ROLE = { start: '#4ade80', goal: '#f87171' } as const;

export const MUTED = '#5b7a94';

export type ExplainerModel = {
  start: string;
  goal: string;
  result: XgtResult;
};

export function pct(x: number): string {
  const value = x * 100;
  if (value >= 99.95) return '100%';
  if (value >= 10) return `${value.toFixed(1)}%`;
  if (value >= 1) return `${value.toFixed(2)}%`;
  return `${Number(value.toPrecision(2))}%`;
}

export function dec(x: number, digits = 4): string {
  return x.toFixed(digits);
}
