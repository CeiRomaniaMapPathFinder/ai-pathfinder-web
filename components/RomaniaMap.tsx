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
};

// Same background photo + node layout as the city-picker map (app/page.tsx),
// just pinned to this component's own box instead of the full viewport —
// see alignNetwork() below for how xPct/yPct become real pixel positions.
const PACKET_ID = '__packet__';
const HOP_DURATION_MS = 420;

// Sized for the smaller BFS/A* panels (roughly 70% of the city-picker map's
// constants) so icons and text stay chunky-but-readable without crowding.
const ROUTER_ICON_SIZE = 16;
const DEVICE_ICON_SIZE = 19;
const EDGE_FONT_SIZE = 9;

const CITY_LABEL_FONT_SIZE = 10;
const CITY_LABEL_COLOR = '#eafbff';
const CITY_LABEL_IDLE_DIM_COLOR = '#64748b';
const CITY_LABEL_OFFSET_Y = 17;
const CITY_LABEL_STROKE_WIDTH = 2.5;
const CITY_LABEL_STROKE_COLOR = '#0a1628';
const CITY_LABEL_SHADOW_COLOR = 'rgba(0,0,0,0.6)';
const CITY_LABEL_SHADOW_BLUR = 5;
const CITY_LABEL_SHADOW_OFFSET_Y = 2;
const CITY_LABEL_PILL_COLOR = 'rgba(8,16,28,0.55)';
const CITY_LABEL_PILL_PAD_X = 4;
const CITY_LABEL_PILL_PAD_Y = 3;
const CITY_LABEL_PILL_RADIUS = 5;

const activePathColor = '#22d3ee';
const idleEdgeColor = '#a5f3fc';
const hoverEdgeColor = '#67e8f9';
// Dark drop-shadow so a bright cyan cable stays legible whether it crosses a
// light cloud patch or a dark mountain patch in the photo; on-path edges get
// a stronger colored glow instead (set per-edge in applyState below).
const edgeShadow = { enabled: true, color: 'rgba(0,0,0,0.65)', size: 5, x: 0, y: 0 };

// vis-network's 'image' node shape throws synchronously inside `new Network(...)`
// if a node is created without an `image` (Error: "Option image must be defined
// for node type 'image'"), which aborts the whole network before anything can
// render. So every node — including the very first DataSet we hand to the
// constructor — must already carry a resolved icon; this is shared by both the
// initial creation and every later per-step update.
function computeNodeStates(start: string | undefined, goal: string | undefined, step: SearchTraceStep | undefined) {
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
      tone,
      image: buildDeviceIcon(role, tone),
      size: role === 'router' ? ROUTER_ICON_SIZE : DEVICE_ICON_SIZE,
    };
  });
}

// Draws every city name by hand (dark solid outline + soft shadow baked into
// the same stroke pass, topped with a crisp light cyan-white fill, over a
// small rounded dark chip) instead of relying on vis-network's built-in label
// renderer, which only supports one flat text-stroke. Idle router names dim
// to a muted tone so a node currently on the frontier/explored/path/PC/server
// reads as the standout text on the map.
function drawCityLabels(
  ctx: CanvasRenderingContext2D,
  positions: Map<string, { x: number; y: number }>,
  toneById: Map<string, DeviceTone>,
) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.font = `${CITY_LABEL_FONT_SIZE}px ${pixelFont.style.fontFamily}`;

  for (const node of cityPositions) {
    const pos = positions.get(node.id);
    if (!pos) continue;

    const tone = toneById.get(node.id) ?? 'idle';
    const fillColor = tone === 'idle' ? CITY_LABEL_IDLE_DIM_COLOR : CITY_LABEL_COLOR;

    const labelY = pos.y + CITY_LABEL_OFFSET_Y;
    const textWidth = ctx.measureText(node.label).width;
    const pillW = textWidth + CITY_LABEL_PILL_PAD_X * 2;
    const pillH = CITY_LABEL_FONT_SIZE + CITY_LABEL_PILL_PAD_Y * 2;
    const pillX = pos.x - pillW / 2;
    const pillY = labelY - CITY_LABEL_PILL_PAD_Y;

    const roundRect = (ctx as unknown as { roundRect?: (x: number, y: number, w: number, h: number, r: number) => void }).roundRect;
    ctx.beginPath();
    if (typeof roundRect === 'function') {
      roundRect.call(ctx, pillX, pillY, pillW, pillH, CITY_LABEL_PILL_RADIUS);
    } else {
      ctx.rect(pillX, pillY, pillW, pillH);
    }
    ctx.fillStyle = CITY_LABEL_PILL_COLOR;
    ctx.fill();

    ctx.shadowColor = CITY_LABEL_SHADOW_COLOR;
    ctx.shadowBlur = CITY_LABEL_SHADOW_BLUR;
    ctx.shadowOffsetY = CITY_LABEL_SHADOW_OFFSET_Y;
    ctx.lineWidth = CITY_LABEL_STROKE_WIDTH;
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

export default function RomaniaMap({ start, goal, step }: RomaniaMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<any>(null);
  const nodesDataSetRef = useRef<any>(null);
  const edgesDataSetRef = useRef<any>(null);
  const pathIdsRef = useRef<Set<number>>(new Set());
  const routeKeyRef = useRef<string>('');
  const prevCurrentRef = useRef<string | null>(null);
  const cancelHopRef = useRef<() => void>(() => {});
  // Latest on-screen pixel position + tone per city, kept in sync by
  // alignNetwork()/applyState() and read every frame by drawCityLabels().
  const nodePixelPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const nodeToneRef = useRef<Map<string, DeviceTone>>(new Map());

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

      nodesDataSetRef.current = new DataSet([
        // x/y are placeholders — alignNetwork() overwrites them with real
        // pixel positions (derived from xPct/yPct) right after the network
        // mounts, once the container's actual size is known.
        ...computeNodeStates(start, goal, step).map(({ tone: _tone, ...node }) => ({ ...node, x: 0, y: 0 })),
        {
          id: PACKET_ID,
          x: 0,
          y: 0,
          label: '',
          hidden: true,
          shape: 'image',
          image: buildPacketIcon(),
          size: 9,
          shapeProperties: { interpolation: false },
        },
      ]);

      edgesDataSetRef.current = new DataSet(
        routeEdges.map((edge) => ({
          ...edge,
          color: { color: idleEdgeColor, highlight: hoverEdgeColor, hover: hoverEdgeColor },
          shadow: edgeShadow,
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
            width: 1.5,
            font: {
              align: 'top',
              size: EDGE_FONT_SIZE,
              color: '#a5f3fc',
              face: pixelFont.style.fontFamily,
              strokeWidth: 2,
              strokeColor: '#020617',
            },
          },
        },
      );

      // Pin the view 1:1 to real screen pixels instead of vis-network's
      // auto-fit zoom: read this component's own on-screen rect (the photo
      // fills that same box via `fill` + `object-fit: cover`), convert every
      // node's xPct/yPct into a pixel position local to it, push those into
      // the node DataSet, then center the view at scale 1 so network-unit ==
      // on-screen pixel exactly.
      const alignNetwork = () => {
        if (!containerRef.current || !networkRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        const positions = cityPositions.map((n) => ({
          id: n.id,
          x: (n.xPct / 100) * rect.width,
          y: (n.yPct / 100) * rect.height,
        }));
        nodesDataSetRef.current.update(positions);
        nodePixelPositionsRef.current = new Map(positions.map((p) => [p.id, { x: p.x, y: p.y }]));
        networkRef.current.moveTo({ position: { x: rect.width / 2, y: rect.height / 2 }, scale: 1 });
        networkRef.current.redraw();
      };

      alignNetwork();

      resizeHandler = alignNetwork;
      window.addEventListener('resize', resizeHandler);
      // The panel can also resize from layout reflow alone (no window
      // resize event), so watch its own box too.
      resizeObserver = new ResizeObserver(alignNetwork);
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

        drawCityLabels(ctx, nodePixelPositionsRef.current, nodeToneRef.current);
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

      const nodeStates = computeNodeStates(start, goal, step);
      nodeToneRef.current = new Map(nodeStates.map((n) => [n.id, n.tone]));
      nodesDataSetRef.current.update(nodeStates.map(({ tone: _tone, ...node }) => node));

      edgesDataSetRef.current.update(
        routeEdges.map((edge) => {
          const onPath = pathIdsRef.current.has(edge.id);
          return {
            id: edge.id,
            width: onPath ? 3 : 1.5,
            color: { color: onPath ? activePathColor : idleEdgeColor, highlight: hoverEdgeColor, hover: hoverEdgeColor },
            shadow: onPath ? { enabled: true, color: 'rgba(34,211,238,0.6)', size: 10, x: 0, y: 0 } : edgeShadow,
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
          own box instead of the full viewport — see alignNetwork() above. */}
      <Image
        src="/images/romania-fantasy-map.png"
        alt=""
        aria-hidden
        fill
        sizes="(max-width: 1200px) 100vw, 900px"
        style={{ objectFit: 'cover', zIndex: 0 }}
      />
      <div ref={containerRef} className="relative h-full w-full" style={{ zIndex: 1 }} />
    </div>
  );
}
