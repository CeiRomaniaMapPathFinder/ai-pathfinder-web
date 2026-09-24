import AStarTreeExplorer from '../../components/AStarTreeExplorer';

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

  // Keyed by route so switching routes remounts with fresh playback state.
  return <AStarTreeExplorer key={`${start}→${goal}`} start={start} goal={goal} />;
}
