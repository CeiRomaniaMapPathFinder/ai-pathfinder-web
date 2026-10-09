'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { getPathEdgeIds, routeEdges } from '../lib/routePath';
import type { SearchTraceStep } from '../lib/searchApi';
import { cityPositions } from '../lib/cityPositions';
import { computeMapBox, mapEdgeFadeStyle, projectCity, sameMapBox, type MapBox } from '../lib/mapProjection';
import {
  buildDeviceIcon,
  pixelFont,
  type DeviceRole,
  type DeviceTone,
} from '../lib/pixelNetworkTheme';
import type {
  DataSet,
  Edge as VisEdge,
  Network,
  Node as VisNode,
} from 'vis-network/standalone';

type RomaniaMapProps = {
  start?: string;
  goal?: string;
  step?: SearchTraceStep;
  scale?: number;
};

const PROBE_DURATION_MS = 420;
const PROBE_TAIL_FRACTION = 0.34;
const TRANSMIT_RING_MS = 460;
const ARRIVE_RING_MS = 340;
const ARRIVE_RING_DELAY_MS = PROBE_DURATION_MS * 0.86;
const DELIVERY_STREAM_MS = 26;
const EFFECT_GC_MS = 1200;

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

function computeSizeMetrics(mapWidth: number, manualScale: number): SizeMetrics {
  const autoScale = clamp(mapWidth / REFERENCE_WIDTH, MIN_AUTO_SCALE, MAX_AUTO_SCALE);
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

function computeMapBoxForPanel(width: number, height: number, metrics: SizeMetrics) {
  const side = metrics.labelFontSize * 5 + metrics.labelPillPadX;
  const pad = {
    left: side,
    right: side,
    top: metrics.deviceIconSize / 2 + 2,
    bottom: metrics.labelOffsetY + metrics.labelFontSize + metrics.labelPillPadY * 2,
  };
  return computeMapBox(width, height, cityPositions, { left: 0, top: 0, right: width, bottom: height }, pad);
}

function iconSizeForRole(role: DeviceRole, metrics: SizeMetrics) {
  return role === 'router' ? metrics.routerIconSize : metrics.deviceIconSize;
}

// vis-network throws if an 'image' node has no image, so every node needs its icon up front.
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

type Probe = { fromId: string; toId: string; startedAt: number };
type Flash = { nodeId: string; startedAt: number; kind: 'transmit' | 'arrive' };
type Point = { x: number; y: number };

function lerpPoint(from: Point, to: Point, t: number): Point {
  return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
}

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

    const eased = 1 - (1 - t) ** 3;
    const head = lerpPoint(from, to, eased);
    const tail = lerpPoint(from, to, Math.max(0, eased - PROBE_TAIL_FRACTION));
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
        ? base * (0.75 + t * 1.6)
        : base * (1.85 - t * 0.95);

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
  const [mapBox, setMapBox] = useState<MapBox | null>(null);
  const networkRef = useRef<Network | null>(null);
  const nodesDataSetRef = useRef<DataSet<VisNode> | null>(null);
  const edgesDataSetRef = useRef<DataSet<VisEdge> | null>(null);
  const pathIdsRef = useRef<Set<number>>(new Set());
  const routeKeyRef = useRef<string>('');
  const prevCurrentRef = useRef<string | null>(null);
  const probesRef = useRef<Probe[]>([]);
  const flashesRef = useRef<Flash[]>([]);
  const knownNodesRef = useRef<Set<string>>(new Set());
  const deliveredPathRef = useRef<string[]>([]);
  const nodePixelPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const nodeToneRef = useRef<Map<string, DeviceTone>>(new Map());
  const nodeRoleRef = useRef<Map<string, DeviceRole>>(new Map());
  const metricsRef = useRef<SizeMetrics>(DEFAULT_METRICS);
  const scaleRef = useRef(scale);
  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

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
        /* pixel font not ready yet */
      }
      if (disposed || !containerRef.current) return;

      const initialRect = containerRef.current.getBoundingClientRect();
      metricsRef.current = computeSizeMetrics(initialRect.width || REFERENCE_WIDTH, scaleRef.current);

      const initialNodeStates = computeNodeStates(start, goal, step, metricsRef.current);
      nodeToneRef.current = new Map(initialNodeStates.map((n) => [n.id, n.tone]));
      nodeRoleRef.current = new Map(initialNodeStates.map((n) => [n.id, n.role]));

      nodesDataSetRef.current = new DataSet(
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
          interaction: { hover: true, dragView: false, zoomView: false, dragNodes: false, selectable: false },
          nodes: {
            shape: 'image',
            shapeProperties: { interpolation: false },
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

      const applyLayout = () => {
        if (!containerRef.current || !networkRef.current) return;
        const nodesDataSet = nodesDataSetRef.current;
        if (!nodesDataSet) return;
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        const box = computeMapBoxForPanel(rect.width, rect.height, computeSizeMetrics(rect.width, scaleRef.current));
        setMapBox((prev) => (sameMapBox(prev, box) ? prev : box));
        const metrics = computeSizeMetrics(box.width, scaleRef.current);
        metricsRef.current = metrics;

        const positions = cityPositions.map((n) => ({
          id: n.id,
          ...projectCity(n, box),
          size: iconSizeForRole(nodeRoleRef.current.get(n.id) ?? 'router', metrics),
        }));
        nodesDataSet.update(positions);
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
      requestAnimationFrame(applyLayout);

      resizeHandler = applyLayout;
      window.addEventListener('resize', resizeHandler);
      resizeObserver = new ResizeObserver(applyLayout);
      resizeObserver.observe(containerRef.current);

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
          flashesRef.current.push({ nodeId: current, startedAt: now, kind: 'arrive' });
        }
      }

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
      <div
        className="pointer-events-none absolute"
        style={{
          zIndex: 0,
          ...(mapBox
            ? { left: mapBox.left, top: mapBox.top, width: mapBox.width, height: mapBox.height, ...mapEdgeFadeStyle(mapBox) }
            : { inset: 0 }),
        }}
      >
        <Image
          src="/images/romania-fantasy-map.png"
          alt=""
          aria-hidden
          fill
          priority
          sizes="(max-width: 1200px) 100vw, 900px"
          style={{ objectFit: mapBox ? 'fill' : 'cover' }}
        />
      </div>
      <div ref={containerRef} className="vis-fill relative h-full w-full" style={{ zIndex: 1 }} />
    </div>
  );
}
