'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import { SiApachespark } from 'react-icons/si';
import { IoIosArrowRoundBack } from 'react-icons/io';
import { CgPerformance } from 'react-icons/cg';
import SearchPlayer from './SearchPlayer';
import { buildAStarTrace, buildBfsTrace, type SearchTraceStep } from './routePath';

type Props = {
  start?: string;
  goal?: string;
};

type LiveState = {
  step?: SearchTraceStep;
  index: number;
};

export default function SearchComparisonClient({ start, goal }: Props) {
  const routeText = start && goal ? `${start} → ${goal}` : 'Please select cities from the main page';

  const bfsTrace = useMemo(() => start && goal ? buildBfsTrace(start, goal) : [], [start, goal]);
  const astarTrace = useMemo(() => start && goal ? buildAStarTrace(start, goal) : [], [start, goal]);

  const [activePlayer, setActivePlayer] = useState<'bfs' | 'astar'>('bfs');
  const [bfsLive, setBfsLive] = useState<LiveState>({ index: 0 });
  const [astarLive, setAstarLive] = useState<LiveState>({ index: 0 });

  const handleBfsStep = useCallback((step: SearchTraceStep | undefined, index: number) => {
    setBfsLive({ step, index });
  }, []);

  const handleAStarStep = useCallback((step: SearchTraceStep | undefined, index: number) => {
    setAstarLive({ step, index });
  }, []);

  const bfsFinal = bfsTrace.at(-1);
  const astarFinal = astarTrace.at(-1);

  const comparisonData = [
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
    <div className="flex h-screen w-screen flex-row overflow-hidden bg-[#eeeeee]">
      <Link href="/" aria-label="Back to map" className="m-5 h-fit shrink-0">
        <button type="button" className="flex rounded-[20px] bg-black p-1">
          <IoIosArrowRoundBack size={30} color="#ffffff" />
        </button>
      </Link>

      <div className="mt-10 shrink-0">
        <div className="flex flex-row">
          <p className="text-[48px] font-bold">ROUTE</p>
          <SiApachespark size={20} />
        </div>
        <p className="mb-2 text-[48px] font-bold">COMPARISON</p>
        <p className="mb-5 text-2xl text-gray-600">{routeText}</p>

        <div className="flex h-fit w-[500px] justify-center rounded-[15px] bg-white p-14">
          <div className="w-full">
            <div className="flex flex-col items-center">
              <p className="text-[40px] font-bold">BFS vs. A*</p>
              <p>Algorithm Comparison between Breadth-First</p>
              <p>Search and Custom Heuristic Search</p>
            </div>

            <div className="mt-10 grid grid-cols-3 border-b pb-4 text-center font-bold">
              <div />
              <div>BFS</div>
              <div>A*</div>
            </div>

            {comparisonData.map((item) => (
              <div key={item.label} className="grid grid-cols-3 items-center border-b py-7 last:border-b-0">
                <p className="font-semibold">{item.label}</p>
                <p className="text-center font-bold">{item.bfs}</p>
                <p className="text-center font-bold">{item.astar}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <main className="m-5 flex min-w-0 flex-1 flex-col gap-5 overflow-hidden rounded-[15px]">
        <SearchPlayer
          title="Path Found by Breadth First Search (BFS)"
          start={start}
          goal={goal}
          trace={bfsTrace}
          active={activePlayer === 'bfs'}
          onActivate={() => setActivePlayer('bfs')}
          onStepChange={handleBfsStep}
        />
        <SearchPlayer
          title="Path Found by Custom Heuristic Search (A*)"
          start={start}
          goal={goal}
          trace={astarTrace}
          active={activePlayer === 'astar'}
          onActivate={() => setActivePlayer('astar')}
          onStepChange={handleAStarStep}
        />
      </main>

      <aside className="mt-5 mr-5 flex h-[calc(100vh-2.5rem)] w-[440px] shrink-0 flex-col rounded-[15px] bg-white p-6 shadow-sm">
        <div className="mb-8 flex flex-col gap-2">
          <h2 className="text-[45px] font-bold leading-tight">Performance</h2>
          <div className="flex flex-row items-center">
            <h2 className="text-[45px] font-bold leading-tight">Overview</h2>
            <CgPerformance size={36} className="mt-2 ml-3" />
          </div>
          <p className="text-xs text-gray-400">Path cost and explored nodes follow the current animation step.</p>
        </div>

        <div className="flex flex-1 flex-col justify-around">
          {comparisonData.map((item) => {
            const bfsValue = Number.parseFloat(item.bfs);
            const astarValue = Number.parseFloat(item.astar);
            const bfsFinalValue = Number.parseFloat(item.bfsFinal);
            const astarFinalValue = Number.parseFloat(item.astarFinal);
            const scaleMax = Math.max(bfsValue, astarValue, bfsFinalValue, astarFinalValue, 1);

            return (
              <section key={item.label}>
                <h3 className="mb-2 text-sm font-bold">
                  {item.label}{item.label === 'Execution Time' ? ' (ms)' : ''}
                </h3>
                <div className="mb-2 flex items-center gap-2 text-xs">
                  <span className="w-7">BFS</span>
                  <div className="h-5 flex-1 overflow-hidden rounded-sm bg-gray-100">
                    <div className="h-full rounded-sm bg-[#9b9b9b] transition-[width] duration-200" style={{ width: `${Math.min(100, (bfsValue / scaleMax) * 100)}%` }} />
                  </div>
                  <span className="w-14 font-semibold text-[#8b8b8b]">{item.bfs}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-7">A*</span>
                  <div className="h-5 flex-1 overflow-hidden rounded-sm bg-gray-100">
                    <div className="h-full rounded-sm bg-[#696969] transition-[width] duration-200" style={{ width: `${Math.min(100, (astarValue / scaleMax) * 100)}%` }} />
                  </div>
                  <span className="w-14 font-semibold text-[#8b8b8b]">{item.astar}</span>
                </div>
              </section>
            );
          })}
        </div>
      </aside>
    </div>
  );
}