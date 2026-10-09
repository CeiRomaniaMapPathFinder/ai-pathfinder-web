import mockAStarTreeResponse from './mockAStarTreeResponse.json';

export type TreeEntry = {
  name: string;
  g: number;
  h: number;
  f: number;
  expandedAt: number;
};

export type RouteStep = TreeEntry[];

export type AStarTreeResponse = {
  start: string;
  goal: string;
  routes: RouteStep[];
  path: string[];
  distance: number;
};

type RawRoutes = unknown[] | Record<string, unknown>;

type RawResponse = {
  start?: string;
  goal?: string;
  routes: RawRoutes;
  path?: unknown;
  distance?: unknown;
};

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

export function normalizeRoutes(routes: RawRoutes): RouteStep[] {
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

export const SAMPLE_ROUTES: { start: string; goal: string }[] = fixtures.map(({ start, goal }) => ({ start, goal }));

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const USING_SAMPLE_DATA = !API_URL;

const FIXTURE_LATENCY_MS = 150;

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
