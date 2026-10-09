import mockSearchResponse from './mockSearchResponse.json';
import {
  describeFailure,
  mapAStarResponse,
  mapBfsResponse,
  mapCompareResponse,
  type AStarResponse,
  type BfsResponse,
  type CompareResponse,
} from './searchAdapter';

export type SearchTraceStep = {
  currentNode: string | null;
  frontier: string[];
  explored: string[];
  path: string[];
  finalPath: string[];
  pathCost: number;
  nodesExplored: number;
  done: boolean;
};

export type AlgorithmResult = {
  steps: SearchTraceStep[];
  executionTimeMs: number;
  memoryUsageKb: number;
  timedRuns: number;
  nodesExpanded: number;
  nodesGenerated: number;
  peakNodesStored: number;
  heuristicPrecomputeMs?: number;
};

export type SearchComparisonResponse = {
  bfs: AlgorithmResult;
  astar: AlgorithmResult;
};

type MockSearchResponse = SearchComparisonResponse & { start: string; goal: string };

const fixture = mockSearchResponse as MockSearchResponse;

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const FIXTURE_LATENCY_MS = 150;

function normalizeSteps(steps: SearchTraceStep[]): SearchTraceStep[] {
  return steps.map((step, index) => ({ ...step, done: index === steps.length - 1 }));
}

function normalize(response: SearchComparisonResponse): SearchComparisonResponse {
  return {
    bfs: { ...response.bfs, steps: normalizeSteps(response.bfs.steps) },
    astar: { ...response.astar, steps: normalizeSteps(response.astar.steps) },
  };
}

async function loadFixture(start: string, goal: string): Promise<SearchComparisonResponse> {
  await new Promise((resolve) => setTimeout(resolve, FIXTURE_LATENCY_MS));

  if (start !== fixture.start || goal !== fixture.goal) {
    throw new Error(
      `no offline data for ${start} → ${goal}. Until the backend is connected, only ` +
        `${fixture.start} → ${fixture.goal} is available.`,
    );
  }

  return { bfs: fixture.bfs, astar: fixture.astar };
}

export async function fetchSearchComparison(
  start: string,
  goal: string,
  signal?: AbortSignal,
): Promise<SearchComparisonResponse> {
  if (!API_URL) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'NEXT_PUBLIC_API_URL is not set. It is inlined at build time, so rebuild with it set.',
      );
    }
    console.warn('NEXT_PUBLIC_API_URL is not set — serving the offline fixture (Oradea → Bucharest only).');
    return normalize(await loadFixture(start, goal));
  }

  const base = API_URL.replace(/\/+$/, '');
  const query = new URLSearchParams({ start, end: goal }).toString();

  const bfs = await getJson<BfsResponse>(`${base}/api/blind-search?${query}`, base, signal);
  const astar = await getJson<AStarResponse>(`${base}/api/heuristic-search?${query}`, base, signal);
  const cost = mapCompareResponse(await getJson<CompareResponse>(`${base}/api/compare?${query}`, base, signal));

  return normalize({
    bfs: { ...mapBfsResponse(bfs, start, goal), ...cost.bfs },
    astar: { ...mapAStarResponse(astar, start), ...cost.astar },
  });
}

async function getJson<T>(url: string, base: string, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { signal });
  } catch (cause) {
    if (signal?.aborted) throw cause;
    throw new Error(`Could not reach the search backend at ${base}.`);
  }

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new Error(describeFailure(response.status, body));
  return body as T;
}
