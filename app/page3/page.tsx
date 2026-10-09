import AStarTreeExplorer from '../../components/AStarTreeExplorer';
import HeuristicExplainer from '../../components/heuristicExplainer/HeuristicExplainer';

type PageThreeProps = {
  searchParams?: Promise<{
    start?: string | string[];
    goal?: string | string[];
  }>;
};

const DEFAULT_START = 'Arad';
const DEFAULT_GOAL = 'Bucharest';

export default async function PageThree({ searchParams }: PageThreeProps) {
  const params = (await searchParams) ?? {};

  const start = (Array.isArray(params.start) ? params.start[0] : params.start) || DEFAULT_START;
  const goal = (Array.isArray(params.goal) ? params.goal[0] : params.goal) || DEFAULT_GOAL;

  return (
    <div className="cyan-scrollbar flex h-screen w-full flex-col overflow-y-auto scroll-smooth bg-[#060a13]">
      <AStarTreeExplorer key={`${start}→${goal}`} start={start} goal={goal} />
      <HeuristicExplainer key={`explainer:${start}→${goal}`} start={start} goal={goal} />
    </div>
  );
}
