'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { IoIosArrowRoundBack } from 'react-icons/io';
import {
  TbBinaryTree2,
  TbChevronDown,
  TbChevronUp,
  TbListDetails,
  TbMaximize,
  TbPlayerPauseFilled,
  TbPlayerPlayFilled,
  TbPlayerSkipBackFilled,
  TbPlayerSkipForwardFilled,
  TbPlayerTrackNextFilled,
  TbPlayerTrackPrevFilled,
  TbRoute,
  TbZoomIn,
  TbZoomOut,
} from 'react-icons/tb';
import { fetchAStarTree, SAMPLE_ROUTES, USING_SAMPLE_DATA } from '../lib/astarTreeApi';
import { pixelFont } from '../lib/pixelNetworkTheme';
import {
  buildSearchTree,
  finalPathNames,
  LABEL_HEIGHT,
  NODE_HEIGHT,
  NODE_WIDTH,
  viewAtStep,
  type NodeStatus,
  type SearchTree,
  type StepView,
  type TreeNode,
} from '../lib/searchTree';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'ready'; tree: SearchTree; backendPath: string[]; backendDistance: number };

const SPEEDS = [0.5, 1, 1.5, 2, 4];
const BASE_STEP_MS = 1200;
const MIN_ZOOM = 0.35;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.2;

const MONO = { fontFamily: 'var(--font-geist-mono), ui-monospace, monospace' };
const GLOW_TEXT = { textShadow: '0 0 8px rgba(34,211,238,0.7)' };
const CARD =
  'rounded-[15px] border border-cyan-500/20 bg-[rgba(10,18,32,0.55)] shadow-[0_0_25px_rgba(34,211,238,0.1)] backdrop-blur-md';

// Same tone family as the map icons (lib/pixelNetworkTheme.ts): frontier =
// amber, explored = blue, current = cyan, start/path = green.
type Tone = { fill: string; stroke: string; text: string; caption: string; glow?: string; label: string };

const TONES: Record<Exclude<NodeStatus, 'hidden'>, Tone> = {
  current: {
    fill: 'rgba(34,211,238,0.2)',
    stroke: '#22d3ee',
    text: '#ecfeff',
    caption: '#67e8f9',
    glow: 'rgba(34,211,238,0.85)',
    label: 'Expanding',
  },
  expanded: { fill: 'rgba(37,99,235,0.28)', stroke: '#3b82f6', text: '#dbeafe', caption: '#93c5fd', label: 'Expanded' },
  frontier: { fill: 'rgba(245,158,11,0.08)', stroke: '#f59e0b', text: '#fde68a', caption: '#fbbf24', label: 'In queue' },
  path: {
    fill: 'rgba(34,197,94,0.25)',
    stroke: '#4ade80',
    text: '#dcfce7',
    caption: '#86efac',
    glow: 'rgba(74,222,128,0.7)',
    label: 'Final path',
  },
  unexpanded: { fill: 'rgba(15,23,42,0.6)', stroke: '#334155', text: '#94a3b8', caption: '#64748b', label: 'Never expanded' },
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const formatEntry = (node: TreeNode) => {
  const { name, g, h, f, expandedAt } = node.entry;
  return `${name}(${g},${h},${f}|${expandedAt})`;
};

function pathTo(tree: SearchTree, id: string): string[] {
  const names: string[] = [];
  for (let node: TreeNode | undefined = tree.nodes[id]; node; node = node.parentId ? tree.nodes[node.parentId] : undefined) {
    names.unshift(node.entry.name);
  }
  return names;
}

type AStarTreeExplorerProps = { start: string; goal: string };

/**
 * Remount per route (the page keys it by start/goal) so every load starts
 * from a clean slate instead of resetting state inside effects.
 */
export default function AStarTreeExplorer({ start, goal }: AStarTreeExplorerProps) {
  const [load, setLoad] = useState<LoadState>({ status: 'loading' });
  const [step, setStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [pinnedId, setPinnedId] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetchAStarTree(start, goal, controller.signal)
      .then((response) => {
        if (controller.signal.aborted) return;
        setLoad({
          status: 'ready',
          tree: buildSearchTree(response.routes, response.goal),
          backendPath: response.path,
          backendDistance: response.distance,
        });
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setLoad({ status: 'error', error: cause instanceof Error ? cause.message : 'Could not load the search tree.' });
      });

    return () => controller.abort();
  }, [start, goal]);

  const tree = load.status === 'ready' ? load.tree : null;
  const maxStep = tree ? tree.expansions.length - 1 : 0;
  const view = useMemo(() => (tree ? viewAtStep(tree, step) : null), [tree, step]);
  // Derived instead of stored so playback stops itself at the last step
  // without an effect having to flip isPlaying back off.
  const playing = isPlaying && step < maxStep;

  const goTo = useCallback(
    (target: number) => {
      setIsPlaying(false);
      setStep(clamp(target, 0, maxStep));
    },
    [maxStep],
  );

  const togglePlay = useCallback(() => {
    if (maxStep === 0) return;
    if (playing) {
      setIsPlaying(false);
      return;
    }
    if (step >= maxStep) setStep(0);
    setIsPlaying(true);
  }, [maxStep, playing, step]);

  useEffect(() => {
    if (!playing) return;
    const timer = setTimeout(() => setStep((current) => Math.min(current + 1, maxStep)), BASE_STEP_MS / speed);
    return () => clearTimeout(timer);
  }, [playing, step, speed, maxStep]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches('input, textarea, select, [contenteditable="true"]')) return;

      const actions: Record<string, () => void> = {
        Space: togglePlay,
        ArrowLeft: () => goTo(step - 1),
        ArrowRight: () => goTo(step + 1),
        Home: () => goTo(0),
        End: () => goTo(maxStep),
        Escape: () => setPinnedId(null),
      };
      const action = actions[event.code];
      if (action) {
        event.preventDefault();
        action();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goTo, maxStep, step, togglePlay]);

  // Inspector priority: whatever the pointer is on, else a clicked node,
  // else the node being expanded right now.
  const inspectedId = hoveredId ?? pinnedId ?? view?.currentId ?? null;

  return (
    <div className={`flex h-screen w-screen flex-col overflow-hidden bg-[#060a13] text-[#e2f8ff] ${pixelFont.className}`}>
      <header className="flex shrink-0 items-center gap-4 px-5 pt-5 pb-4">
        <Link
          href={`/page2?start=${encodeURIComponent(start)}&goal=${encodeURIComponent(goal)}`}
          aria-label="Back to the route comparison for this start and goal"
          className="flex shrink-0 items-center gap-2 rounded-[14px] border border-cyan-500/30 bg-[#0b1220] px-3 py-2 text-[11px] font-bold text-[#67e8f9] shadow-[0_0_14px_rgba(34,211,238,0.25)] transition hover:shadow-[0_0_20px_rgba(34,211,238,0.45)]"
        >
          <IoIosArrowRoundBack size={20} color="#67e8f9" />
          Back to Comparison
        </Link>

        <h1 className="flex min-w-0 shrink-0 items-baseline gap-1.5 truncate text-[15px] font-bold tracking-wide text-[#a5f3fc]">
          <span style={{ textShadow: '0 0 10px rgba(34,211,238,0.9), 0 0 20px rgba(34,211,238,0.5)' }}>A* SEARCH TREE</span>
          <span className="truncate font-bold text-[#22d3ee]">
            · {start} → {goal}
          </span>
        </h1>

        {USING_SAMPLE_DATA && load.status === 'ready' && (
          <span
            title="NEXT_PUBLIC_API_URL is not set, so this tree comes from lib/mockAStarTreeResponse.json"
            className="shrink-0 rounded-md border border-amber-400/40 bg-amber-400/10 px-2 py-1 text-[8px] text-[#fbbf24]"
          >
            SAMPLE DATA
          </span>
        )}

        {load.status !== 'ready' && (
          <span
            className={`min-w-0 truncate text-[10px] ${load.status === 'error' ? 'text-[#f87171]' : 'text-[#7dd3fc]'}`}
            title={load.status === 'error' ? load.error : undefined}
          >
            {load.status === 'loading' ? 'Loading search tree…' : `Search failed — ${load.error}`}
          </span>
        )}

        <Link
          href={`/?start=${encodeURIComponent(start)}&goal=${encodeURIComponent(goal)}`}
          className="ml-auto flex shrink-0 items-center gap-2 rounded-[14px] border border-cyan-500/30 bg-[#0b1220] px-3 py-2 text-[11px] font-bold text-[#67e8f9] transition hover:shadow-[0_0_20px_rgba(34,211,238,0.45)]"
        >
          <TbRoute size={16} />
          Change Route
        </Link>
      </header>

      <div className="flex min-h-0 flex-1 gap-4 px-5 pb-5">
        <aside className="cyan-scrollbar flex min-h-0 w-[380px] shrink-0 flex-col gap-3 overflow-y-auto pr-1">
          {tree && view ? (
            <>
              <StepCard
                tree={tree}
                view={view}
                goal={goal}
                backendPath={load.status === 'ready' ? load.backendPath : []}
                backendDistance={load.status === 'ready' ? load.backendDistance : NaN}
              />
              <StatTiles view={view} />
              <PriorityQueueCard tree={tree} view={view} hoveredId={hoveredId} onHover={setHoveredId} onPin={setPinnedId} />
              <NodeInspectorCard tree={tree} view={view} nodeId={inspectedId} pinned={pinnedId !== null && hoveredId === null} onUnpin={() => setPinnedId(null)} />
              <LegendCard />
            </>
          ) : load.status === 'loading' ? (
            <SidebarPlaceholder />
          ) : null}
        </aside>

        <main className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
          <section className={`${CARD} flex min-h-0 flex-1 flex-col px-4 pt-3 pb-2`}>
            <div className="flex shrink-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="flex items-center gap-2 text-[14px] font-bold leading-tight text-[#a5f3fc]" style={GLOW_TEXT}>
                  <TbBinaryTree2 size={16} />
                  Search Tree
                </h2>
                <p className="mt-1 truncate text-[10px] text-[#7dd3fc]">
                  Each level is one expansion: the popped node, then the neighbours it generated.
                </p>
              </div>
              <div className="shrink-0 text-right text-[10px] leading-tight text-[#5b7a94]">
                <div className="font-semibold text-[#a5f3fc]">
                  Step {tree ? step : 0} / {maxStep}
                </div>
                <div>← → Space · click a node</div>
              </div>
            </div>

            <div className="relative mt-2 min-h-0 flex-1 overflow-hidden rounded-[12px] border border-cyan-500/10 bg-[#050912]">
              {tree && view ? (
                <TreeCanvas
                  tree={tree}
                  view={view}
                  goal={goal}
                  hoveredId={hoveredId}
                  pinnedId={pinnedId}
                  onHover={setHoveredId}
                  onPin={setPinnedId}
                />
              ) : (
                <CanvasMessage load={load} />
              )}
            </div>

            <PlaybackBar
              step={step}
              maxStep={maxStep}
              playing={playing}
              speed={speed}
              disabled={!tree}
              onGoTo={goTo}
              onTogglePlay={togglePlay}
              onSpeedChange={setSpeed}
            />
          </section>

          {tree && view && <TracePanel tree={tree} view={view} onGoTo={goTo} onHover={setHoveredId} />}
        </main>
      </div>
    </div>
  );
}

// ─── Tree canvas ──────────────────────────────────────────────────────────

type TreeCanvasProps = {
  tree: SearchTree;
  view: StepView;
  goal: string;
  hoveredId: string | null;
  pinnedId: string | null;
  onHover: (id: string | null) => void;
  onPin: (id: string | null) => void;
};

function TreeCanvas({ tree, view, goal, hoveredId, pinnedId, onHover, onPin }: TreeCanvasProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [zoom, setZoom] = useState<number | 'fit'>('fit');
  const [box, setBox] = useState({ width: 0, height: 0 });

  // Callback ref: measures once immediately (so "fit" is right on the first
  // paint) and then tracks resizes, e.g. the trace panel collapsing.
  const measureRef = useCallback((element: HTMLDivElement | null) => {
    scrollRef.current = element;
    if (!element) return;
    const measure = () => setBox({ width: element.clientWidth, height: element.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const fitScale = box.width
    ? clamp(Math.min((box.width - 16) / tree.width, (box.height - 16) / tree.height), MIN_ZOOM, 1.25)
    : 1;
  const scale = zoom === 'fit' ? fitScale : zoom;

  // When zoomed in, keep the node being expanded on screen as playback moves.
  useEffect(() => {
    if (zoom === 'fit') return;
    scrollRef.current
      ?.querySelector(`[data-node-id="${view.currentId}"]`)
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  }, [view.currentId, zoom]);

  const nextId = view.isLastStep ? null : view.frontier[0];

  return (
    <>
      <div ref={measureRef} className="cyan-scrollbar absolute inset-0 overflow-auto" onClick={() => onPin(null)}>
        <div className="flex min-h-full w-max min-w-full items-center justify-center p-2">
          <svg
            width={tree.width * scale}
            height={tree.height * scale}
            viewBox={`0 0 ${tree.width} ${tree.height}`}
            className="block"
            role="img"
            aria-label={`A* search tree at step ${view.step}`}
          >
            <g>
              {tree.order.map((id) => {
                const node = tree.nodes[id];
                if (!node.parentId) return null;
                return (
                  <TreeEdge
                    key={id}
                    parent={tree.nodes[node.parentId]}
                    child={node}
                    parentStatus={view.status[node.parentId]}
                    childStatus={view.status[id]}
                  />
                );
              })}
            </g>
            <g>
              {tree.order.map((id) => (
                <TreeNodeBox
                  key={id}
                  node={tree.nodes[id]}
                  status={view.status[id]}
                  isRoot={id === tree.rootId}
                  isGoal={tree.nodes[id].entry.name === goal}
                  isNext={id === nextId}
                  highlighted={id === hoveredId || id === pinnedId}
                  onHover={onHover}
                  onPin={onPin}
                />
              ))}
            </g>
          </svg>
        </div>
      </div>

      <div className="absolute right-3 bottom-3 flex items-center gap-1 rounded-[10px] border border-cyan-500/20 bg-[#0b1220]/90 p-1 shadow-[0_0_14px_rgba(34,211,238,0.15)]">
        <ZoomButton title="Zoom out" onClick={() => setZoom(clamp(scale - ZOOM_STEP, MIN_ZOOM, MAX_ZOOM))}>
          <TbZoomOut size={15} />
        </ZoomButton>
        <span className="w-11 text-center text-[9px] text-[#7dd3fc]" style={MONO}>
          {Math.round(scale * 100)}%
        </span>
        <ZoomButton title="Zoom in" onClick={() => setZoom(clamp(scale + ZOOM_STEP, MIN_ZOOM, MAX_ZOOM))}>
          <TbZoomIn size={15} />
        </ZoomButton>
        <ZoomButton title="Fit tree to view" active={zoom === 'fit'} onClick={() => setZoom('fit')}>
          <TbMaximize size={15} />
        </ZoomButton>
      </div>
    </>
  );
}

function ZoomButton({ title, active, onClick, children }: { title: string; active?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`flex h-7 w-7 items-center justify-center rounded-md text-[#7dd3fc] transition hover:bg-cyan-500/15 ${
        active ? 'bg-cyan-500/20 text-[#ecfeff]' : ''
      }`}
    >
      {children}
    </button>
  );
}

function TreeEdge({
  parent,
  child,
  parentStatus,
  childStatus,
}: {
  parent: TreeNode;
  child: TreeNode;
  parentStatus: NodeStatus;
  childStatus: NodeStatus;
}) {
  const x1 = parent.x + NODE_WIDTH / 2;
  const y1 = parent.y + NODE_HEIGHT + LABEL_HEIGHT;
  const x2 = child.x + NODE_WIDTH / 2;
  const y2 = child.y - 4;
  const midY = (y1 + y2) / 2;

  const onPath = parentStatus === 'path' && childStatus === 'path';
  const intoCurrent = childStatus === 'current';
  const fromCurrent = parentStatus === 'current';
  const stroke = onPath ? '#4ade80' : intoCurrent ? '#22d3ee' : fromCurrent ? 'rgba(103,232,249,0.6)' : 'rgba(100,116,139,0.55)';
  const hidden = childStatus === 'hidden';

  return (
    <g style={{ opacity: hidden ? 0 : 1, transition: 'opacity 450ms ease' }}>
      <path
        d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
        fill="none"
        style={{
          stroke,
          strokeWidth: onPath || intoCurrent ? 2.5 : 1.4,
          transition: 'stroke 300ms ease',
          filter: onPath ? 'drop-shadow(0 0 4px rgba(74,222,128,0.8))' : undefined,
        }}
      />
      {child.edgeCost !== null && (
        <g transform={`translate(${(x1 + x2) / 2}, ${midY})`}>
          <rect x={-15} y={-8} width={30} height={16} rx={5} fill="#060a13" stroke={onPath ? '#4ade80' : 'rgba(34,211,238,0.2)'} />
          <text textAnchor="middle" dominantBaseline="central" fontSize={10} fill={onPath ? '#86efac' : '#5b7a94'} style={MONO}>
            {child.edgeCost}
          </text>
        </g>
      )}
    </g>
  );
}

type TreeNodeBoxProps = {
  node: TreeNode;
  status: NodeStatus;
  isRoot: boolean;
  isGoal: boolean;
  isNext: boolean;
  highlighted: boolean;
  onHover: (id: string | null) => void;
  onPin: (id: string | null) => void;
};

function TreeNodeBox({ node, status, isRoot, isGoal, isNext, highlighted, onHover, onPin }: TreeNodeBoxProps) {
  const hidden = status === 'hidden';
  const tone = TONES[hidden ? 'frontier' : status];
  const { name, g, h, f, expandedAt } = node.entry;
  const wasExpanded = status === 'current' || status === 'expanded' || (status === 'path' && expandedAt >= 0);
  const tag = isRoot ? 'START' : isGoal ? 'GOAL' : null;

  return (
    <g
      data-node-id={node.id}
      transform={`translate(${node.x}, ${node.y})`}
      style={{ opacity: hidden ? 0 : 1, transition: 'opacity 450ms ease', cursor: 'pointer', pointerEvents: hidden ? 'none' : 'auto' }}
      onMouseEnter={() => onHover(node.id)}
      onMouseLeave={() => onHover(null)}
      onClick={(event) => {
        event.stopPropagation();
        onPin(node.id);
      }}
    >
      <title>{`${name} — f ${f} = g ${g} + h ${h}`}</title>

      {isNext && (
        <rect
          x={-5}
          y={-5}
          width={NODE_WIDTH + 10}
          height={NODE_HEIGHT + 10}
          rx={13}
          fill="none"
          stroke="#22d3ee"
          strokeWidth={1.5}
          strokeDasharray="5 4"
          className="animate-pulse"
        />
      )}

      <rect
        width={NODE_WIDTH}
        height={NODE_HEIGHT}
        rx={10}
        style={{
          fill: tone.fill,
          stroke: highlighted ? '#ecfeff' : tone.stroke,
          strokeWidth: highlighted ? 2.5 : status === 'current' || status === 'path' ? 2 : 1.5,
          filter: tone.glow ? `drop-shadow(0 0 7px ${tone.glow})` : undefined,
          transition: 'fill 300ms ease, stroke 300ms ease',
        }}
      />
      <text
        x={NODE_WIDTH / 2}
        y={NODE_HEIGHT / 2 + 1}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={9}
        style={{ fill: tone.text, transition: 'fill 300ms ease' }}
      >
        {name}
      </text>

      {wasExpanded && (
        <g>
          <circle r={10} style={{ fill: '#060a13', stroke: tone.stroke }} strokeWidth={1.5} />
          <text textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={700} fill={tone.caption} style={MONO}>
            {expandedAt}
          </text>
        </g>
      )}

      {tag && (
        <text
          x={NODE_WIDTH - 6}
          y={-6}
          textAnchor="end"
          fontSize={7}
          fill={isRoot ? '#4ade80' : '#f87171'}
          style={{ textShadow: `0 0 6px ${isRoot ? 'rgba(74,222,128,0.8)' : 'rgba(248,113,113,0.8)'}` }}
        >
          {tag}
        </text>
      )}
      {isNext && (
        <text x={6} y={-9} fontSize={7} fill="#67e8f9">
          NEXT
        </text>
      )}

      <text
        x={NODE_WIDTH / 2}
        y={NODE_HEIGHT + 15}
        textAnchor="middle"
        fontSize={11}
        style={{ ...MONO, fill: tone.caption, transition: 'fill 300ms ease' }}
      >
        {f} = {g} + {h}
      </text>
    </g>
  );
}

function CanvasMessage({ load }: { load: LoadState }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
      {load.status === 'error' ? (
        <>
          <p className="text-[12px] text-[#f87171]">Couldn&apos;t build the search tree</p>
          <p className="max-w-[520px] text-[10px] leading-[1.7] text-[#7dd3fc]">{load.error}</p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {SAMPLE_ROUTES.map(({ start, goal }) => (
              <Link
                key={`${start}→${goal}`}
                href={`/page3?start=${encodeURIComponent(start)}&goal=${encodeURIComponent(goal)}`}
                className="rounded-[12px] border border-cyan-500/30 bg-[#0b1220] px-3 py-2 text-[10px] font-bold text-[#67e8f9] shadow-[0_0_14px_rgba(34,211,238,0.25)] transition hover:shadow-[0_0_20px_rgba(34,211,238,0.45)]"
              >
                View sample: {start} → {goal}
              </Link>
            ))}
          </div>
        </>
      ) : (
        <>
          <TbBinaryTree2 size={28} className="animate-pulse text-[#22d3ee]" />
          <p className="text-[10px] text-[#7dd3fc]">Loading search tree…</p>
        </>
      )}
    </div>
  );
}

// ─── Playback ─────────────────────────────────────────────────────────────

type PlaybackBarProps = {
  step: number;
  maxStep: number;
  playing: boolean;
  speed: number;
  disabled: boolean;
  onGoTo: (step: number) => void;
  onTogglePlay: () => void;
  onSpeedChange: (speed: number) => void;
};

function PlaybackBar({ step, maxStep, playing, speed, disabled, onGoTo, onTogglePlay, onSpeedChange }: PlaybackBarProps) {
  const iconButton =
    'flex h-7 w-7 items-center justify-center rounded-md text-[#7dd3fc] hover:bg-cyan-500/10 disabled:opacity-30';

  return (
    <div className="mt-2 flex shrink-0 items-center gap-1">
      <button type="button" title="Reset (Home)" onClick={() => onGoTo(0)} disabled={disabled} className={iconButton}>
        <TbPlayerSkipBackFilled size={14} />
      </button>
      <button type="button" title="Previous step (←)" onClick={() => onGoTo(step - 1)} disabled={disabled || step === 0} className={iconButton}>
        <TbPlayerTrackPrevFilled size={14} />
      </button>
      <button
        type="button"
        title={playing ? 'Pause (Space)' : 'Play (Space)'}
        onClick={onTogglePlay}
        disabled={disabled || maxStep === 0}
        className="flex h-7 min-w-9 items-center justify-center rounded-md bg-[#0891b2] px-2 text-[#f0fdff] shadow-[0_0_10px_rgba(34,211,238,0.4)] hover:bg-cyan-600 disabled:opacity-30 disabled:shadow-none"
      >
        {playing ? <TbPlayerPauseFilled size={14} /> : <TbPlayerPlayFilled size={14} />}
      </button>
      <button type="button" title="Next step (→)" onClick={() => onGoTo(step + 1)} disabled={disabled || step >= maxStep} className={iconButton}>
        <TbPlayerTrackNextFilled size={14} />
      </button>
      <button type="button" title="Jump to end (End)" onClick={() => onGoTo(maxStep)} disabled={disabled || step >= maxStep} className={iconButton}>
        <TbPlayerSkipForwardFilled size={14} />
      </button>

      <input
        aria-label="Search tree step"
        type="range"
        min={0}
        max={maxStep}
        value={Math.min(step, maxStep)}
        disabled={disabled || maxStep === 0}
        onChange={(event) => onGoTo(Number(event.target.value))}
        className="mx-2 min-w-0 flex-1 accent-[#22d3ee]"
      />

      <div className="relative flex items-center">
        <select
          aria-label="Playback speed"
          value={speed}
          onChange={(event) => onSpeedChange(Number(event.target.value))}
          className="h-7 appearance-none rounded-md border-none bg-transparent py-0 pr-4 pl-1 text-xs font-semibold text-[#7dd3fc] outline-none"
        >
          {SPEEDS.map((value) => (
            <option key={value} value={value} className="bg-[#0b1220] text-[#e2f8ff]">
              {value}×
            </option>
          ))}
        </select>
        <TbChevronDown size={12} className="pointer-events-none absolute right-0.5 text-[#7dd3fc]" />
      </div>
    </div>
  );
}

// ─── Sidebar cards ────────────────────────────────────────────────────────

function CardTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-2">
      <h3 className="whitespace-nowrap text-[12px] font-bold text-[#a5f3fc]" style={GLOW_TEXT}>
        {children}
      </h3>
      {aside && <span className="text-right text-[9px] text-[#5b7a94]">{aside}</span>}
    </div>
  );
}

type StepCardProps = {
  tree: SearchTree;
  view: StepView;
  goal: string;
  backendPath: string[];
  backendDistance: number;
};

function StepCard({ tree, view, goal, backendPath, backendDistance }: StepCardProps) {
  const current = tree.nodes[view.currentId];
  const { name, g, h, f } = current.entry;
  const generated = current.childIds.map((id) => tree.nodes[id]);

  if (view.goalReached) {
    const route = finalPathNames(tree);
    const pathsDisagree = backendPath.length > 0 && backendPath.join('|') !== route.join('|');
    const distancesDisagree = Number.isFinite(backendDistance) && backendDistance !== g;
    const disagrees = pathsDisagree || distancesDisagree;

    return (
      <div className={`${CARD} border-green-400/30 p-5 shadow-[0_0_25px_rgba(74,222,128,0.15)]`}>
        <p className="text-[9px] tracking-widest text-[#86efac]">STEP {view.step} · GOAL POPPED</p>
        <p className="mt-2 text-[18px] font-bold text-[#dcfce7]" style={{ textShadow: '0 0 10px rgba(74,222,128,0.7)' }}>
          Path Found
        </p>
        <p className="mt-3 text-[10px] leading-[1.9] text-[#bbf7d0]">{route.join(' → ')}</p>
        <div className="mt-4 grid grid-cols-[1.4fr_1fr_1fr] gap-2 border-t border-green-400/20 pt-4">
          {[
            { label: 'Total cost', value: g, big: true },
            { label: 'Cities', value: route.length },
            { label: 'Steps', value: view.step },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col items-center rounded-[8px] bg-[#0b1220] py-2.5">
              <span className="text-[8px] text-[#86efac]">{stat.label}</span>
              <span
                className={`mt-1.5 font-bold text-[#dcfce7] ${stat.big ? 'text-[20px]' : 'text-[15px]'}`}
                style={{ ...MONO, textShadow: stat.big ? '0 0 8px rgba(74,222,128,0.6)' : undefined }}
              >
                {stat.value}
              </span>
            </div>
          ))}
        </div>

        {backendPath.length > 0 && (
          <div
            className={`mt-3 rounded-[8px] border px-3 py-2.5 text-[9px] leading-[1.7] ${
              disagrees ? 'border-red-400/40 bg-red-500/10 text-[#fca5a5]' : 'border-cyan-500/15 bg-[#0b1220] text-[#7dd3fc]'
            }`}
          >
            <p className={disagrees ? 'font-bold text-[#fca5a5]' : 'text-[#5b7a94]'}>
              {disagrees ? '⚠ Tree and backend disagree' : 'Backend result'}
            </p>
            <p className="mt-1" style={MONO}>
              {backendPath.join(' → ')} — {backendDistance}
            </p>
          </div>
        )}

        <p className="mt-3 text-[9px] leading-[1.7] text-[#5b7a94]">
          {goal} had the lowest f in the queue ({f}), so A* stops — with an admissible h, nothing left in the queue can
          beat it.
        </p>
      </div>
    );
  }

  return (
    <div className={`${CARD} p-5`}>
      <p className="text-[9px] tracking-widest text-[#5b7a94]">
        STEP {view.step} OF {tree.expansions.length - 1}
      </p>
      <p className="mt-2 text-[10px] text-[#7dd3fc]">{view.step === 0 ? 'Start at' : 'Expanding'}</p>
      <p className="mt-1.5 text-[18px] font-bold text-[#ecfeff]" style={{ textShadow: '0 0 10px rgba(34,211,238,0.8)' }}>
        {name}
      </p>
      <FormulaRow f={f} g={g} h={h} />
      <p className="mt-3 text-[9px] leading-[1.7] text-[#5b7a94]">
        {view.step === 0
          ? 'The start node goes in first with g = 0, so its f is just the heuristic.'
          : 'Popped because it has the lowest f in the priority queue.'}
      </p>

      {generated.length > 0 && (
        <div className="mt-4 border-t border-cyan-500/15 pt-3">
          <p className="mb-2 text-[9px] text-[#7dd3fc]">Generated {generated.length} neighbours</p>
          <ul className="flex flex-col gap-1.5">
            {generated.map((child) => (
              <li key={child.id} className="flex items-center justify-between text-[9px]">
                <span className="text-[#fde68a]">{child.entry.name}</span>
                <span className="text-[#fbbf24]" style={MONO}>
                  f {child.entry.f}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function FormulaRow({ f, g, h }: { f: number; g: number; h: number }) {
  const cell = (label: string, value: number, color: string) => (
    <div className="flex flex-1 flex-col items-center rounded-[8px] bg-[#0b1220] py-2">
      <span className="text-[8px] text-[#5b7a94]">{label}</span>
      <span className="mt-1 text-[15px] font-bold" style={{ ...MONO, color }}>
        {value}
      </span>
    </div>
  );

  return (
    <div className="mt-3 flex items-center gap-1.5 text-[#5b7a94]">
      {cell('f', f, '#67e8f9')}
      <span style={MONO}>=</span>
      {cell('g', g, '#93c5fd')}
      <span style={MONO}>+</span>
      {cell('h', h, '#fbbf24')}
    </div>
  );
}

function StatTiles({ view }: { view: StepView }) {
  const tiles = [
    { label: 'Expanded', value: view.expandedCount, color: '#93c5fd' },
    { label: 'Generated', value: view.generatedCount, color: '#e2f8ff' },
    { label: 'In queue', value: view.frontier.length, color: '#fbbf24' },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {tiles.map((tile) => (
        <div key={tile.label} className={`${CARD} flex flex-col items-center px-2 py-3`}>
          <span className="text-[18px] font-bold" style={{ ...MONO, color: tile.color }}>
            {tile.value}
          </span>
          <span className="mt-1 text-[8px] text-[#5b7a94]">{tile.label}</span>
        </div>
      ))}
    </div>
  );
}

type PriorityQueueCardProps = {
  tree: SearchTree;
  view: StepView;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  onPin: (id: string | null) => void;
};

function PriorityQueueCard({ tree, view, hoveredId, onHover, onPin }: PriorityQueueCardProps) {
  return (
    <div className={`${CARD} p-5`}>
      <CardTitle aside="lowest f first">{view.isLastStep ? 'Left in Queue' : 'Priority Queue'}</CardTitle>

      {view.frontier.length === 0 ? (
        <p className="text-[9px] text-[#5b7a94]">Queue is empty.</p>
      ) : (
        <table className="w-full border-collapse text-[9px]">
          <thead>
            <tr className="text-[#5b7a94]">
              <th className="pb-2 text-left font-normal">City</th>
              <th className="pb-2 text-right font-normal">g</th>
              <th className="pb-2 text-right font-normal">h</th>
              <th className="pb-2 text-right font-normal">f</th>
            </tr>
          </thead>
          <tbody>
            {view.frontier.map((id, index) => {
              const { name, g, h, f } = tree.nodes[id].entry;
              const isNext = index === 0 && !view.isLastStep;
              return (
                <tr
                  key={id}
                  onMouseEnter={() => onHover(id)}
                  onMouseLeave={() => onHover(null)}
                  onClick={() => onPin(id)}
                  className={`cursor-pointer border-t border-cyan-500/10 transition ${
                    hoveredId === id ? 'bg-cyan-500/10' : ''
                  } ${isNext ? 'text-[#ecfeff]' : view.isLastStep ? 'text-[#64748b]' : 'text-[#fde68a]'}`}
                >
                  <td className="py-2">
                    <span className="flex items-center gap-2">
                      {name}
                      {isNext && <span className="rounded bg-cyan-500/20 px-1 py-0.5 text-[7px] text-[#67e8f9]">NEXT</span>}
                    </span>
                  </td>
                  <td className="py-2 text-right" style={MONO}>{g}</td>
                  <td className="py-2 text-right" style={MONO}>{h}</td>
                  <td className="py-2 text-right font-bold" style={MONO}>{f}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

type NodeInspectorCardProps = {
  tree: SearchTree;
  view: StepView;
  nodeId: string | null;
  pinned: boolean;
  onUnpin: () => void;
};

function NodeInspectorCard({ tree, view, nodeId, pinned, onUnpin }: NodeInspectorCardProps) {
  const node = nodeId ? tree.nodes[nodeId] : null;
  if (!node) return null;

  const status = view.status[node.id];
  const tone = TONES[status === 'hidden' ? 'unexpanded' : status];
  const parent = node.parentId ? tree.nodes[node.parentId] : null;
  const rows: [string, ReactNode][] = [
    ['Depth', node.depth],
    ['Generated at', parent ? `step ${node.generatedAtStep}` : 'start'],
    ['Expanded at', node.entry.expandedAt >= 0 ? `step ${node.entry.expandedAt}` : 'never'],
  ];
  if (parent) rows.splice(1, 0, ['Reached from', `${parent.entry.name} (+${node.edgeCost})`]);

  return (
    <div className={`${CARD} p-5`}>
      <CardTitle
        aside={
          pinned ? (
            <button type="button" onClick={onUnpin} className="text-[#7dd3fc] hover:text-[#ecfeff]">
              unpin (Esc)
            </button>
          ) : (
            'hover / click'
          )
        }
      >
        Node Details
      </CardTitle>

      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[12px] font-bold" style={{ color: tone.text }}>
          {node.entry.name}
        </span>
        <span
          className="shrink-0 rounded-md border px-1.5 py-1 text-[7px]"
          style={{ borderColor: tone.stroke, color: tone.caption, background: tone.fill }}
        >
          {tone.label.toUpperCase()}
        </span>
      </div>

      <FormulaRow f={node.entry.f} g={node.entry.g} h={node.entry.h} />

      <dl className="mt-4 flex flex-col gap-2 text-[9px]">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3">
            <dt className="text-[#5b7a94]">{label}</dt>
            <dd className="truncate text-right text-[#e2f8ff]">{value}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-4 border-t border-cyan-500/15 pt-3 text-[9px] leading-[1.9] text-[#7dd3fc]">
        {pathTo(tree, node.id).join(' → ')}
      </p>
      <p className="mt-2 text-[10px] text-[#5b7a94]" style={MONO}>
        {formatEntry(node)}
      </p>
    </div>
  );
}

function LegendCard() {
  const items: [Exclude<NodeStatus, 'hidden'>, string][] = [
    ['current', 'Node being expanded this step'],
    ['expanded', 'Expanded (popped) earlier'],
    ['frontier', 'Generated, waiting in the queue'],
    ['path', 'Final route, once the goal is popped'],
    ['unexpanded', 'Generated, never expanded'],
  ];

  return (
    <div className={`${CARD} p-5`}>
      <CardTitle>Legend</CardTitle>
      <ul className="flex flex-col gap-2.5">
        {items.map(([status, text]) => {
          const tone = TONES[status];
          return (
            <li key={status} className="flex items-center gap-3 text-[9px] text-[#7dd3fc]">
              <span
                className="h-3.5 w-7 shrink-0 rounded-[4px] border-[1.5px]"
                style={{ borderColor: tone.stroke, background: tone.fill, boxShadow: tone.glow ? `0 0 6px ${tone.glow}` : undefined }}
              />
              {text}
            </li>
          );
        })}
        <li className="flex items-center gap-3 text-[9px] text-[#7dd3fc]">
          <span className="h-3.5 w-7 shrink-0 animate-pulse rounded-[4px] border-[1.5px] border-dashed border-[#22d3ee]" />
          Next to be popped (lowest f)
        </li>
        <li className="flex items-center gap-3 text-[9px] text-[#7dd3fc]">
          <span className="flex w-7 shrink-0 justify-center">
            <span
              className="flex h-5 w-5 items-center justify-center rounded-full border-[1.5px] border-[#3b82f6] bg-[#060a13] text-[10px] font-bold text-[#93c5fd]"
              style={MONO}
            >
              2
            </span>
          </span>
          Badge = step it was expanded at
        </li>
      </ul>
      <p className="mt-4 border-t border-cyan-500/15 pt-3 text-[9px] leading-[1.8] text-[#5b7a94]">
        Caption under each box is <span className="text-[#67e8f9]">f</span> = <span className="text-[#93c5fd]">g</span> +{' '}
        <span className="text-[#fbbf24]">h</span>; numbers on edges are road distances.
      </p>
    </div>
  );
}

function SidebarPlaceholder() {
  return (
    <>
      {[180, 72, 220, 200].map((height, index) => (
        <div key={index} className={`${CARD} animate-pulse`} style={{ height }} />
      ))}
    </>
  );
}

// ─── Raw trace ────────────────────────────────────────────────────────────

type TracePanelProps = {
  tree: SearchTree;
  view: StepView;
  onGoTo: (step: number) => void;
  onHover: (id: string | null) => void;
};

/** The backend's route listing verbatim, coloured by the current step. */
function TracePanel({ tree, view, onGoTo, onHover }: TracePanelProps) {
  const [open, setOpen] = useState(true);
  const goalNode = view.goalReached ? tree.nodes[tree.finalPath[tree.finalPath.length - 1]] : null;

  const entry = (id: string, isParent: boolean) => {
    const status = view.status[id];
    const color = status === 'hidden' ? '#334155' : TONES[status].caption;
    return (
      <span
        key={id}
        onMouseEnter={() => onHover(id)}
        onMouseLeave={() => onHover(null)}
        className={`rounded px-0.5 hover:bg-cyan-500/15 ${isParent ? 'font-bold' : ''}`}
        style={{ color }}
      >
        {formatEntry(tree.nodes[id])}
      </span>
    );
  };

  return (
    <section className={`${CARD} flex shrink-0 flex-col px-4 py-3`}>
      <button type="button" onClick={() => setOpen((value) => !value)} className="flex items-center justify-between text-left">
        <span className="flex items-center gap-2 text-[12px] font-bold text-[#a5f3fc]" style={GLOW_TEXT}>
          <TbListDetails size={15} />
          Raw Trace
          <span className="text-[9px] font-normal text-[#5b7a94]" style={{ textShadow: 'none' }}>
            route[step] = [parent, ...children] · Name(g,h,f|expandedAt)
          </span>
        </span>
        {open ? <TbChevronDown size={14} className="text-[#7dd3fc]" /> : <TbChevronUp size={14} className="text-[#7dd3fc]" />}
      </button>

      {open && (
        <div className="cyan-scrollbar mt-2 max-h-[170px] overflow-auto text-[11px] leading-[1.9]" style={MONO}>
          {tree.lists.map(([parentId, ...childIds], index) => {
            const listStep = tree.nodes[parentId].expandedAtStep ?? index;
            const isCurrent = listStep === view.step;
            const isFuture = listStep > view.step;
            return (
              <div
                key={parentId}
                onClick={() => onGoTo(listStep)}
                className={`flex cursor-pointer gap-3 rounded-md border-l-2 px-2 transition ${
                  isCurrent ? 'border-[#22d3ee] bg-cyan-500/10' : 'border-transparent hover:bg-cyan-500/5'
                } ${isFuture ? 'opacity-35' : ''}`}
              >
                <span className="w-5 shrink-0 text-right text-[#5b7a94]">{index}:</span>
                <span className="text-[#5b7a94]">
                  [{entry(parentId, true)}
                  {childIds.map((id) => (
                    <span key={id}>, {entry(id, false)}</span>
                  ))}
                  ]
                </span>
              </div>
            );
          })}
          {goalNode && (
            <div className="flex gap-3 rounded-md border-l-2 border-[#4ade80] bg-green-500/10 px-2">
              <span className="w-5 shrink-0 text-right text-[#5b7a94]">→</span>
              <span className="text-[#86efac]">
                {formatEntry(goalNode)} popped — goal reached, cost {goalNode.entry.g}
              </span>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
