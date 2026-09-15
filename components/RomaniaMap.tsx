'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { getPathEdgeIds, routeEdges } from '../lib/routePath';
import type { SearchTraceStep } from '../lib/searchApi';
import { romaniaMapCityPositions } from '../lib/romaniaMapCityPositions';
import {
  buildDeviceIcon,
  pixelFont,
  type DeviceRole,
  type DeviceTone,
} from '../lib/pixelNetworkTheme';

type RomaniaMapProps = {
  start?: string;
  goal?: string;
  step?: SearchTraceStep;
  // Extra manual multiplier on top of the automatic container-based scaling
  // below (see computeSizeMetrics) — use it to nudge one particular instance
  // smaller/larger without touching the base tuning. Defaults to 1 (no-op).
  scale?: number;
};

// ─── Animation timing ────────────────────────────────────────────────────
// All comfortably inside the default 800ms step cadence, so one step's
// effects resolve before the next begins and the screen never accumulates
// overlapping leftovers.
const PROBE_DURATION_MS = 420; // one probe crossing one cable
const PROBE_TAIL_FRACTION = 0.34; // tail length as a fraction of the cable
const TRANSMIT_RING_MS = 460; // bloom on the router that transmitted
const ARRIVE_RING_MS = 340; // snap-in on a router a probe reached
const ARRIVE_RING_DELAY_MS = PROBE_DURATION_MS * 0.86; // fires as the probe lands
const DELIVERY_STREAM_MS = 26; // ms per px of dash travel on the final route
const EFFECT_GC_MS = 1200; // drop spent effects after this long

// --- Proportional sizing -----------------------------------------------
// Icon/label/edge sizes are NOT fixed pixel constants — they're computed
// every time this map's container is (re)measured, as a fraction of the
// container's own width. BASE_* below are the sizes that looked right on
// the full-viewport city-picker map (app/page.tsx), tuned against
// REFERENCE_WIDTH; a smaller card (like the BFS/A* panels on page2) gets a
// proportionally smaller — but never illegibly small, thanks to the floors
// in computeSizeMetrics — version of the same map instead of the exact same
// pixel sizes squeezed into less space.
const REFERENCE_WIDTH = 1536;
const MIN_AUTO_SCALE = 0.28;
const MAX_AUTO_SCALE = 1;

const BASE_ROUTER_ICON_SIZE = 23;
const BASE_DEVICE_ICON_SIZE = 26;
const BASE_EDGE_WIDTH_IDLE = 1.5;
const BASE_EDGE_WIDTH_PATH = 3;
const BASE_EDGE_SHADOW_SIZE_IDLE = 5;
const BASE_EDGE_SHADOW_SIZE_PATH = 10;
const BASE_EDGE_FONT_SIZE = 9;
const BASE_CITY_LABEL_FONT_SIZE = 9;
const BASE_CITY_LABEL_OFFSET_Y = 16;
const BASE_CITY_LABEL_STROKE_WIDTH = 2;
const BASE_CITY_LABEL_SHADOW_BLUR = 4;
const BASE_CITY_LABEL_SHADOW_OFFSET_Y = 1.5;
const BASE_CITY_LABEL_PILL_PAD_X = 3;
const BASE_CITY_LABEL_PILL_PAD_Y = 2.5;
const BASE_CITY_LABEL_PILL_RADIUS = 4;

const CITY_LABEL_COLOR = '#eafbff';
const CITY_LABEL_IDLE_DIM_COLOR = '#64748b';
const CITY_LABEL_STROKE_COLOR = '#0a1628';
const CITY_LABEL_SHADOW_COLOR = 'rgba(0,0,0,0.6)';
const CITY_LABEL_PILL_COLOR = 'rgba(8,16,28,0.55)';

const activePathColor = '#22d3ee';
const idleEdgeColor = '#a5f3fc';
const hoverEdgeColor = '#67e8f9';
const edgeShadowColor = 'rgba(0,0,0,0.65)';

type SizeMetrics = {
  routerIconSize: number;
  deviceIconSize: number;
  edgeWidthIdle: number;
  edgeWidthPath: number;
  edgeShadowSizeIdle: number;
  edgeShadowSizePath: number;
  edgeFontSize: number;
  labelFontSize: number;
  labelOffsetY: number;
  labelStrokeWidth: number;
  labelShadowBlur: number;
  labelShadowOffsetY: number;
  labelPillPadX: number;
  labelPillPadY: number;
  labelPillRadius: number;
};

const DEFAULT_METRICS: SizeMetrics = {
  routerIconSize: BASE_ROUTER_ICON_SIZE,
  deviceIconSize: BASE_DEVICE_ICON_SIZE,
  edgeWidthIdle: BASE_EDGE_WIDTH_IDLE,
  edgeWidthPath: BASE_EDGE_WIDTH_PATH,
  edgeShadowSizeIdle: BASE_EDGE_SHADOW_SIZE_IDLE,
  edgeShadowSizePath: BASE_EDGE_SHADOW_SIZE_PATH,
  edgeFontSize: BASE_EDGE_FONT_SIZE,
  labelFontSize: BASE_CITY_LABEL_FONT_SIZE,
  labelOffsetY: BASE_CITY_LABEL_OFFSET_Y,
  labelStrokeWidth: BASE_CITY_LABEL_STROKE_WIDTH,
  labelShadowBlur: BASE_CITY_LABEL_SHADOW_BLUR,
  labelShadowOffsetY: BASE_CITY_LABEL_SHADOW_OFFSET_Y,
  labelPillPadX: BASE_CITY_LABEL_PILL_PAD_X,
  labelPillPadY: BASE_CITY_LABEL_PILL_PAD_Y,
  labelPillRadius: BASE_CITY_LABEL_PILL_RADIUS,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

// containerWidth drives the scale (not min-dimension) because these panels
// are always wider than tall, so width is the more stable signal — height
// swings a lot more with sidebar/window layout.
function computeSizeMetrics(containerWidth: number, manualScale: number): SizeMetrics {
  const autoScale = clamp(containerWidth / REFERENCE_WIDTH, MIN_AUTO_SCALE, MAX_AUTO_SCALE);
  const s = autoScale * (Number.isFinite(manualScale) && manualScale > 0 ? manualScale : 1);
  const scaled = (base: number, floor: number) => Math.max(base * s, floor);

  return {
    routerIconSize: scaled(BASE_ROUTER_ICON_SIZE, 12),
    deviceIconSize: scaled(BASE_DEVICE_ICON_SIZE, 14),
    edgeWidthIdle: scaled(BASE_EDGE_WIDTH_IDLE, 1),
    edgeWidthPath: scaled(BASE_EDGE_WIDTH_PATH, 2),
    edgeShadowSizeIdle: scaled(BASE_EDGE_SHADOW_SIZE_IDLE, 3),
    edgeShadowSizePath: scaled(BASE_EDGE_SHADOW_SIZE_PATH, 6),
    edgeFontSize: scaled(BASE_EDGE_FONT_SIZE, 6),
    labelFontSize: scaled(BASE_CITY_LABEL_FONT_SIZE, 7),
    labelOffsetY: scaled(BASE_CITY_LABEL_OFFSET_Y, 9),
    labelStrokeWidth: scaled(BASE_CITY_LABEL_STROKE_WIDTH, 1),
    labelShadowBlur: scaled(BASE_CITY_LABEL_SHADOW_BLUR, 1.5),
    labelShadowOffsetY: scaled(BASE_CITY_LABEL_SHADOW_OFFSET_Y, 0.75),
    labelPillPadX: scaled(BASE_CITY_LABEL_PILL_PAD_X, 1.5),
    labelPillPadY: scaled(BASE_CITY_LABEL_PILL_PAD_Y, 1),
    labelPillRadius: scaled(BASE_CITY_LABEL_PILL_RADIUS, 2.5),
  };
}

function iconSizeForRole(role: DeviceRole, metrics: SizeMetrics) {
  return role === 'router' ? metrics.routerIconSize : metrics.deviceIconSize;
}

// vis-network's 'image' node shape throws synchronously inside `new Network(...)`
// if a node is created without an `image` (Error: "Option image must be defined
// for node type 'image'"), which aborts the whole network before anything can
// render. So every node — including the very first DataSet we hand to the
// constructor — must already carry a resolved icon; this is shared by both the
// initial creation and every later per-step update.
function computeNodeStates(
  start: string | undefined,
  goal: string | undefined,
  step: SearchTraceStep | undefined,
  metrics: SizeMetrics,
) {
  const explored = new Set(step?.explored ?? []);
  const frontier = new Set(step?.frontier ?? []);
  const current = step?.currentNode ?? null;

  return romaniaMapCityPositions.map((node) => {
    let role: DeviceRole = 'router';
    let tone: DeviceTone = 'idle';

    if (explored.has(node.id)) tone = 'explored';
    if (frontier.has(node.id)) tone = 'frontier';
    if (node.id === current) tone = 'current';
    if (node.id === start) { role = 'pc'; tone = 'start'; }
    if (node.id === goal) { role = 'server'; tone = 'goal'; }

    return {
      id: node.id,
      role,
      tone,
      image: buildDeviceIcon(role, tone),
      size: iconSizeForRole(role, metrics),
    };
  });
}

// Draws every city name by hand (dark solid outline + soft shadow baked into
// the same stroke pass, topped with a crisp light cyan-white fill, over a
// small rounded dark chip) instead of relying on vis-network's built-in label
// renderer, which only supports one flat text-stroke. Idle router names dim
// to a muted tone so a node currently on the frontier/explored/path/PC/server
// reads as the standout text on the map. All sizing comes from `metrics` so
// it scales with the container instead of staying fixed.
function drawCityLabels(
  ctx: CanvasRenderingContext2D,
  positions: Map<string, { x: number; y: number }>,
  toneById: Map<string, DeviceTone>,
  metrics: SizeMetrics,
) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.font = `${metrics.labelFontSize}px ${pixelFont.style.fontFamily}`;

  for (const node of romaniaMapCityPositions) {
    const pos = positions.get(node.id);
    if (!pos) continue;

    const tone = toneById.get(node.id) ?? 'idle';
    const fillColor = tone === 'idle' ? CITY_LABEL_IDLE_DIM_COLOR : CITY_LABEL_COLOR;

    const labelY = pos.y + metrics.labelOffsetY;
    const textWidth = ctx.measureText(node.label).width;
    const pillW = textWidth + metrics.labelPillPadX * 2;
    const pillH = metrics.labelFontSize + metrics.labelPillPadY * 2;
    const pillX = pos.x - pillW / 2;
    const pillY = labelY - metrics.labelPillPadY;

    const roundRect = (ctx as unknown as { roundRect?: (x: number, y: number, w: number, h: number, r: number) => void }).roundRect;
    ctx.beginPath();
    if (typeof roundRect === 'function') {
      roundRect.call(ctx, pillX, pillY, pillW, pillH, metrics.labelPillRadius);
    } else {
      ctx.rect(pillX, pillY, pillW, pillH);
    }
    ctx.fillStyle = CITY_LABEL_PILL_COLOR;
    ctx.fill();

    ctx.shadowColor = CITY_LABEL_SHADOW_COLOR;
    ctx.shadowBlur = metrics.labelShadowBlur;
    ctx.shadowOffsetY = metrics.labelShadowOffsetY;
    ctx.lineWidth = metrics.labelStrokeWidth;
    ctx.strokeStyle = CITY_LABEL_STROKE_COLOR;
    ctx.strokeText(node.label, pos.x, labelY);

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = fillColor;
    ctx.fillText(node.label, pos.x, labelY);
  }

  ctx.restore();
}

// ─── Propagation effects ─────────────────────────────────────────────────
//
// The animation models what a router mesh actually does: a router that gets
// examined TRANSMITS down every cable it owns, and the routers on the far
// end light up as those probes land. Nothing travels across the map as a
// single object, so nothing can ever appear to teleport — a probe's entire
// existence is one cable, and several fire at once, which is what makes a
// breadth-first sweep look like a broadcast instead of a wandering dot.

/** One probe in flight along a single cable. */
type Probe = { fromId: string; toId: string; startedAt: number };
/** A ring drawn on a router: it either transmitted, or a probe just landed. */
type Flash = { nodeId: string; startedAt: number; kind: 'transmit' | 'arrive' };
type Point = { x: number; y: number };

function lerpPoint(from: Point, to: Point, t: number): Point {
  return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
}

/**
 * Probes: a bright head with a gradient tail streaking down the cable.
 *
 * Every probe runs for the same duration regardless of how long its cable
 * is, so a whole fan of them launched together also lands together — that
 * synchronisation is what sells "one hop outward" as a single beat of the
 * search rather than a scatter of unrelated movement.
 */
function drawProbes(
  ctx: CanvasRenderingContext2D,
  probes: Probe[],
  positions: Map<string, Point>,
  now: number,
  metrics: SizeMetrics,
) {
  ctx.save();
  ctx.lineCap = 'round';

  for (const probe of probes) {
    const t = (now - probe.startedAt) / PROBE_DURATION_MS;
    if (t < 0 || t > 1) continue;

    const from = positions.get(probe.fromId);
    const to = positions.get(probe.toId);
    if (!from || !to) continue;

    // Decelerate into the far router so the arrival reads as an impact.
    const eased = 1 - (1 - t) ** 3;
    const head = lerpPoint(from, to, eased);
    const tail = lerpPoint(from, to, Math.max(0, eased - PROBE_TAIL_FRACTION));
    // Fade the last sliver of the flight so the probe dissolves into the
    // arrival ring instead of stopping dead.
    const fade = t > 0.82 ? Math.max(0, (1 - t) / 0.18) : 1;

    const gradient = ctx.createLinearGradient(tail.x, tail.y, head.x, head.y);
    gradient.addColorStop(0, 'rgba(34,211,238,0)');
    gradient.addColorStop(0.55, `rgba(103,232,249,${0.55 * fade})`);
    gradient.addColorStop(1, `rgba(236,254,255,${0.95 * fade})`);

    ctx.strokeStyle = gradient;
    ctx.lineWidth = Math.max(1.5, metrics.edgeWidthPath * 1.15);
    ctx.shadowColor = `rgba(34,211,238,${0.9 * fade})`;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(tail.x, tail.y);
    ctx.lineTo(head.x, head.y);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Rings on routers. `transmit` blooms outward from the router doing the
 * sending; `arrive` snaps inward as a probe lands, so the two read as cause
 * and effect rather than as the same generic sparkle.
 */
function drawFlashes(
  ctx: CanvasRenderingContext2D,
  flashes: Flash[],
  positions: Map<string, Point>,
  now: number,
  metrics: SizeMetrics,
) {
  ctx.save();

  for (const flash of flashes) {
    const lifetime = flash.kind === 'transmit' ? TRANSMIT_RING_MS : ARRIVE_RING_MS;
    const t = (now - flash.startedAt) / lifetime;
    if (t < 0 || t > 1) continue;

    const pos = positions.get(flash.nodeId);
    if (!pos) continue;

    const fade = (1 - t) ** 2;
    const base = metrics.deviceIconSize * 0.5;
    const radius =
      flash.kind === 'transmit'
        ? base * (0.75 + t * 1.6) // bloom outward
        : base * (1.85 - t * 0.95); // snap inward

    ctx.beginPath();
    ctx.arc(pos.x, pos.y, Math.max(1, radius), 0, Math.PI * 2);
    ctx.strokeStyle =
      flash.kind === 'transmit'
        ? `rgba(103,232,249,${0.7 * fade})`
        : `rgba(236,254,255,${0.85 * fade})`;
    ctx.lineWidth = Math.max(1, 2.2 * fade);
    ctx.shadowColor = `rgba(34,211,238,${0.8 * fade})`;
    ctx.shadowBlur = 12 * fade;
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * The payoff shot: once the goal is reached, the confirmed route carries a
 * continuous stream of traffic from PC to server. Deliberately the ONLY
 * continuously-moving thing on screen, so "delivered" looks different in
 * kind from "still searching", not just brighter.
 */
function drawDeliveryStream(
  ctx: CanvasRenderingContext2D,
  path: string[],
  positions: Map<string, Point>,
  now: number,
  metrics: SizeMetrics,
) {
  if (path.length < 2) return;

  ctx.save();
  ctx.lineCap = 'round';

  const dash = Math.max(6, metrics.deviceIconSize * 0.5);
  const gap = dash * 1.5;

  for (let i = 0; i < path.length - 1; i += 1) {
    const from = positions.get(path[i]);
    const to = positions.get(path[i + 1]);
    if (!from || !to) continue;

    ctx.setLineDash([dash, gap]);
    // Negative offset so the dashes travel PC → server, i.e. the direction
    // the data is actually going.
    ctx.lineDashOffset = -((now / DELIVERY_STREAM_MS) * (dash + gap)) % (dash + gap);
    ctx.strokeStyle = 'rgba(236,254,255,0.95)';
    ctx.shadowColor = 'rgba(34,211,238,0.95)';
    ctx.shadowBlur = 12;
    ctx.lineWidth = Math.max(1.5, metrics.edgeWidthPath);
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  }

  ctx.restore();
}

export default function RomaniaMap({ start, goal, step, scale = 1 }: RomaniaMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<any>(null);
  const nodesDataSetRef = useRef<any>(null);
  const edgesDataSetRef = useRef<any>(null);
  const pathIdsRef = useRef<Set<number>>(new Set());
  const routeKeyRef = useRef<string>('');
  const prevCurrentRef = useRef<string | null>(null);
  // Live propagation effects, appended by applyState() and drawn (then
  // garbage-collected) every frame by the afterDrawing hook.
  const probesRef = useRef<Probe[]>([]);
  const flashesRef = useRef<Flash[]>([]);
  // Which routers the search had already reached as of the previous step —
  // diffed against the new step to find what was just discovered, and hence
  // which cables should light up.
  const knownNodesRef = useRef<Set<string>>(new Set());
  // The confirmed PC → server route, set once the search completes.
  const deliveredPathRef = useRef<string[]>([]);
  // Latest on-screen pixel position / tone / role per city, kept in sync by
  // applyLayout()/applyState() and read every frame by drawCityLabels(), and
  // the latest computed size metrics — also read fresh every frame, so a
  // resize is reflected immediately without waiting on a prop change.
  const nodePixelPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const nodeToneRef = useRef<Map<string, DeviceTone>>(new Map());
  const nodeRoleRef = useRef<Map<string, DeviceRole>>(new Map());
  const metricsRef = useRef<SizeMetrics>(DEFAULT_METRICS);
  const scaleRef = useRef(scale);
  scaleRef.current = scale;

  // Create the network once, then only push incremental DataSet updates.
  // (Recreating vis-network on every step, as before, would also throw away
  // the packet node's position and make hop animation impossible.)
  useEffect(() => {
    let disposed = false;
    let resizeHandler: (() => void) | null = null;
    let resizeObserver: ResizeObserver | null = null;

    async function ensureNetwork() {
      if (networkRef.current || disposed || !containerRef.current) return;

      const { Network, DataSet } = await import('vis-network/standalone');
      try {
        await document.fonts?.ready;
      } catch {
        /* pixel font not ready yet — labels fall back gracefully */
      }
      if (disposed || !containerRef.current) return;

      // Measure once up front so the very first paint already uses
      // container-appropriate sizes instead of flashing full-size icons.
      const initialRect = containerRef.current.getBoundingClientRect();
      metricsRef.current = computeSizeMetrics(initialRect.width || REFERENCE_WIDTH, scaleRef.current);

      const initialNodeStates = computeNodeStates(start, goal, step, metricsRef.current);
      nodeToneRef.current = new Map(initialNodeStates.map((n) => [n.id, n.tone]));
      nodeRoleRef.current = new Map(initialNodeStates.map((n) => [n.id, n.role]));

      // Only the real cities are graph nodes. Packets used to be a hidden
      // dummy node shuffled around with moveNode(); they're pure canvas
      // effects now, which is what lets several exist at once.
      nodesDataSetRef.current = new DataSet(
        // x/y are placeholders — applyLayout() overwrites them with real
        // pixel positions (derived from xPct/yPct) right after the network
        // mounts, once the container's actual size is known.
        initialNodeStates.map(({ tone: _tone, role: _role, ...node }) => ({ ...node, x: 0, y: 0 })),
      );

      edgesDataSetRef.current = new DataSet(
        routeEdges.map((edge) => ({
          ...edge,
          color: { color: idleEdgeColor, highlight: hoverEdgeColor, hover: hoverEdgeColor },
          width: metricsRef.current.edgeWidthIdle,
          shadow: { enabled: true, color: edgeShadowColor, size: metricsRef.current.edgeShadowSizeIdle, x: 0, y: 0 },
        })),
      );

      networkRef.current = new Network(
        containerRef.current,
        { nodes: nodesDataSetRef.current, edges: edgesDataSetRef.current },
        {
          physics: false,
          autoResize: true,
          // Fixed reference map — panning/zooming/node-dragging are disabled
          // so the layout can't get knocked out of place while watching a run.
          interaction: { hover: true, dragView: false, zoomView: false, dragNodes: false, selectable: false },
          nodes: {
            shape: 'image',
            shapeProperties: { interpolation: false },
            // No node font here — city names are hand-drawn (see drawCityLabels).
          },
          edges: {
            smooth: false,
            font: {
              align: 'top',
              size: metricsRef.current.edgeFontSize,
              color: '#a5f3fc',
              face: pixelFont.style.fontFamily,
              strokeWidth: 2,
              strokeColor: '#020617',
            },
          },
        },
      );

      // Pin the view 1:1 to real screen pixels instead of vis-network's
      // auto-fit zoom, and (re)compute the proportional size metrics from
      // the container's current width. Runs on mount and on every resize —
      // it only touches things that don't depend on start/goal/step (which
      // could otherwise go stale in this closure), so per-step state is
      // refreshed separately by applyState().
      const applyLayout = () => {
        if (!containerRef.current || !networkRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        const metrics = computeSizeMetrics(rect.width, scaleRef.current);
        metricsRef.current = metrics;

        const positions = romaniaMapCityPositions.map((n) => ({
          id: n.id,
          x: (n.xPct / 100) * rect.width,
          y: (n.yPct / 100) * rect.height,
          size: iconSizeForRole(nodeRoleRef.current.get(n.id) ?? 'router', metrics),
        }));
        nodesDataSetRef.current.update(positions);
        nodePixelPositionsRef.current = new Map(positions.map((p) => [p.id, { x: p.x, y: p.y }]));

        if (edgesDataSetRef.current) {
          edgesDataSetRef.current.update(
            routeEdges.map((edge) => {
              const onPath = pathIdsRef.current.has(edge.id);
              return {
                id: edge.id,
                width: onPath ? metrics.edgeWidthPath : metrics.edgeWidthIdle,
                shadow: onPath
                  ? { enabled: true, color: 'rgba(34,211,238,0.6)', size: metrics.edgeShadowSizePath, x: 0, y: 0 }
                  : { enabled: true, color: edgeShadowColor, size: metrics.edgeShadowSizeIdle, x: 0, y: 0 },
              };
            }),
          );
        }

        networkRef.current.setOptions({ edges: { font: { size: metrics.edgeFontSize } } });
        networkRef.current.moveTo({ position: { x: rect.width / 2, y: rect.height / 2 }, scale: 1 });
        networkRef.current.redraw();
      };

      applyLayout();
      // One more pass on the next frame — a defensive safety net in case the
      // very first getBoundingClientRect() above landed a frame before the
      // flex layout (header + two equal-height cards) finished settling,
      // which would otherwise leave the map sized to a too-small rect until
      // the next resize/observer event.
      requestAnimationFrame(applyLayout);

      resizeHandler = applyLayout;
      window.addEventListener('resize', resizeHandler);
      // The panel can also resize from layout reflow alone (no window
      // resize event), so watch its own box too.
      resizeObserver = new ResizeObserver(applyLayout);
      resizeObserver.observe(containerRef.current);

      // Everything above vis-network's own node/edge pass is hand-drawn
      // here, in deliberate depth order: delivery stream (lowest, it's a
      // steady background state) → probes → router rings → city names on
      // top, so text never gets washed out by an effect passing under it.
      networkRef.current.on('afterDrawing', (ctx: CanvasRenderingContext2D) => {
        if (!networkRef.current) return;
        const time = performance.now();
        const positions = nodePixelPositionsRef.current;
        const metrics = metricsRef.current;

        drawDeliveryStream(ctx, deliveredPathRef.current, positions, time, metrics);

        probesRef.current = probesRef.current.filter((probe) => time - probe.startedAt <= EFFECT_GC_MS);
        drawProbes(ctx, probesRef.current, positions, time, metrics);

        flashesRef.current = flashesRef.current.filter((flash) => time - flash.startedAt <= EFFECT_GC_MS);
        drawFlashes(ctx, flashesRef.current, positions, time, metrics);

        drawCityLabels(ctx, positions, nodeToneRef.current, metrics);
      });
    }

    function applyState() {
      if (!nodesDataSetRef.current || !edgesDataSetRef.current || !networkRef.current) return;

      const routeKey = `${start ?? ''}|${goal ?? ''}`;
      if (routeKey !== routeKeyRef.current) {
        routeKeyRef.current = routeKey;
        prevCurrentRef.current = null;
        knownNodesRef.current = new Set();
        probesRef.current = [];
        flashesRef.current = [];
        deliveredPathRef.current = [];
      }

      const current = step?.currentNode ?? null;
      const visiblePath = step?.done && step.finalPath.length > 0 ? step.finalPath : step?.path ?? [];
      pathIdsRef.current = new Set(getPathEdgeIds(visiblePath));

      const metrics = metricsRef.current;
      const nodeStates = computeNodeStates(start, goal, step, metrics);
      nodeToneRef.current = new Map(nodeStates.map((n) => [n.id, n.tone]));
      nodeRoleRef.current = new Map(nodeStates.map((n) => [n.id, n.role]));
      nodesDataSetRef.current.update(nodeStates.map(({ tone: _tone, role: _role, ...node }) => node));

      edgesDataSetRef.current.update(
        routeEdges.map((edge) => {
          const onPath = pathIdsRef.current.has(edge.id);
          return {
            id: edge.id,
            width: onPath ? metrics.edgeWidthPath : metrics.edgeWidthIdle,
            color: { color: onPath ? activePathColor : idleEdgeColor, highlight: hoverEdgeColor, hover: hoverEdgeColor },
            shadow: onPath
              ? { enabled: true, color: 'rgba(34,211,238,0.6)', size: metrics.edgeShadowSizePath, x: 0, y: 0 }
              : { enabled: true, color: edgeShadowColor, size: metrics.edgeShadowSizeIdle, x: 0, y: 0 },
          };
        }),
      );

      // ── Emit this step's propagation ──────────────────────────────────
      // The router being expanded transmits down each cable that leads
      // somewhere the search hadn't reached before; those cables carry a
      // probe, and each far end flashes as its probe lands. Each probe
      // crosses exactly one cable, so nothing can ever cut across the map.
      const known = new Set<string>([...(step?.explored ?? []), ...(step?.frontier ?? [])]);
      const advancedOneStep = current !== null && current !== prevCurrentRef.current;

      if (advancedOneStep) {
        const now = performance.now();
        const newlyReached = [...known].filter((id) => !knownNodesRef.current.has(id));
        const cables = routeEdges.filter(
          (edge) =>
            (edge.from === current && newlyReached.includes(edge.to)) ||
            (edge.to === current && newlyReached.includes(edge.from)),
        );

        if (cables.length > 0) {
          flashesRef.current.push({ nodeId: current, startedAt: now, kind: 'transmit' });

          for (const cable of cables) {
            const target = cable.from === current ? cable.to : cable.from;
            probesRef.current.push({ fromId: current, toId: target, startedAt: now });
            flashesRef.current.push({
              nodeId: target,
              startedAt: now + ARRIVE_RING_DELAY_MS,
              kind: 'arrive',
            });
          }
        } else {
          // A dead end, or the goal itself: the router still answers, it
          // just has nothing new to forward to.
          flashesRef.current.push({ nodeId: current, startedAt: now, kind: 'arrive' });
        }
      }

      // Scrubbing backwards (or jumping) shrinks the known set — drop any
      // effects mid-flight so the map snaps cleanly to the scrubbed-to state
      // instead of finishing animations for a step that's no longer showing.
      if (known.size < knownNodesRef.current.size) {
        probesRef.current = [];
        flashesRef.current = [];
      }

      knownNodesRef.current = known;
      deliveredPathRef.current = step?.done ? step.finalPath : [];
      if (current) prevCurrentRef.current = current;
    }

    ensureNetwork().then(() => {
      if (!disposed) applyState();
    });

    return () => {
      disposed = true;
      if (resizeHandler) window.removeEventListener('resize', resizeHandler);
      resizeObserver?.disconnect();
    };
  }, [start, goal, step]);

  // Every effect is drawn in the afterDrawing hook, so this loop is the
  // animation's clock. It runs at full frame rate while anything is moving —
  // probes and rings need it to look smooth — and idles at ~12fps when the
  // map is static, rather than burning a redraw every frame on a still image.
  useEffect(() => {
    let rafId = 0;
    let lastTime = 0;

    const loop = (time: number) => {
      const busy =
        probesRef.current.length > 0 ||
        flashesRef.current.length > 0 ||
        deliveredPathRef.current.length > 0;

      if (busy || time - lastTime > 80) {
        networkRef.current?.redraw();
        lastTime = time;
      }
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, []);

  useEffect(() => {
    return () => {
      networkRef.current?.destroy();
      networkRef.current = null;
    };
  }, []);

  return (
    <div
      className={`relative h-full w-full overflow-hidden rounded-xl border border-cyan-500/30 bg-[#060a13] shadow-[0_0_25px_rgba(34,211,238,0.15)] ${pixelFont.className}`}
    >
      {/* Same background photo as the city-picker map, pinned to this panel's
          own box instead of the full viewport — see applyLayout() above. */}
      <Image
        src="/images/romania-fantasy-map.png"
        alt=""
        aria-hidden
        fill
        priority
        sizes="(max-width: 1200px) 100vw, 900px"
        style={{ objectFit: 'cover', zIndex: 0 }}
      />
      <div ref={containerRef} className="vis-fill relative h-full w-full" style={{ zIndex: 1 }} />
    </div>
  );
}
