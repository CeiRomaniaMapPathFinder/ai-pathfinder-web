type PageTwoProps = {
  searchParams?: Promise<{ start?: string | string[]; goal?: string | string[] }>;
};
import Link from 'next/link';
import { SiApachespark } from "react-icons/si";
import { IoIosArrowRoundBack } from "react-icons/io";
import RomaniaMap from '../../components/RomaniaMap';
import { findPathNodes } from '../../components/routePath';

export default async function PageTwo({ searchParams }: PageTwoProps) {
  const params = (await searchParams) ?? {};
  const start = Array.isArray(params.start) ? params.start[0] : params.start;
  const goal = Array.isArray(params.goal) ? params.goal[0] : params.goal;
  const routeText = start && goal ? `${start} -> ${goal}` : 'Please select cities from the main page';
  const pathText = start && goal
    ? findPathNodes(start, goal).join(' -> ')
    : routeText;

  const comparisonData = [
    {
      label: "Path Cost",
      bfs: "500",
      astar: "400",
    },
    {
      label: "Node Explore",
      bfs: "10",
      astar: "8",
    },
    {
      label: "Memory Usage",
      bfs: "420 KB",
      astar: "420 KB",
    },
    {
      label: "Execution Time",
      bfs: "2.31 ms",
      astar: "2.31 ms",
    },
  ];

  return (
    <div className='flex flex-row w-screen h-screen bg-[#eeeeee]'>
        <Link href="/" aria-label="Back to map" className="m-5 h-fit">
          <button type="button" className="flex bg-black rounded-[20] p-1">
            <IoIosArrowRoundBack size={30} color='#ffffff'/>
          </button>
        </Link>
        <div className='ml- mt-10'>
          <div className="flex flex-row">
            <p className=' text-xl font-bold text-[48px]'>ROUTE</p>
            <SiApachespark size={20} />
          </div>
          <p className='mb-2 text-xl font-bold text-[48px]'>COMPARISON</p>
          <p className='mb-5 text-gray-600 text-2xl'>{routeText}</p>
          <div className="w-[500px] h-fit p-18 flex  rounded-[15px] bg-[#ffffff] justify-center">
              <div>
                  <div className='flex flex-col items-center '>
                      <p className='text-[40px] font-bold'>BFS vs. A*</p>
                      <p>Algorithm Comparison between Breadth-First</p>
                      <p>Search and Custom Heuristic Search</p>
                  </div>
                  <div className="grid grid-cols-3 mt-10 pb-4 border-b text-center font-bold">
                  <div/>
                  <div>BFS</div>
                  <div>A*</div>
                  </div>

                  {/* Rows */}
                  {comparisonData.map((item, index) => (
                  <div
                      key={index}
                      className="grid grid-cols-3 items-center py-8 border-b last:border-b-0"
                  >
                      <p className="font-semibold">{item.label}</p>
                      <p className="text-center font-bold">{item.bfs}</p>
                      <p className="text-center font-bold">{item.astar}</p>
                  </div>
                  ))}
              </div>
          </div>
        </div>
        
        <div className='m-5 flex h-[calc(100vh-2.5rem)] w-200 min-w-0 flex-col gap-5 overflow-hidden rounded-[15px]'>
          <div className='flex min-h-0 flex-1 flex-col gap-5 '>
            <div className="flex min-h-0 flex-1 flex-col rounded-[15px] bg-[#ffffff] px-7 pt-5 shadow-sm">
              <p className="text-[22px] font-bold">Path Found by Breadth First Search (BFS)</p>
              <p className="mt-2 text-sm text-gray-500">Path&nbsp;&nbsp; {pathText}</p>
              <div className="min-h-0 flex-1"><RomaniaMap start={start} goal={goal} /></div>
            </div>
            <div className="flex min-h-0 flex-1 flex-col rounded-[15px] bg-[#ffffff] px-7 pt-5 shadow-sm">
              <p className="text-[22px] font-bold">Path Found by Custom Heuristic Search (A*)</p>
              <p className="mt-2 text-sm text-gray-500">Path&nbsp;&nbsp; {pathText}</p>
              <div className="min-h-0 flex-1"><RomaniaMap start={start} goal={goal} /></div>
            </div>
          </div>
        </div>
        
    </div>
  );
}
