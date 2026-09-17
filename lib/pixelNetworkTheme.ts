// Shared 16-bit/32-bit pixel-art + futuristic-networking theme used by the
// city picker map (app/page.tsx) and the search animation map (RomaniaMap.tsx).
//
// Devices are drawn as tiny hand-built pixel glyphs (crisp rects on a 16x16
// grid, no anti-aliasing) and shipped to vis-network as `shape: 'image'` data
// URIs with `shapeProperties.interpolation: false` so they stay chunky when
// scaled up instead of getting smoothed into a blur.

import { Press_Start_2P } from 'next/font/google';

export const pixelFont = Press_Start_2P({ weight: '400', subsets: ['latin'] });

export type DeviceRole = 'router' | 'pc' | 'server';
export type DeviceTone = 'idle' | 'frontier' | 'explored' | 'current' | 'start' | 'goal';

type TonePalette = { body: string; accent: string; glow: string; dark: string };

const TONE_COLORS: Record<DeviceTone, TonePalette> = {
  idle: { body: '#243244', accent: '#64748b', glow: '#38bdf8', dark: '#0b1220' },
  frontier: { body: '#f59e0b', accent: '#fde68a', glow: '#fbbf24', dark: '#78350f' },
  explored: { body: '#2563eb', accent: '#93c5fd', glow: '#3b82f6', dark: '#0f2a6b' },
  current: { body: '#22d3ee', accent: '#ecfeff', glow: '#67e8f9', dark: '#083344' },
  start: { body: '#22c55e', accent: '#bbf7d0', glow: '#4ade80', dark: '#14532d' },
  goal: { body: '#ef4444', accent: '#fecaca', glow: '#f87171', dark: '#7f1d1d' },
};

function svgToDataUri(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const GLOW_DEFS = `
  <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
    <feGaussianBlur stdDeviation="1.1" result="blur" />
    <feMerge>
      <feMergeNode in="blur" />
      <feMergeNode in="SourceGraphic" />
    </feMerge>
  </filter>
  <filter id="halo" x="-140%" y="-140%" width="380%" height="380%">
    <feGaussianBlur stdDeviation="2.6" />
  </filter>`;

// Icons sitting on a photo background stay readable via a colored glow behind
// them (no flat dark box) — a blurred blob in the tone's own glow color
// (pushed brighter/bigger so it stands out whatever the color is), plus a
// tight dark rim right at the glyph edge for separation against light cloud
// patches.
function haloGlow(c: TonePalette): string {
  return `
    <ellipse cx="8" cy="8" rx="7.6" ry="7.6" fill="${c.glow}" opacity="0.8" filter="url(#halo)" />
    <ellipse cx="8" cy="8" rx="6.2" ry="6.2" fill="${c.glow}" opacity="0.5" filter="url(#halo)" />
    <ellipse cx="8" cy="8" rx="5.4" ry="5.4" fill="${c.dark}" opacity="0.4" filter="url(#halo)" />`;
}

function routerGlyph(c: TonePalette): string {
  return `
    <rect x="2" y="9" width="12" height="5" fill="${c.body}" stroke="${c.dark}" stroke-width="0.6" filter="url(#glow)" />
    <rect x="5" y="4" width="1.6" height="5" fill="${c.accent}" />
    <rect x="9.4" y="4" width="1.6" height="5" fill="${c.accent}" />
    <rect x="4.4" y="2.4" width="2.8" height="1.6" fill="${c.glow}" />
    <rect x="8.8" y="2.4" width="2.8" height="1.6" fill="${c.glow}" />
    <rect x="4" y="11.4" width="1.6" height="1.6" fill="${c.glow}" />
    <rect x="7.2" y="11.4" width="1.6" height="1.6" fill="${c.accent}" />
    <rect x="10.4" y="11.4" width="1.6" height="1.6" fill="${c.glow}" />
  `;
}

function pcGlyph(c: TonePalette): string {
  return `
    <rect x="2" y="2" width="12" height="8" fill="${c.body}" stroke="${c.dark}" stroke-width="0.6" filter="url(#glow)" />
    <rect x="3.2" y="3.2" width="9.6" height="5.6" fill="${c.dark}" />
    <rect x="4" y="4" width="6" height="1.2" fill="${c.glow}" />
    <rect x="4" y="5.6" width="4" height="1" fill="${c.accent}" />
    <rect x="6" y="10" width="4" height="1.6" fill="${c.body}" />
    <rect x="4" y="11.6" width="8" height="1.2" fill="${c.body}" stroke="${c.dark}" stroke-width="0.4" />
  `;
}

function serverGlyph(c: TonePalette): string {
  return `
    <rect x="3" y="1" width="10" height="14" fill="${c.body}" stroke="${c.dark}" stroke-width="0.6" filter="url(#glow)" />
    <rect x="4.2" y="2.6" width="7.6" height="1.4" fill="${c.dark}" />
    <rect x="4.8" y="3.1" width="1.2" height="0.6" fill="${c.glow}" />
    <rect x="4.2" y="5.4" width="7.6" height="1.4" fill="${c.dark}" />
    <rect x="4.8" y="5.9" width="1.2" height="0.6" fill="${c.accent}" />
    <rect x="4.2" y="8.2" width="7.6" height="1.4" fill="${c.dark}" />
    <rect x="4.8" y="8.7" width="1.2" height="0.6" fill="${c.glow}" />
    <rect x="4.2" y="11" width="7.6" height="3" fill="${c.dark}" />
    <rect x="5" y="11.8" width="6" height="0.8" fill="${c.accent}" />
  `;
}

const glyphByRole: Record<DeviceRole, (c: TonePalette) => string> = {
  router: routerGlyph,
  pc: pcGlyph,
  server: serverGlyph,
};

const iconCache = new Map<string, string>();

export function buildDeviceIcon(role: DeviceRole, tone: DeviceTone): string {
  const cacheKey = `${role}:${tone}`;
  const cached = iconCache.get(cacheKey);
  if (cached) return cached;

  const palette = TONE_COLORS[tone];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="32" height="32" shape-rendering="crispEdges"><defs>${GLOW_DEFS}</defs>${haloGlow(palette)}${glyphByRole[role](palette)}</svg>`;
  const uri = svgToDataUri(svg);
  iconCache.set(cacheKey, uri);
  return uri;
}

