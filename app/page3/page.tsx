import AStarTreeExplorer from '../../components/AStarTreeExplorer';
import HeuristicExplainer from '../../components/heuristicExplainer/HeuristicExplainer';

type PageThreeProps = {
  searchParams?: Promise<{
    start?: string | string[];
    goal?: string | string[];
  }>;
};

// With no route in the URL, show the textbook example (Arad → Bucharest) —
// it's also the only route the offline fixture has data for.
const DEFAULT_START = 'Arad';
const DEFAULT_GOAL = 'Bucharest';

export default async function PageThree({ searchParams }: PageThreeProps) {
  const params = (await searchParams) ?? {};

  const start = (Array.isArray(params.start) ? params.start[0] : params.start) || DEFAULT_START;
  const goal = (Array.isArray(params.goal) ? params.goal[0] : params.goal) || DEFAULT_GOAL;

  // The tree fills the first screen; scrolling down reveals how the
  // heuristic behind it works, explained with the same route. Both are keyed
  // by route so switching routes remounts them with fresh state.
  return (
    // Own scroll container (rather than scrolling the document) so the dark
    // background always covers the viewport — the body's own background is
    // the light theme's white.
    <div className="cyan-scrollbar flex h-screen w-full flex-col overflow-y-auto scroll-smooth bg-[#060a13]">
      <AStarTreeExplorer key={`${start}→${goal}`} start={start} goal={goal} />
      <HeuristicExplainer key={`explainer:${start}→${goal}`} start={start} goal={goal} />
    </div>
  );
}
