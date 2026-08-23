'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import SearchPlayer from './SearchPlayer';
import { buildAStarTrace, buildBfsTrace, type SearchTraceStep } from './routePath';

type Algorithm = 'bfs' | 'astar';

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
  const bfsTrace = useMemo(
    () => (start && goal ? buildBfsTrace(start, goal) : []),
    [start, goal],
  );

  const astarTrace = useMemo(
    () => (start && goal ? buildAStarTrace(start, goal) : []),
    [start, goal],
  );

  const [activePlayer, setActivePlayer] = useState<Algorithm>('bfs');
  const [bfsLive, setBfsLive] = useState<LiveState>({ index: 0 });
  const [astarLive, setAstarLive] = useState<LiveState>({ index: 0 });

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
    {
      label: 'Memory Usage',
      bfs: '420 KB',
      astar: '850 KB',
      bfsFinal: '420 KB',
      astarFinal: '850 KB',
    },
    {
      label: 'Execution Time',
      bfs: '5.31 ms',
      astar: '2.31 ms',
      bfsFinal: '5.31 ms',
      astarFinal: '2.31 ms',
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
          className="grid grid-cols-3 items-center border-b py-7 last:border-b-0"
        >
          <p className="font-semibold">{item.label}</p>
          <p className="text-center font-bold">{item.bfs}</p>
          <p className="text-center font-bold">{item.astar}</p>
        </div>
      ))}
    </>
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
            <h3 className="mb-2 text-sm font-bold">
              {item.label}
              {item.label === 'Execution Time' ? ' (ms)' : ''}
            </h3>

            <div className="mb-2 flex items-center gap-2 text-xs">
              <span className="w-7">BFS</span>
              <div className="h-5 flex-1 overflow-hidden rounded-sm bg-gray-100">
                <div
                  className="h-full rounded-sm bg-[#9b9b9b] transition-[width] duration-200"
                  style={{
                    width: `${Math.min(100, (bfsValue / scaleMax) * 100)}%`,
                  }}
                />
              </div>
              <span className="w-14 font-semibold text-[#8b8b8b]">
                {item.bfs}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="w-7">A*</span>
              <div className="h-5 flex-1 overflow-hidden rounded-sm bg-gray-100">
                <div
                  className="h-full rounded-sm bg-[#696969] transition-[width] duration-200"
                  style={{
                    width: `${Math.min(100, (astarValue / scaleMax) * 100)}%`,
                  }}
                />
              </div>
              <span className="w-14 font-semibold text-[#8b8b8b]">
                {item.astar}
              </span>
            </div>
          </section>
        );
      })}
    </>
  );
}