// ─── The contract with the A* search-tree backend ────────────────────────
//
// This is the ONLY file that knows how the search-tree page (app/page3)
// talks to the backend. Everything the page draws — every box, every edge,
// every f = g + h label and the step-by-step playback — is derived from the
// `routes` trace that arrives through here (see lib/searchTree.ts).
//
// The shape follows the backend's own trace, one list per expansion:
//
//   routes = {
//     0: [Arad(0,453,453|0),   Sibiu(140,302,442|1), Timisoara(…|-1), …],
//     1: [Sibiu(140,302,442|1), Arad(280,453,733|-1), Fagaras(…|-1), …],
//     …
//   }
//
// i.e. routes[step][0] is the node expanded at that step and the rest are the
// neighbours it generated, each carrying Name(g, h, f | expandedAt).
// lib/mockAStarTreeResponse.json holds complete examples (Arad → Bucharest,
// Oradea → Bucharest) — each entry of its `routes` is one real response.
//
// Same backend, same env var as lib/searchApi.ts: NEXT_PUBLIC_API_URL, calling
// ${API_URL}/api/heuristic-search. Unset in dev, this serves the fixture below;
// unset in production, it throws instead.
//
// The backend's own field names (town, gn, hn, fn) are mapped to this page's
// internal ones (name, g, h, f) in toTreeEntry — that single function is the
// whole mapping, so a future field rename only touches this file.

import mockAStarTreeResponse from './mockAStarTreeResponse.json';

/** One `Name(g, h, f | expandedAt)` entry of the trace. */
export type TreeEntry = {
  /** City name — must match lib/cityPositions.ts ids ("Rimnicu Vilcea"). */
  name: string;
  /** Path cost from the start to this node along this branch. */
  g: number;
  /** Heuristic estimate from this node to the goal. */
  h: number;
  /** g + h — the priority A* orders its queue by. */
  f: number;
  /** Step at which this node was popped and expanded, or -1 if never. */
  expandedAt: number;
};

/** One list of the trace: `[expandedParent, ...generatedChildren]`. */
export type RouteStep = TreeEntry[];

export type AStarTreeResponse = {
  start: string;
  goal: string;
  /** Indexed by step. routes[i][0] is the node expanded at step i. */
  routes: RouteStep[];
  path: string[];
  distance: number;
};

/**
 * Accepts routes either as an array of lists or as an object keyed by
 * step number ({"0": [...], "1": [...]}) — the latter is what a Java
 * Map<Integer, List<Node>> serialises to with Jackson.
 */
type RawRoutes = unknown[] | Record<string, unknown>;

type RawResponse = {
  start?: string;
  goal?: string;
  routes: RawRoutes;
  path?: unknown;
  distance?: unknown;
};

/** Maps one raw trace entry to a TreeEntry. Adjust field names here. */
function toTreeEntry(raw: unknown): TreeEntry {
  const entry = raw as Record<string, unknown>;
  const g = Number(entry.gn);
  const h = Number(entry.hn);

  return {
    name: String(entry.town),
    g,
    h,
    // Tolerate a backend that omits fn — it's always g + h.
    f: entry.fn === undefined ? g + h : Number(entry.fn),
    expandedAt: entry.expandedAt === undefined ? -1 : Number(entry.expandedAt),
  };
}

function normalizeRoutes(routes: RawRoutes): RouteStep[] {
  const lists = Array.isArray(routes)
    ? routes
    : Object.keys(routes)
        .sort((a, b) => Number(a) - Number(b))
        .map((key) => routes[key]);

  return lists.map((list) => (Array.isArray(list) ? list.map(toTreeEntry) : []));
}

function normalize(raw: RawResponse, start: string, goal: string): AStarTreeResponse {
  return {
    start: raw.start ?? start,
    goal: raw.goal ?? goal,
    routes: normalizeRoutes(raw.routes),
    path: Array.isArray(raw.path) ? raw.path.map(String) : [],
    distance: Number(raw.distance ?? NaN),
  };
}

type SampleRoute = RawResponse & { start: string; goal: string };

const fixtures = (mockAStarTreeResponse as { routes: SampleRoute[] }).routes;

/** Routes the offline fixture can serve — used to offer them on errors. */
export const SAMPLE_ROUTES: { start: string; goal: string }[] = fixtures.map(({ start, goal }) => ({ start, goal }));

const API_URL = process.env.NEXT_PUBLIC_API_URL;

/** True when the page is running on fixture data instead of the backend. */
export const USING_SAMPLE_DATA = !API_URL;

/** Fake network latency, so the loading state actually gets exercised in dev. */
const FIXTURE_LATENCY_MS = 150;

/** Only knows the routes the fixture was captured for. */
async function loadFixture(start: string, goal: string): Promise<RawResponse> {
  await new Promise((resolve) => setTimeout(resolve, FIXTURE_LATENCY_MS));

  const fixture = fixtures.find((sample) => sample.start === start && sample.goal === goal);
  if (!fixture) {
    const available = SAMPLE_ROUTES.map((sample) => `${sample.start} → ${sample.goal}`).join(', ');
    throw new Error(
      `no offline data for ${start} → ${goal}. Until the backend is connected, only ${available} ` +
        'are available.',
    );
  }

  return fixture;
}

/**
 * Fetches the A* search tree for one route. Uses the local fixture when no
 * API URL is configured — never as a silent fallback when a URL *is* set,
 * so a backend that's down shows as an error rather than stale sample data.
 */
export async function fetchAStarTree(
  start: string,
  goal: string,
  signal?: AbortSignal,
): Promise<AStarTreeResponse> {
  if (!API_URL) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'NEXT_PUBLIC_API_URL is not set. It is inlined at build time, so rebuild with it set.',
      );
    }
    console.warn('NEXT_PUBLIC_API_URL is not set — serving the offline fixture.');
    return normalize(await loadFixture(start, goal), start, goal);
  }

  const base = API_URL.replace(/\/+$/, '');
  const query = new URLSearchParams({ start, end: goal }).toString();
  const response = await fetch(`${base}/api/heuristic-search?${query}`, { signal });

  if (!response.ok) {
    throw new Error(`Search backend returned ${response.status} ${response.statusText}`);
  }

  return normalize((await response.json()) as RawResponse, start, goal);
}
