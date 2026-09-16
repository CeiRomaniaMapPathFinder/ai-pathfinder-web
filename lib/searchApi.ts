// ─── The contract with the search backend ────────────────────────────────
//
// This is the ONLY file that knows how the frontend talks to the search
// service. No search algorithm runs in the frontend at all — every node
// colour, every stat and every animation frame comes from data that arrives
// through here.
//
// Hand the three types below to whoever builds the backend, together with
// lib/mockSearchResponse.json (a complete, real example response for
// Oradea → Bucharest). Matching that shape is the entire integration.
//
// Node names must match the ids in lib/cityPositions.ts exactly ("Rimnicu
// Vilcea" with the space, that capitalisation) — a mismatch means the node
// silently never lights up on the map.
//
// Until the backend exists, leave NEXT_PUBLIC_SEARCH_API_URL unset and this
// serves the JSON fixture. Set the env var and it calls the real service
// instead — no other file in the project changes.

import mockSearchResponse from './mockSearchResponse.json';

/**
 * One frame of the animation: a snapshot of the search taken each time it
 * expands a node. The whole animation is just an array of these, played back
 * over time — the frontend never advances the algorithm itself.
 */
export type SearchTraceStep = {
  /** The node being expanded at this step. Drawn in the "current" colour. */
  currentNode: string | null;
  /** EVERY node currently queued — a cumulative snapshot, not a delta. */
  frontier: string[];
  /** EVERY node expanded so far — a cumulative snapshot, not a delta. */
  explored: string[];
  /** Path from start to currentNode as known at this step. */
  path: string[];
  /** The final start→goal path. Empty except on the last step. */
  finalPath: string[];
  /** Cost of `path` so far. Drives the "Path Cost" stat row. */
  pathCost: number;
  /** How many nodes have been expanded. Drives the "Node Explore" stat row. */
  nodesExplored: number;
  /** True on the final step only — normalised below, so don't sweat it. */
  done: boolean;
};

/** One algorithm's full run: the animation frames plus its measured cost. */
export type AlgorithmResult = {
  steps: SearchTraceStep[];
  /** Real measured wall-clock time on the server. Drives "Execution Time". */
  executionTimeMs: number;
  /** Real measured memory on the server. Drives "Memory Usage". */
  memoryUsageKb: number;
};

/** What a single request returns: both algorithms, for one start/goal pair. */
export type SearchComparisonResponse = {
  bfs: AlgorithmResult;
  astar: AlgorithmResult;
};

/**
 * The fixture additionally records which route it represents, so the stub
 * below can refuse routes it has no data for instead of silently returning
 * the wrong cities. The real backend does not need to send these.
 */
type MockSearchResponse = SearchComparisonResponse & { start: string; goal: string };

const fixture = mockSearchResponse as MockSearchResponse;

const API_URL = process.env.NEXT_PUBLIC_SEARCH_API_URL;

/** Fake network latency, so loading states actually get exercised in dev. */
const FIXTURE_LATENCY_MS = 150;

/**
 * `done` gates the verdict card, the Run Both → Reset Both toggle, and when
 * the final path lights up on the map — so rather than trusting the backend
 * to flag exactly the last step and nothing else, it gets derived here.
 * One place to fix it, every consumer stays correct.
 */
function normalizeSteps(steps: SearchTraceStep[]): SearchTraceStep[] {
  return steps.map((step, index) => ({ ...step, done: index === steps.length - 1 }));
}

function normalize(response: SearchComparisonResponse): SearchComparisonResponse {
  return {
    bfs: { ...response.bfs, steps: normalizeSteps(response.bfs.steps) },
    astar: { ...response.astar, steps: normalizeSteps(response.astar.steps) },
  };
}

/**
 * Stands in for the backend until it exists. Only knows the one route the
 * fixture was captured for — any other route fails loudly rather than
 * returning cities that don't match what the user picked.
 */
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

/**
 * Fetches both algorithm runs for one route. Uses the local fixture when no
 * API URL is configured — deliberately NOT a silent fallback when a URL *is*
 * set, so a real backend being down surfaces as an error instead of quietly
 * showing stale sample data.
 */
export async function fetchSearchComparison(
  start: string,
  goal: string,
  signal?: AbortSignal,
): Promise<SearchComparisonResponse> {
  if (!API_URL) {
    return normalize(await loadFixture(start, goal));
  }

  const query = new URLSearchParams({ start, goal });
  const response = await fetch(`${API_URL}?${query.toString()}`, { signal });

  if (!response.ok) {
    throw new Error(`Search backend returned ${response.status} ${response.statusText}`);
  }

  return normalize((await response.json()) as SearchComparisonResponse);
}
