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
import { getRunBothState } from '../lib/playbackStatus';
import { GLASS_CARD } from '../lib/uiTheme';

// Stable reference: a new [] every render would keep resetting SearchPlayer's playback.
const EMPTY_TRACE: SearchTraceStep[] = [];

// LivePerformanceRows reads these back with parseFloat, so keep "<number> <unit>".
const formatUs = (ms: number | undefined) => `${((ms ?? 0) * 1000).toFixed(2)} µs`;
const formatKb = (value: number | undefined) => `${(value ?? 0).toFixed(2)} KB`;

const legendStartIcon = buildDeviceIcon('pc', 'start');
const legendGoalIcon = buildDeviceIcon('server', 'goal');
const legendCurrentIcon = buildDeviceIcon('router', 'current');
const legendFrontierIcon = buildDeviceIcon('router', 'frontier');
const legendVisitedIcon = buildDeviceIcon('router', 'explored');

const BETTER_TEXT = 'text-[#4ade80] [text-shadow:0_0_8px_rgba(74,222,128,0.6)]';

const SIDE_CARD_CLASS = `${GLASS_CARD} p-5`;
const SIDE_CARD_TITLE_GLOW = { textShadow: '0 0 8px rgba(34,211,238,0.7)' } as const;

type Algorithm = 'bfs' | 'astar';

type SearchStatus = 'idle' | 'loading' | 'ready' | 'error';

type LiveState = {
  step?: SearchTraceStep;
  index: number;
};

type Winner = 'bfs' | 'astar' | null;

type ComparisonItem = {
  label: string;
  hint: string;
  bfs: string;
  astar: string;
  bfsFinal: string;
  astarFinal: string;
  better: Winner;
};

function lowerWins(bfs: number | undefined, astar: number | undefined, judge = true): Winner {
  if (!judge || bfs === undefined || astar === undefined || bfs === astar) return null;
  return bfs < astar ? 'bfs' : 'astar';
}

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
  bothComplete: boolean;
  canRunBoth: boolean;
  runToken: number;
  resetToken: number;
  runBoth: () => void;
  resetBoth: () => void;
  status: SearchStatus;
  error: string | null;
  heuristicPrecomputeMs?: number;
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
  const [result, setResult] = useState<SearchComparisonResponse | null>(null);
  const [status, setStatus] = useState<SearchStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!start || !goal) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResult(null);
      setStatus('idle');
      setError(null);
      return;
    }

    const controller = new AbortController();
    setResult(null);
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

  const { canRunBoth, bothComplete } = getRunBothState(bfsTrace, astarTrace, bfsLive.step, astarLive.step);

  const bothFinished = Boolean(bfsLive.step?.done && astarLive.step?.done);

  const comparisonData: ComparisonItem[] = [
    {
      label: 'Path Cost',
      hint: 'Total road distance.',
      better: lowerWins(bfsFinal?.pathCost, astarFinal?.pathCost, bothFinished),
      bfs: String(bfsLive.step?.pathCost ?? 0),
      astar: String(astarLive.step?.pathCost ?? 0),
      bfsFinal: String(bfsFinal?.pathCost ?? 0),
      astarFinal: String(astarFinal?.pathCost ?? 0),
    },
    {
      label: 'Nodes Expanded',
      hint: 'Cities explored (A* counts the goal too).',
      better: lowerWins(bfsFinal?.nodesExplored, astarFinal?.nodesExplored, bothFinished),
      bfs: String(bfsLive.step?.nodesExplored ?? 0),
      astar: String(astarLive.step?.nodesExplored ?? 0),
      bfsFinal: String(bfsFinal?.nodesExplored ?? 0),
      astarFinal: String(astarFinal?.nodesExplored ?? 0),
    },
    {
      label: 'Peak Nodes Stored',
      hint: 'Most cities kept in memory at once.',
      better: lowerWins(result?.bfs.peakNodesStored, result?.astar.peakNodesStored),
      bfs: String(result?.bfs.peakNodesStored ?? 0),
      astar: String(result?.astar.peakNodesStored ?? 0),
      bfsFinal: String(result?.bfs.peakNodesStored ?? 0),
      astarFinal: String(result?.astar.peakNodesStored ?? 0),
    },
    {
      label: 'Memory Allocated',
      hint: 'Memory used per search.',
      better: lowerWins(result?.bfs.memoryUsageKb, result?.astar.memoryUsageKb),
      bfs: formatKb(result?.bfs.memoryUsageKb),
      astar: formatKb(result?.astar.memoryUsageKb),
      bfsFinal: formatKb(result?.bfs.memoryUsageKb),
      astarFinal: formatKb(result?.astar.memoryUsageKb),
    },
    {
      label: 'Search Time',
      hint: 'Median time per search, BFS and A* timed together.',
      better: lowerWins(result?.bfs.executionTimeMs, result?.astar.executionTimeMs),
      bfs: formatUs(result?.bfs.executionTimeMs),
      astar: formatUs(result?.astar.executionTimeMs),
      bfsFinal: formatUs(result?.bfs.executionTimeMs),
      astarFinal: formatUs(result?.astar.executionTimeMs),
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
        canRunBoth,
        runToken,
        resetToken,
        runBoth,
        resetBoth,
        status,
        error,
        heuristicPrecomputeMs: result?.astar.heuristicPrecomputeMs,
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
          <p className={`text-center font-bold ${item.better === 'bfs' ? BETTER_TEXT : 'text-[#67e8f9]'}`}>{item.bfs}</p>
          <p className={`text-center font-bold ${item.better === 'astar' ? BETTER_TEXT : 'text-[#22d3ee]'}`}>{item.astar}</p>
        </div>
      ))}
    </>
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

export function MeasurementNote() {
  const { heuristicPrecomputeMs } = useSearchAnimation();
  const precompute = heuristicPrecomputeMs === undefined ? '' : ` (${heuristicPrecomputeMs.toFixed(1)} ms)`;

  return (
    <div className="flex flex-col gap-1 text-[9px] leading-relaxed text-[#5b7a94]">
      <p>Lower is better.</p>
      <p>Time and memory: search only, measured on the server.</p>
      <p>Not included: A*&apos;s one-time heuristic setup{precompute}.</p>
    </div>
  );
}

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
          g(n) is the cost already spent, h(n) is a heuristic estimate of what&apos;s left — ours is a football
          model: each city is scored by how likely a possession starting there is to reach the goal city, so A*
          favors cities with good onward routes.
        </p>
        <p className="text-[#5b7a94]">
          Note: longer roads are harder passes, and cities near the goal make better targets.
        </p>
      </div>
    </details>
  );
}

export function RunBothButton() {
  const { runBoth, resetBoth, bothComplete, canRunBoth, status } = useSearchAnimation();
  const ready = status === 'ready' && canRunBoth;

  return (
    <button
      type="button"
      onClick={bothComplete ? resetBoth : runBoth}
      disabled={!ready}
      className="ml-auto flex shrink-0 items-center gap-2 rounded-[14px] bg-[#0891b2] px-3 py-2 text-[10px] sm:px-4 sm:text-[11px] font-bold text-[#f0fdff] shadow-[0_0_14px_rgba(34,211,238,0.4)] transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-30 disabled:shadow-none"
    >
      {bothComplete ? <TbRefresh size={14} /> : <TbPlayerPlayFilled size={12} />}
      {bothComplete ? 'Reset Both' : 'Run Both'}
    </button>
  );
}

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
        const scaleMax = Math.max(bfsValue, astarValue, bfsFinalValue, astarFinalValue) || 1;

        return (
          <section key={item.label}>
            <div className="mb-2">
              <h3 className="text-[11px] font-bold text-[#a5f3fc]">{item.label}</h3>
              <p className="text-[9px] text-[#5b7a94]">{item.hint}</p>
            </div>

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
              <span className="w-16 whitespace-nowrap font-semibold text-[#7dd3fc]">
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
              <span className="w-16 whitespace-nowrap font-semibold text-[#7dd3fc]">
                {item.astar}
              </span>
            </div>
          </section>
        );
      })}
    </>
  );
}