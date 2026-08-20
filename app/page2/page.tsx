type PageTwoProps = {
  searchParams?: Promise<{ start?: string | string[]; goal?: string | string[] }>;
};

export default async function PageTwo({ searchParams }: PageTwoProps) {
  const params = (await searchParams) ?? {};
  const start = Array.isArray(params.start) ? params.start[0] : params.start;
  const goal = Array.isArray(params.goal) ? params.goal[0] : params.goal;
  const routeText = start && goal ? `${start} -> ${goal}` : 'Please select cities from the main page';

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
        <div className='m-20'>
          <p className='mb-2 text-xl font-bold text-[48px]'>ROUTE</p>
          <p className='mb-2 text-xl font-bold text-[48px]'>COMPARISON</p>
          <p className='mb-14 text-gray-600'>{routeText}</p>
          <div className="w-[500px] h-fit p-20 flex  rounded-[15px] bg-[#ffffff] justify-center">
              <div>
                  <div className='flex flex-col items-center '>
                      <p className='text-[40px] font-bold'>BFS vs. A*</p>
                      <p>Algorithm Comparison between Breadth-First</p>
                      <p>Search and Custom Heuristic Search</p>
                  </div>
                  <div className="grid grid-cols-3 mt-10 pb-4 border-b text-center font-bold">
                  <div />
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
        <div className='flex flex-col'>
          <div className="w-[500px] h-fit p-20 flex m-20 rounded-[15px] bg-[#ffffff] justify-center">

          </div>
          <div className="w-[500px] h-fit p-20 flex m-20 rounded-[15px] bg-[#ffffff] justify-center">

          </div>
        </div>
        
    </div>
  );
}
