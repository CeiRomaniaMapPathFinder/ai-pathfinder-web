import Link from 'next/link';
import { IoIosArrowRoundBack } from 'react-icons/io';
import { CgPerformance } from 'react-icons/cg';
import { TbHierarchy } from 'react-icons/tb';
import {
  AStarSearchPlayer,
  BfsSearchPlayer,
  HeuristicExplainerCard,
  LiveComparisonRows,
  LivePerformanceRows,
  MeasurementNote,
  MapLegendCard,
  RunBothButton,
  SearchAnimationProvider,
  SearchStatusNote,
} from '../../components/SearchAnimationState';
import { pixelFont } from '../../lib/pixelNetworkTheme';
import { GLASS_CARD } from '../../lib/uiTheme';

type PageTwoProps = {
  searchParams?: Promise<{
    start?: string | string[];
    goal?: string | string[];
  }>;
};

export default async function PageTwo({ searchParams }: PageTwoProps) {
  const params = (await searchParams) ?? {};

  const start = Array.isArray(params.start) ? params.start[0] : params.start;
  const goal = Array.isArray(params.goal) ? params.goal[0] : params.goal;

  const routeText =
    start && goal ? `${start} → ${goal}` : 'Please select cities from the main page';

  return (
    <SearchAnimationProvider start={start} goal={goal}>
      <div className={`flex min-h-screen w-full flex-col bg-[#060a13] text-[#e2f8ff] xl:h-screen xl:overflow-hidden ${pixelFont.className}`}>
        <header className="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-3 px-3 pt-4 pb-3 sm:gap-x-4 sm:px-5 sm:pt-5 sm:pb-4">
          <Link
            href={start && goal ? `/?start=${encodeURIComponent(start)}&goal=${encodeURIComponent(goal)}` : '/'}
            aria-label="Back to map, keeping the selected start and goal cities"
            className="flex shrink-0 items-center gap-2 rounded-[14px] border border-cyan-500/30 bg-[#0b1220] px-2.5 py-2 text-[10px] sm:px-3 sm:text-[11px] font-bold text-[#67e8f9] shadow-[0_0_14px_rgba(34,211,238,0.25)] transition hover:shadow-[0_0_20px_rgba(34,211,238,0.45)]"
          >
            <IoIosArrowRoundBack size={20} color="#67e8f9" />
            <span>
              <span className="hidden sm:inline">Back to </span>Map
            </span>
          </Link>

          <h1 className="order-last flex w-full min-w-0 items-baseline gap-1.5 truncate text-[13px] font-bold tracking-wide text-[#a5f3fc] sm:text-[15px] lg:order-none lg:w-auto">
            <span style={{ textShadow: '0 0 10px rgba(34,211,238,0.9), 0 0 20px rgba(34,211,238,0.5)' }}>
              ROUTE COMPARISON
            </span>
            <span className="truncate font-bold text-[#22d3ee]">· {routeText}</span>
          </h1>

          <SearchStatusNote />

          <RunBothButton />

          <Link
            href={start && goal ? `/page3?start=${encodeURIComponent(start)}&goal=${encodeURIComponent(goal)}` : '/page3'}
            className="flex shrink-0 items-center gap-2 rounded-[14px] border border-cyan-500/30 bg-[#0b1220] px-2.5 py-2 text-[10px] sm:px-3 sm:text-[11px] font-bold text-[#67e8f9] shadow-[0_0_14px_rgba(34,211,238,0.25)] transition hover:shadow-[0_0_20px_rgba(34,211,238,0.45)]"
          >
            <TbHierarchy size={16} color="#67e8f9" className="hidden sm:block" />
            A* Tree
          </Link>
        </header>

        <div className="grid flex-1 grid-cols-1 gap-4 px-3 pb-5 sm:px-5 md:grid-cols-2 xl:min-h-0 xl:grid-cols-[340px_minmax(0,1fr)_340px] xl:grid-rows-[minmax(0,1fr)] 2xl:grid-cols-[380px_minmax(0,1fr)_380px]">
          <div className="cyan-scrollbar flex min-w-0 flex-col gap-3 xl:min-h-0 xl:overflow-y-auto xl:pr-1">
            <div className={`flex h-fit w-full justify-center ${GLASS_CARD} p-6`}>
              <div className="w-full">
                <div className="flex flex-col items-center text-center">
                  <p
                    className="text-[22px] font-bold text-[#a5f3fc]"
                    style={{ textShadow: '0 0 8px rgba(34,211,238,0.7)' }}
                  >
                    BFS vs. A*
                  </p>
                  <p className="mt-2 max-w-[220px] text-[10px] leading-[1.6] tracking-wide text-balance text-[#7dd3fc]">
                    Algorithm comparison between Breadth-First Search and Custom Heuristic Search.
                  </p>
                </div>

                <div className="mt-5 grid grid-cols-3 border-b border-cyan-500/20 pb-3 text-center text-[11px] font-bold text-[#e2f8ff]">
                  <div />
                  <div>BFS</div>
                  <div>A*</div>
                </div>

                <LiveComparisonRows />
              </div>
            </div>

            <MapLegendCard />

            <HeuristicExplainerCard />
          </div>

          <main className="order-first flex min-w-0 flex-col gap-3 rounded-[15px] md:col-span-2 xl:order-none xl:col-span-1 xl:min-h-0 xl:overflow-hidden">
            <BfsSearchPlayer />

            <AStarSearchPlayer />
          </main>

          <aside className={`cyan-scrollbar flex min-w-0 flex-col ${GLASS_CARD} p-6 xl:min-h-0 xl:overflow-y-auto`}>
            <div className="mb-8 flex flex-col gap-2">
              <h2
                className="text-[24px] font-bold leading-tight text-[#a5f3fc]"
                style={{ textShadow: '0 0 8px rgba(34,211,238,0.7)' }}
              >
                Performance
              </h2>
              <div className="flex flex-row items-center">
                <h2
                  className="text-[24px] font-bold leading-tight text-[#a5f3fc]"
                  style={{ textShadow: '0 0 8px rgba(34,211,238,0.7)' }}
                >
                  Overview
                </h2>
                <CgPerformance size={24} color="#67e8f9" className="mt-1 ml-3" />
              </div>
              <MeasurementNote />
            </div>

            <div className="flex flex-1 flex-col justify-around">
              <LivePerformanceRows />
            </div>
          </aside>
        </div>
      </div>
    </SearchAnimationProvider>
  );
}
