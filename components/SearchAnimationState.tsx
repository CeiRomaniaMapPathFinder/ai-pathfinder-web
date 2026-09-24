'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { TbPlayerPlayFilled, TbRefresh } from 'react-icons/tb';
import SearchPlayer from './SearchPlayer';
import {
  fetchSearchComparison,
  type SearchComparisonResponse,
  type SearchTraceStep,
} from '../lib/searchApi';
import { buildDeviceIcon } from '../lib/pixelNetworkTheme';

// Stable identity matters: `trace` is a dependency of an effect inside
// SearchPlayer that resets playback, so handing it a fresh `[]` on every
// render would reset the animation every frame and it'd never advance.
const EMPTY_TRACE: SearchTraceStep[] = [];

// Both keep the "<number> <unit>" shape, because LivePerformanceRows and
// buildVerdict below read these back out with Number.parseFloat().
const formatMs = (value: number | undefined) => `${(value ?? 0).toFixed(2)} ms`;
const formatKb = (value: number | undefined) => `${Math.round(value ?? 0)} KB`;

// Reused by MapLegendCard below — same icon assets the maps themselves draw
// (see components/RomaniaMap.tsx / app/page.tsx), built once at module scope
// since buildDeviceIcon() already caches by role+tone internally.
const legendStartIcon = buildDeviceIcon('pc', 'start');
const legendGoalIcon = buildDeviceIcon('server', 'goal');
const legendCurrentIcon = buildDeviceIcon('router', 'current');
const legendFrontierIcon = buildDeviceIcon('router', 'frontier');
const legendVisitedIcon = buildDeviceIcon('router', 'explored');

// Shared card chrome for the sections stacked below the stats table — same
// border-radius/border/fill/glow language as the existing stats card, just a
// smaller padding since these hold denser, more compact content.
const SIDE_CARD_CLASS =
  'rounded-[15px] border border-cyan-500/20 bg-[rgba(10,18,32,0.55)] p-5 shadow-[0_0_25px_rgba(34,211,238,0.1)] backdrop-blur-md';
const SIDE_CARD_TITLE_GLOW = { textShadow: '0 0 8px rgba(34,211,238,0.7)' } as const;

type Algorithm = 'bfs' | 'astar';

/** Lifecycle of the backend request that supplies both animations. */
type SearchStatus = 'idle' | 'loading' | 'ready' | 'error';

type LiveState = {
  step?: SearchTraceStep;
  index: number;
};

type ComparisonItem = {
  label: string;
  bfs: string;
  astar: string;
  bfsFinal: string;
  astarFinal: string;
};

type SearchAnimationContextValue = {
  start?: string;
  goal?: string;
  bfsTrace: SearchTraceStep[];
  astarTrace: SearchTraceStep[];
  activePlayer: Algorithm;
  setActivePlayer: (algorithm: Algorithm) => void;
  handleBfsStep: (step: SearchTraceStep | undefined, index: number) => void;
  handleAStarStep: (step: SearchTraceStep | undefined, index: number) => void;
  comparisonData: ComparisonItem[];
  // True only once both panels' live step has actually reached the final,
  // `done: true` step of their trace — i.e. the user has played/scrubbed
  // each one to the end, not merely that a start/goal is selected.
  bothComplete: boolean;
  // Incrementing counters, not booleans — each SearchPlayer watches these
  // via a "did this change since I last saw it" ref, so a second Run/Reset
  // press (e.g. mid-playback) fires again even though the previous command
  // already completed. See SearchPlayer's runToken/resetToken effects.
  runToken: number;
  resetToken: number;
  runBoth: () => void;
  resetBoth: () => void;
  /** Where the backend request is up to — drives the header status note. */
  status: SearchStatus;
  error: string | null;
};

const SearchAnimationContext = createContext<SearchAnimationContextValue | null>(null);

function useSearchAnimation() {
  const context = useContext(SearchAnimationContext);
  if (!context) {
    throw new Error('Search animation components must be inside SearchAnimationProvider.');
  }
  return context;
}

type ProviderProps = {
  start?: string;
  goal?: string;
  children: ReactNode;
};

export function SearchAnimationProvider({ start, goal, children }: ProviderProps) {
  // Both algorithm runs arrive together from one backend call — nothing is
  // computed here. See lib/searchApi.ts for the request/response contract.
  const [result, setResult] = useState<SearchComparisonResponse | null>(null);
  const [status, setStatus] = useState<SearchStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!start || !goal) {
      // resets state when start/goal go missing (e.g. cleared) — not initial state
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResult(null);
      setStatus('idle');
      setError(null);
      return;
    }

    const controller = new AbortController();
    setStatus('loading');
    setError(null);

    fetchSearchComparison(start, goal, controller.signal)
      .then((response) => {
        if (controller.signal.aborted) return;
        setResult(response);
        setStatus('ready');
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setResult(null);
        setStatus('error');
        setError(cause instanceof Error ? cause.message : 'Could not load search results.');
      });

    return () => controller.abort();
  }, [start, goal]);

  const bfsTrace = result?.bfs.steps ?? EMPTY_TRACE;
  const astarTrace = result?.astar.steps ?? EMPTY_TRACE;

  const [activePlayer, setActivePlayer] = useState<Algorithm>('bfs');
  const [bfsLive, setBfsLive] = useState<LiveState>({ index: 0 });
  const [astarLive, setAstarLive] = useState<LiveState>({ index: 0 });
  const [runToken, setRunToken] = useState(0);
  const [resetToken, setResetToken] = useState(0);

  const runBoth = useCallback(() => setRunToken((token) => token + 1), []);
  const resetBoth = useCallback(() => setResetToken((token) => token + 1), []);

  const handleBfsStep = useCallback(
    (step: SearchTraceStep | undefined, index: number) => {
      setBfsLive({ step, index });
    },
    [],
  );

  const handleAStarStep = useCallback(
    (step: SearchTraceStep | undefined, index: number) => {
      setAstarLive({ step, index });
    },
    [],
  );

  const bfsFinal = bfsTrace.at(-1);
  const astarFinal = astarTrace.at(-1);

  // The step objects themselves carry `done: true` only on the trace's
  // final entry, so this is true exactly when the user has played/scrubbed
  // both panels all the way through — not just that start/goal are set.
  const bothComplete = Boolean(bfsLive.step?.done && astarLive.step?.done);

  const comparisonData: ComparisonItem[] = [
    {
      label: 'Path Cost',
      bfs: String(bfsLive.step?.pathCost ?? 0),
      astar: String(astarLive.step?.pathCost ?? 0),
      bfsFinal: String(bfsFinal?.pathCost ?? 0),
      astarFinal: String(astarFinal?.pathCost ?? 0),
    },
    {
      label: 'Node Explore',
      bfs: String(bfsLive.step?.nodesExplored ?? 0),
      astar: String(astarLive.step?.nodesExplored ?? 0),
      bfsFinal: String(bfsFinal?.nodesExplored ?? 0),
      astarFinal: String(astarFinal?.nodesExplored ?? 0),
    },
    // Measured per whole run rather than per step, so the "live" and "final"
    // columns are the same value — they come straight off the backend's
    // response envelope instead of being hardcoded like they used to be.
    {
      label: 'Memory Usage',
      bfs: formatKb(result?.bfs.memoryUsageKb),
      astar: formatKb(result?.astar.memoryUsageKb),
      bfsFinal: formatKb(result?.bfs.memoryUsageKb),
      astarFinal: formatKb(result?.astar.memoryUsageKb),
    },
    {
      label: 'Execution Time',
      bfs: formatMs(result?.bfs.executionTimeMs),
      astar: formatMs(result?.astar.executionTimeMs),
      bfsFinal: formatMs(result?.bfs.executionTimeMs),
      astarFinal: formatMs(result?.astar.executionTimeMs),
    },
  ];

  return (
    <SearchAnimationContext.Provider
      value={{
        start,
        goal,
        bfsTrace,
        astarTrace,
        activePlayer,
        setActivePlayer,
        handleBfsStep,
        handleAStarStep,
        comparisonData,
        bothComplete,
        runToken,
        resetToken,
        runBoth,
        resetBoth,
        status,
        error,
      }}
    >
      {children}
    </SearchAnimationContext.Provider>
  );
}

export function LiveComparisonRows() {
  const { comparisonData } = useSearchAnimation();

  return (
    <>
      {comparisonData.map((item) => (
        <div
          key={item.label}
          className="grid grid-cols-3 items-center border-b border-cyan-500/10 py-3 text-[11px] last:border-b-0"
        >
          <p className="font-semibold text-[#e2f8ff]">{item.label}</p>
          <p className="text-center font-bold text-[#67e8f9]">{item.bfs}</p>
          <p className="text-center font-bold text-[#22d3ee]">{item.astar}</p>
        </div>
      ))}
    </>
  );
}

type Verdict = { headline: string; detail: string };

// Pure + derived entirely from the same comparisonData the stats table
// already renders (its bfsFinal/astarFinal fields specifically — the
// completed trace's numbers). Only called once `ready` (bothComplete from
// context) is true, i.e. both panels have actually been played/scrubbed to
// their final step — not merely that a start/goal is selected.
function buildVerdict(comparisonData: ComparisonItem[], ready: boolean): Verdict | null {
  if (!ready) return null;

  const cost = comparisonData.find((item) => item.label === 'Path Cost');
  const time = comparisonData.find((item) => item.label === 'Execution Time');
  const memory = comparisonData.find((item) => item.label === 'Memory Usage');
  if (!cost || !time || !memory) return null;

  const bfsTime = Number.parseFloat(time.bfsFinal);
  const astarTime = Number.parseFloat(time.astarFinal);
  const bfsCost = Number.parseFloat(cost.bfsFinal);
  const astarCost = Number.parseFloat(cost.astarFinal);
  const bfsMem = Number.parseFloat(memory.bfsFinal);
  const astarMem = Number.parseFloat(memory.astarFinal);

  if ([bfsTime, astarTime, bfsCost, astarCost, bfsMem, astarMem].some((value) => Number.isNaN(value))) {
    return null;
  }

  const fasterLabel = bfsTime === astarTime ? null : bfsTime < astarTime ? 'BFS' : 'A*';
  const speedMultiplier = Math.min(bfsTime, astarTime) > 0 ? Math.max(bfsTime, astarTime) / Math.min(bfsTime, astarTime) : 1;

  const cheaperLabel = bfsCost === astarCost ? null : bfsCost < astarCost ? 'BFS' : 'A*';
  const costDiff = Math.abs(bfsCost - astarCost);

  const heavierLabel = bfsMem === astarMem ? null : bfsMem > astarMem ? 'BFS' : 'A*';
  const memMultiplier = Math.min(bfsMem, astarMem) > 0 ? Math.max(bfsMem, astarMem) / Math.min(bfsMem, astarMem) : 1;

  const detail = [
    fasterLabel ? `${speedMultiplier.toFixed(1)}x faster` : 'same speed',
    cheaperLabel ? `${cheaperLabel} path is ${costDiff} cheaper` : 'same path cost',
    heavierLabel ? `~${memMultiplier.toFixed(1)}x more memory (${heavierLabel})` : 'same memory',
  ].join(', ');

  return { headline: fasterLabel ? `${fasterLabel} wins` : 'Dead heat', detail };
}

// 1. VERDICT CALLOUT — a compact highlighted box (brighter fill/border than
// the other cards on purpose, so it reads as a callout rather than another
// plain stats block) summarizing the comparison in one line.
export function VerdictCard() {
  const { comparisonData, bothComplete } = useSearchAnimation();
  const verdict = buildVerdict(comparisonData, bothComplete);

  return (
    <div className="flex items-start gap-3 rounded-[15px] border border-cyan-400/40 bg-[rgba(34,211,238,0.1)] p-5 shadow-[0_0_25px_rgba(34,211,238,0.2)] backdrop-blur-md">
      <span aria-hidden className="text-[16px] leading-none">⚡</span>
      <div className="min-w-0">
        {verdict ? (
          <>
            <p className="text-[12px] font-bold text-[#a5f3fc]" style={SIDE_CARD_TITLE_GLOW}>
              {verdict.headline}
            </p>
            <p className="mt-1.5 text-[10px] leading-relaxed text-[#7dd3fc]">{verdict.detail}</p>
          </>
        ) : (
          <p className="text-[10px] leading-relaxed text-[#5b7a94]">
            Run both algorithms to compare results.
          </p>
        )}
      </div>
    </div>
  );
}

type LegendRowProps = { icons: string[]; label: string; description: string };

function LegendRow({ icons, label, description }: LegendRowProps) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className="flex shrink-0 items-center gap-1">
        {icons.map((src, index) => (
          // eslint-disable-next-line @next/next/no-img-element -- tiny inline data-URI icons, not a real asset to optimize
          <img key={index} src={src} alt="" width={20} height={20} style={{ imageRendering: 'pixelated' }} />
        ))}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold text-[#e2f8ff]">{label}</p>
        <p className="text-[9px] text-[#5b7a94]">{description}</p>
      </div>
    </div>
  );
}

// 2. MAP LEGEND — same icon assets the maps themselves render (see
// legend*Icon consts above), so this key always matches what's on screen.
export function MapLegendCard() {
  return (
    <div className={SIDE_CARD_CLASS}>
      <h3 className="mb-2 text-[13px] font-bold text-[#a5f3fc]" style={SIDE_CARD_TITLE_GLOW}>
        Map Legend
      </h3>
      <div className="flex flex-col divide-y divide-cyan-500/10">
        <LegendRow icons={[legendStartIcon]} label="Start" description="Search begins here" />
        <LegendRow icons={[legendGoalIcon]} label="Goal" description="Search target city" />
        <LegendRow
          icons={[legendCurrentIcon, legendFrontierIcon]}
          label="Current / Frontier"
          description="Being expanded / queued up next"
        />
        <LegendRow icons={[legendVisitedIcon]} label="Visited" description="Already explored" />
      </div>
    </div>
  );
}

// 3. HEURISTIC EXPLAINER — native <details>/<summary>, no extra state needed
// for the collapse. The "h(n) = 0" note in the copy below describes the
// sample data in lib/mockSearchResponse.json. REVISIT IT once the real
// backend is wired up: if that implements a genuine straight-line-distance
// heuristic, this copy becomes wrong and should drop the caveat.
export function HeuristicExplainerCard() {
  return (
    <details className={`${SIDE_CARD_CLASS} group`}>
      <summary className="cursor-pointer list-none text-[12px] font-bold text-[#a5f3fc]" style={SIDE_CARD_TITLE_GLOW}>
        <span aria-hidden className="mr-2 inline-block transition-transform group-open:rotate-90">▸</span>
        How does A* choose its path?
      </summary>
      <div className="mt-3 flex flex-col gap-2 text-[10px] leading-relaxed text-[#7dd3fc]">
        <p>
          <span className="font-semibold text-[#e2f8ff]">BFS</span> explores blindly — it expands
          nodes purely by hop count, with no sense of distance or direction toward the goal.
        </p>
        <p>
          <span className="font-semibold text-[#e2f8ff]">A*</span> ranks nodes by f(n) = g(n) + h(n):
          g(n) is the cost already spent, h(n) is a heuristic estimate of what&apos;s left — normally the
          straight-line distance to the goal city, so it favors moves that head the right direction.
        </p>
        <p className="text-[#5b7a94]">
          Note: this demo&apos;s heuristic is currently h(n) = 0, so &quot;Custom Heuristic Search&quot; behaves like
          uniform-cost search rather than true straight-line-distance A*.
        </p>
      </div>
    </details>
  );
}

// 5. RUN BOTH / RESET BOTH — sits in the header, right-aligned. Toggles
// between the two actions based on bothComplete so there's one button, not
// two competing ones. Both SearchPlayer instances watch runToken/resetToken
// (see SearchPlayer's own runToken/resetToken effects) and react
// independently — this component just fires the shared signal.
export function RunBothButton() {
  const { runBoth, resetBoth, bothComplete, status } = useSearchAnimation();
  const ready = status === 'ready';

  return (
    <button
      type="button"
      onClick={bothComplete ? resetBoth : runBoth}
      disabled={!ready}
      className="ml-auto flex shrink-0 items-center gap-2 rounded-[14px] bg-[#0891b2] px-4 py-2 text-[11px] font-bold text-[#f0fdff] shadow-[0_0_14px_rgba(34,211,238,0.4)] transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-30 disabled:shadow-none"
    >
      {bothComplete ? <TbRefresh size={14} /> : <TbPlayerPlayFilled size={12} />}
      {bothComplete ? 'Reset Both' : 'Run Both'}
    </button>
  );
}

// Surfaces the backend request's state in the header — invisible once the
// data has landed, so it costs nothing in the normal case.
export function SearchStatusNote() {
  const { status, error } = useSearchAnimation();

  if (status === 'ready' || status === 'idle') return null;

  return (
    <span
      className={`min-w-0 truncate text-[10px] ${
        status === 'error' ? 'text-[#f87171]' : 'text-[#7dd3fc]'
      }`}
      title={error ?? undefined}
    >
      {status === 'loading' ? 'Loading search results…' : `Search failed — ${error}`}
    </span>
  );
}

export function BfsSearchPlayer() {
  const {
    start,
    goal,
    bfsTrace,
    activePlayer,
    setActivePlayer,
    handleBfsStep,
    runToken,
    resetToken,
  } = useSearchAnimation();

  return (
    <SearchPlayer
      title="Path Found by Breadth First Search (BFS)"
      start={start}
      goal={goal}
      trace={bfsTrace}
      active={activePlayer === 'bfs'}
      onActivate={() => setActivePlayer('bfs')}
      onStepChange={handleBfsStep}
      runToken={runToken}
      resetToken={resetToken}
    />
  );
}

export function AStarSearchPlayer() {
  const {
    start,
    goal,
    astarTrace,
    activePlayer,
    setActivePlayer,
    handleAStarStep,
    runToken,
    resetToken,
  } = useSearchAnimation();

  return (
    <SearchPlayer
      title="Path Found by Custom Heuristic Search (A*)"
      start={start}
      goal={goal}
      trace={astarTrace}
      active={activePlayer === 'astar'}
      onActivate={() => setActivePlayer('astar')}
      onStepChange={handleAStarStep}
      runToken={runToken}
      resetToken={resetToken}
    />
  );
}

export function LivePerformanceRows() {
  const { comparisonData } = useSearchAnimation();

  return (
    <>
      {comparisonData.map((item) => {
        const bfsValue = Number.parseFloat(item.bfs);
        const astarValue = Number.parseFloat(item.astar);
        const bfsFinalValue = Number.parseFloat(item.bfsFinal);
        const astarFinalValue = Number.parseFloat(item.astarFinal);
        const scaleMax = Math.max(
          bfsValue,
          astarValue,
          bfsFinalValue,
          astarFinalValue,
          1,
        );

        return (
          <section key={item.label}>
            <h3 className="mb-2 text-[11px] font-bold text-[#a5f3fc]">
              {item.label}
              {item.label === 'Execution Time' ? ' (ms)' : ''}
            </h3>

            <div className="mb-2 flex items-center gap-2 text-[10px]">
              <span className="w-7 text-[#7dd3fc]">BFS</span>
              <div className="h-5 flex-1 overflow-hidden rounded-sm border border-cyan-500/15 bg-[#0b1220]">
                <div
                  className="h-full rounded-sm bg-[#67e8f9] shadow-[0_0_8px_rgba(103,232,249,0.6)] transition-[width] duration-200"
                  style={{
                    width: `${Math.min(100, (bfsValue / scaleMax) * 100)}%`,
                  }}
                />
              </div>
              <span className="w-14 font-semibold text-[#7dd3fc]">
                {item.bfs}
              </span>
            </div>

            <div className="flex items-center gap-2 text-[10px]">
              <span className="w-7 text-[#7dd3fc]">A*</span>
              <div className="h-5 flex-1 overflow-hidden rounded-sm border border-cyan-500/15 bg-[#0b1220]">
                <div
                  className="h-full rounded-sm bg-[#22d3ee] shadow-[0_0_8px_rgba(34,211,238,0.6)] transition-[width] duration-200"
                  style={{
                    width: `${Math.min(100, (astarValue / scaleMax) * 100)}%`,
                  }}
                />
              </div>
              <span className="w-14 font-semibold text-[#7dd3fc]">
                {item.astar}
              </span>
            </div>
          </section>
        );
      })}
    </>
  );
}