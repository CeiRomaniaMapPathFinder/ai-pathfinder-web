'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { getPathEdgeIds, routeEdges, type SearchTraceStep } from '../lib/routePath';
import { cityPositions } from '../lib/cityPositions';
import {
  buildDeviceIcon,
  buildPacketIcon,
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

const PACKET_ID = '__packet__';
const HOP_DURATION_MS = 420;

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
const BASE_PACKET_ICON_SIZE = 10;
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
  packetIconSize: number;
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
  packetIconSize: BASE_PACKET_ICON_SIZE,
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
    packetIconSize: scaled(BASE_PACKET_ICON_SIZE, 6),
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

  return cityPositions.map((node) => {
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

  for (const node of cityPositions) {
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

// Animates the small cyan "packet" node hopping from one router to the next,
// visualizing the search algorithm probing a new node. Runs on top of the
// persistent vis-network instance via the public moveNode()/getPositions() API.
function animateHop(network: any, nodesDataSet: any, fromId: string, toId: string) {
  const positions = network.getPositions([fromId, toId]);
  const from = positions[fromId];
  const to = positions[toId];
  if (!from || !to) return () => {};

  let rafId = 0;
  let cancelled = false;
  const started = performance.now();

  nodesDataSet.update({ id: PACKET_ID, hidden: false });
  network.moveNode(PACKET_ID, from.x, from.y);

  const tick = (now: number) => {
    if (cancelled) return;
    const t = Math.min(1, (now - started) / HOP_DURATION_MS);
    const eased = t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2;
    network.moveNode(PACKET_ID, from.x + (to.x - from.x) * eased, from.y + (to.y - from.y) * eased);

    if (t < 1) {
      rafId = requestAnimationFrame(tick);
    } else {
      nodesDataSet.update({ id: PACKET_ID, hidden: true });
    }
  };

  rafId = requestAnimationFrame(tick);

  return () => {
    cancelled = true;
    if (rafId) cancelAnimationFrame(rafId);
    nodesDataSet.update({ id: PACKET_ID, hidden: true });
  };
}

export default function RomaniaMap({ start, goal, step, scale = 1 }: RomaniaMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<any>(null);
  const nodesDataSetRef = useRef<any>(null);
  const edgesDataSetRef = useRef<any>(null);
  const pathIdsRef = useRef<Set<number>>(new Set());
  const routeKeyRef = useRef<string>('');
  const prevCurrentRef = useRef<string | null>(null);
  const cancelHopRef = useRef<() => void>(() => {});
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

      nodesDataSetRef.current = new DataSet([
        // x/y are placeholders — applyLayout() overwrites them with real
        // pixel positions (derived from xPct/yPct) right after the network
        // mounts, once the container's actual size is known.
        ...initialNodeStates.map(({ tone: _tone, role: _role, ...node }) => ({ ...node, x: 0, y: 0 })),
        {
          id: PACKET_ID,
          x: 0,
          y: 0,
          label: '',
          hidden: true,
          shape: 'image',
          image: buildPacketIcon(),
          size: metricsRef.current.packetIconSize,
          shapeProperties: { interpolation: false },
        },
      ]);

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

        const positions = cityPositions.map((n) => ({
          id: n.id,
          x: (n.xPct / 100) * rect.width,
          y: (n.yPct / 100) * rect.height,
          size: iconSizeForRole(nodeRoleRef.current.get(n.id) ?? 'router', metrics),
        }));
        nodesDataSetRef.current.update(positions);
        nodePixelPositionsRef.current = new Map(positions.map((p) => [p.id, { x: p.x, y: p.y }]));
        nodesDataSetRef.current.update({ id: PACKET_ID, size: metrics.packetIconSize });

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

      // Extra hand-drawn glowing "data flow" dashes on top of the currently
      // discovered path (vis-network's built-in dashed edges are static),
      // plus the hand-drawn city name labels, on top so text stays crisp.
      networkRef.current.on('afterDrawing', (ctx: CanvasRenderingContext2D) => {
        if (!networkRef.current) return;
        const positions = networkRef.current.getPositions();
        const time = performance.now();

        ctx.save();
        ctx.lineCap = 'round';
        for (const edge of routeEdges) {
          if (!pathIdsRef.current.has(edge.id)) continue;
          const a = positions[edge.from];
          const b = positions[edge.to];
          if (!a || !b) continue;

          ctx.setLineDash([9, 7]);
          ctx.lineDashOffset = -((time / 45) % 16);
          ctx.strokeStyle = 'rgba(103,232,249,0.95)';
          ctx.shadowColor = 'rgba(34,211,238,0.9)';
          ctx.shadowBlur = 9;
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
        ctx.restore();

        drawCityLabels(ctx, nodePixelPositionsRef.current, nodeToneRef.current, metricsRef.current);
      });
    }

    function applyState() {
      if (!nodesDataSetRef.current || !edgesDataSetRef.current || !networkRef.current) return;

      const routeKey = `${start ?? ''}|${goal ?? ''}`;
      if (routeKey !== routeKeyRef.current) {
        routeKeyRef.current = routeKey;
        prevCurrentRef.current = null;
        cancelHopRef.current();
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

      if (current && prevCurrentRef.current && prevCurrentRef.current !== current) {
        cancelHopRef.current();
        cancelHopRef.current = animateHop(networkRef.current, nodesDataSetRef.current, prevCurrentRef.current, current);
      }
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

  // Ambient redraw loop so the flowing-dash "data transfer" overlay keeps
  // animating even while the algorithm is paused on a single step.
  useEffect(() => {
    let rafId = 0;
    let lastTime = 0;

    const loop = (time: number) => {
      if (time - lastTime > 40) {
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
      cancelHopRef.current();
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
