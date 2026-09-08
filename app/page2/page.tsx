import Link from 'next/link';
import { SiApachespark } from 'react-icons/si';
import { IoIosArrowRoundBack } from 'react-icons/io';
import { CgPerformance } from 'react-icons/cg';
import {
  AStarSearchPlayer,
  BfsSearchPlayer,
  LiveComparisonRows,
  LivePerformanceRows,
  SearchAnimationProvider,
} from '../../components/SearchAnimationState';

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
      <div className="flex h-screen w-screen flex-row overflow-hidden bg-[#eeeeee]">
        <Link href="/" aria-label="Back to map" className="m-5 h-fit shrink-0">
          <button type="button" className="flex rounded-[20px] bg-black p-1">
            <IoIosArrowRoundBack size={30} color="#ffffff" />
          </button>
        </Link>

        {/* LEFT SIDE: original PageTwo structure stays here */}
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

              {/* ADDED: values now follow the current animation step */}
              <LiveComparisonRows />
            </div>
          </div>
        </div>

        {/* MIDDLE: same place as the original BFS/A* cards */}
        <main className="m-5 flex min-w-0 flex-1 flex-col gap-3 overflow-hidden rounded-[15px]">
          {/* ADDED: original BFS card upgraded to the full animation player */}
          <BfsSearchPlayer />

          {/* ADDED: original A* card upgraded to the full animation player */}
          <AStarSearchPlayer />
        </main>

        {/* RIGHT SIDE: original PageTwo performance section stays here */}
        <aside className="mt-5 mr-5 flex h-[calc(100vh-2.5rem)] w-[440px] shrink-0 flex-col rounded-[15px] bg-white p-6 shadow-sm">
          <div className="mb-8 flex flex-col gap-2">
            <h2 className="text-[45px] font-bold leading-tight">Performance</h2>
            <div className="flex flex-row items-center">
              <h2 className="text-[45px] font-bold leading-tight">Overview</h2>
              <CgPerformance size={36} className="mt-2 ml-3" />
            </div>
            <p className="text-xs text-gray-400">
              Path cost and explored nodes follow the current animation step.
            </p>
          </div>

          <div className="flex flex-1 flex-col justify-around">
            {/* ADDED: bars and values update live with BFS/A* playback */}
            <LivePerformanceRows />
          </div>
        </aside>
      </div>
    </SearchAnimationProvider>
  );
}