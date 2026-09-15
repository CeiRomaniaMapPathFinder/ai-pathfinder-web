import Link from 'next/link';
import { IoIosArrowRoundBack } from 'react-icons/io';
import { CgPerformance } from 'react-icons/cg';
import {
  AStarSearchPlayer,
  BfsSearchPlayer,
  HeuristicExplainerCard,
  LiveComparisonRows,
  LivePerformanceRows,
  MapLegendCard,
  RunBothButton,
  SearchAnimationProvider,
  SearchStatusNote,
  VerdictCard,
} from '../../components/SearchAnimationState';
import { pixelFont } from '../../lib/pixelNetworkTheme';

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
      {/* flex-col: a full-width header row, then a 3-column row below it.
          Each column used to carry its own top margin (and the left column
          additionally had ~130px of its own header stacked above its first
          card), so the three never lined up at the same y — now every
          column sits directly under the one shared header with no margin
          of its own, so their tops match exactly. */}
      <div className={`flex h-screen w-screen flex-col overflow-hidden bg-[#060a13] text-[#e2f8ff] ${pixelFont.className}`}>
        <header className="flex shrink-0 items-center gap-4 px-5 pt-5 pb-4">
          {/* Keeps the current start/goal in the URL so the city-picker page
              can prefill the dropdowns instead of resetting them — this is a
              "go tweak the route" action, not a full reset. */}
          <Link
            href={start && goal ? `/?start=${encodeURIComponent(start)}&goal=${encodeURIComponent(goal)}` : '/'}
            aria-label="Back to map, keeping the selected start and goal cities"
            className="flex shrink-0 items-center gap-2 rounded-[14px] border border-cyan-500/30 bg-[#0b1220] px-3 py-2 text-[11px] font-bold text-[#67e8f9] shadow-[0_0_14px_rgba(34,211,238,0.25)] transition hover:shadow-[0_0_20px_rgba(34,211,238,0.45)]"
          >
            <IoIosArrowRoundBack size={20} color="#67e8f9" />
            Back to Map
          </Link>

          {/* Single compact line instead of the old two-line 30px title —
              it no longer needs to fill a 420px column, just read clearly
              in a slim header bar. Route text is plain inline text (no pill/
              box) — just bolder and brighter than the title to stand out. */}
          <h1 className="flex min-w-0 items-baseline gap-1.5 truncate text-[15px] font-bold tracking-wide text-[#a5f3fc]">
            <span style={{ textShadow: '0 0 10px rgba(34,211,238,0.9), 0 0 20px rgba(34,211,238,0.5)' }}>
              ROUTE COMPARISON
            </span>
            <span className="truncate font-bold text-[#22d3ee]">· {routeText}</span>
          </h1>

          {/* Only visible while the backend request is in flight or failed. */}
          <SearchStatusNote />

          {/* ADDED: drives both panels' playback together (see RunBothButton
              for the toggle-to-"Reset Both" behavior once both are done). */}
          <RunBothButton />
        </header>

        {/* 3-column row — align-items: stretch (the flex default) gives all
            three columns the same top edge and the same height, directly
            below the header. */}
        <div className="flex min-h-0 flex-1 gap-4 px-5 pb-5">
          {/* LEFT: starts immediately with the stats card — no header
              content inside this column anymore. */}
          <div className="cyan-scrollbar flex min-h-0 w-[420px] shrink-0 flex-col gap-3 overflow-y-auto pr-1">
            {/* UNCHANGED content: the existing stats table card — padding and
                row spacing tightened (p-10→p-6, mt-8→mt-5, row py-6→py-3)
                since the wide gaps between rows and the card's bottom edge
                were the main reason the sidebar needed to scroll at all. */}
            <div className="flex h-fit w-full justify-center rounded-[15px] border border-cyan-500/20 bg-[rgba(10,18,32,0.55)] p-6 shadow-[0_0_25px_rgba(34,211,238,0.1)] backdrop-blur-md">
              <div className="w-full">
                <div className="flex flex-col items-center text-center">
                  <p
                    className="text-[22px] font-bold text-[#a5f3fc]"
                    style={{ textShadow: '0 0 8px rgba(34,211,238,0.7)' }}
                  >
                    BFS vs. A*
                  </p>
                  {/* One flowing paragraph (not two hard-split lines) so the
                      browser picks natural break points instead of splitting
                      mid-word ("Breadth-First" / "Search"); text-balance keeps
                      the wrapped lines even, and the narrower measure + looser
                      leading/tracking make the pixel font easier to scan. */}
                  <p className="mt-2 max-w-[220px] text-[10px] leading-[1.6] tracking-wide text-balance text-[#7dd3fc]">
                    Algorithm comparison between Breadth-First Search and Custom Heuristic Search.
                  </p>
                </div>

                <div className="mt-5 grid grid-cols-3 border-b border-cyan-500/20 pb-3 text-center text-[11px] font-bold text-[#e2f8ff]">
                  <div />
                  <div>BFS</div>
                  <div>A*</div>
                </div>

                {/* ADDED: values now follow the current animation step */}
                <LiveComparisonRows />
              </div>
            </div>

            {/* ADDED: one-line auto-generated verdict, computed from the
                same comparisonData the stats table above already uses. */}
            <VerdictCard />

            {/* ADDED: key for the icons drawn on the map, reusing the exact
                same icon assets the map itself renders. */}
            <MapLegendCard />

            {/* ADDED: short collapsible explaining how A* picks its path
                vs. BFS's blind hop-count search. */}
            <HeuristicExplainerCard />
          </div>

          {/* MIDDLE: same place as the original BFS/A* cards. min-h-0 is the
              fix for the panels getting compressed — without it, a flex
              item's default min-height:auto lets its content (two flex-1
              map cards) refuse to shrink to the row's actual height, so the
              cards sized off their own intrinsic content instead of filling
              the space now that a header row eats part of the viewport. */}
          <main className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden rounded-[15px]">
            {/* ADDED: original BFS card upgraded to the full animation player */}
            <BfsSearchPlayer />

            {/* ADDED: original A* card upgraded to the full animation player */}
            <AStarSearchPlayer />
          </main>

          {/* RIGHT SIDE: original PageTwo performance section stays here */}
          <aside className="flex w-[380px] shrink-0 flex-col rounded-[15px] border border-cyan-500/20 bg-[rgba(10,18,32,0.55)] p-6 shadow-[0_0_25px_rgba(34,211,238,0.1)] backdrop-blur-md">
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
              <p className="text-[10px] text-[#5b7a94]">
                Path cost and explored nodes follow the current animation step.
              </p>
            </div>

            <div className="flex flex-1 flex-col justify-around">
              {/* ADDED: bars and values update live with BFS/A* playback */}
              <LivePerformanceRows />
            </div>
          </aside>
        </div>
      </div>
    </SearchAnimationProvider>
  );
}
