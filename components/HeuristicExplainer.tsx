'use client';

// The "how does this heuristic actually work" section that sits one screen
// below the search tree on /page3. Content is the xGT-v2b write-up from the
// backend's own guide (Java and Project Guide, ai-pathfinder-api, ch. 5-7) —
// the numbers here are fixed properties of the heuristic, not per-request
// data, so nothing is fetched.
//
// Laid out as a document, not a dashboard: a hero with the headline numbers,
// then numbered chapters read top to bottom, with a sticky contents rail on
// wide screens. The section sits on its own lighter, gridded surface behind a
// glowing seam so it never reads as more of the tree above.
//
// Body copy deliberately drops the pixel font (Press Start 2P is unreadable
// at paragraph length) and uses the app's Geist Sans; headings keep it so
// the section still reads as part of the same product.

import { useEffect, useState, type ReactNode } from 'react';
import {
  TbAlertTriangle,
  TbArrowDown,
  TbArrowRight,
  TbArrowUp,
  TbBallFootball,
  TbBan,
  TbChartBar,
  TbInfoCircle,
  TbListNumbers,
  TbMathFunction,
  TbRoute,
  TbTable,
} from 'react-icons/tb';
import { pixelFont } from '../lib/pixelNetworkTheme';
import { GLASS_CARD } from '../lib/uiTheme';

const PIXEL = pixelFont.className;
const MONO = { fontFamily: 'var(--font-geist-mono), ui-monospace, monospace' };
const GLOW = { textShadow: '0 0 8px rgba(34,211,238,0.7)' };

/** Faint blueprint grid — the explainer's surface, distinct from the tree's flat black. */
const GRID_SURFACE = {
  backgroundImage:
    'linear-gradient(rgba(34,211,238,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.04) 1px, transparent 1px)',
  backgroundSize: '40px 40px',
};

const GAMMA = 0.01;
const hFromXgt = (xgt: number) => Math.floor(-Math.log(xgt) / GAMMA + 0.5);

/** h for goal = Bucharest — the table the sample route on this page uses. */
const H_TABLE: [string, number][] = [
  ['Bucharest', 0],
  ['Urziceni', 89],
  ['Giurgiu', 90],
  ['Pitesti', 106],
  ['Hirsova', 193],
  ['Rimnicu Vilcea', 212],
  ['Fagaras', 219],
  ['Vaslui', 237],
  ['Craiova', 256],
  ['Eforie', 279],
  ['Sibiu', 302],
  ['Iasi', 335],
  ['Drobeta', 384],
  ['Neamt', 422],
  ['Arad', 453],
  ['Oradea', 464],
  ['Mehadia', 467],
  ['Zerind', 531],
  ['Lugoj', 542],
  ['Timisoara', 584],
];
const MAX_H = Math.max(...H_TABLE.map(([, h]) => h));

/** Real roads from the map, to show how pass completion falls with length. */
const PASS_EXAMPLES: [string, number][] = [
  ['Arad – Zerind', 75],
  ['Arad – Sibiu', 140],
  ['Fagaras – Bucharest', 211],
];

/** xGT values run through the h formula, to show what the logarithm does. */
const XGT_EXAMPLES = [1, 0.5, 0.25, 0.1, 0.01];

/** Average cities expanded over all 380 start/goal pairs. */
const EXPANSIONS: { label: string; value: number; ours?: boolean }[] = [
  { label: 'xGT-v2b (ours)', value: 4.94, ours: true },
  { label: 'Straight-line distance', value: 6.8 },
  { label: 'Uniform cost (no h)', value: 11.0 },
];
const MAX_EXPANSIONS = Math.max(...EXPANSIONS.map((row) => row.value));

const CONSTANTS: [string, string, string][] = [
  ['β', '0.02', 'prefers short roads'],
  ['γ', '0.01', 'pass decay — also the unit of h'],
  ['τ', '1.5', 'prefers receivers close to the goal'],
];

const BUILD_STEPS: { title: string; body: ReactNode }[] = [
  {
    title: 'Seed',
    body: (
      <>
        <span style={MONO}>xGT[goal] = 1.0</span>, every other city starts at <span style={MONO}>0.001</span>.
      </>
    ),
  },
  {
    title: 'Spread',
    body: 'Each non-goal city splits its passes over its neighbours by preference, then collects the threat that comes back.',
  },
  {
    title: 'Repeat',
    body: (
      <>
        Until the largest change is under <span style={MONO}>1e-12</span> — in practice 34 to 40 rounds.
      </>
    ),
  },
  {
    title: 'Convert',
    body: (
      <>
        Every value becomes an integer h; negatives clamp to 0 and <span style={MONO}>h[goal] = 0</span>.
      </>
    ),
  },
];

const SEARCH_RULES = [
  {
    head: 'f = g + h',
    body: 'g is the distance already driven, h is the guess for what is left. The queue is ordered by f, so A* always opens the city that looks best overall — not the nearest one.',
  },
  {
    head: 'Goal test on pop',
    body: 'Seeing the goal is not enough; A* stops only when the goal is the smallest f in the queue. Stopping earlier could return a route that is not the cheapest.',
  },
  {
    head: 'Alphabetical neighbours',
    body: 'The road map has no fixed order, so neighbours are visited in name order. That makes the tree identical on every run, and it settles the map’s single f-tie correctly.',
  },
];

const NEVER_USED: [string, string][] = [
  ['No shortest paths', 'No Dijkstra result as input — that would be answering the question with the answer.'],
  ['No coordinates', 'No straight-line distances either. The map in the code has none.'],
  ['No rescaling', 'Nothing adjusted afterwards to make the numbers look nicer.'],
];

const CHAPTERS = [
  { id: 'hiw-idea', title: 'The idea', icon: TbBallFootball },
  { id: 'hiw-h', title: 'From probability to h', icon: TbMathFunction },
  { id: 'hiw-build', title: 'Building the table', icon: TbListNumbers },
  { id: 'hiw-table', title: 'The Bucharest table', icon: TbTable },
  { id: 'hiw-search', title: 'How A* uses it', icon: TbRoute },
  { id: 'hiw-results', title: 'How well it works', icon: TbChartBar },
  { id: 'hiw-never', title: 'What it never uses', icon: TbBan },
] as const;

type ChapterId = (typeof CHAPTERS)[number]['id'];

/**
 * Which chapter is under the reading line (a thin band ~40% down the
 * viewport). The observer's implicit root is the viewport, which still works
 * though the page scrolls inside its own container rather than the document.
 */
function useActiveChapter(): ChapterId {
  const [active, setActive] = useState<ChapterId>(CHAPTERS[0].id);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id as ChapterId);
        }
      },
      { rootMargin: '-38% 0px -58% 0px' },
    );
    for (const { id } of CHAPTERS) {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, []);

  return active;
}

export default function HeuristicExplainer() {
  const active = useActiveChapter();

  return (
    <section
      id="how-it-works"
      className="relative w-full shrink-0 border-t border-cyan-400/50 bg-[#0a1322] text-[#cbe7f5]"
      style={GRID_SURFACE}
    >
      {/* The seam: a glowing edge, light spilling down onto the new surface,
          and a tab hanging from the line so the change of mode is explicit.
          Everything here extends downward only — anything reaching above
          the line pokes into the tree's first screen and covers the trace,
          so the glow is a gradient strip below the line, not a box-shadow
          (which blurs in every direction). */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-px h-px bg-cyan-300/80" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-5 bg-gradient-to-b from-cyan-400/30 to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-cyan-400/[0.09] to-transparent"
      />
      <div className="absolute top-0 left-1/2 z-10 -translate-x-1/2">
        <span
          className={`flex items-center gap-2 rounded-b-[14px] border border-t-0 border-cyan-300/60 bg-[#060a13] px-5 py-3 text-[9px] tracking-widest whitespace-nowrap text-[#a5f3fc] shadow-[0_14px_20px_-6px_rgba(34,211,238,0.4)] ${PIXEL}`}
          style={GLOW}
        >
          <TbArrowDown size={12} />
          HOW IT WORKS
        </span>
      </div>

      <div className="relative mx-auto w-full max-w-[1240px] px-5 pt-20 pb-12 sm:px-8">
        <Hero />

        <div className="mt-16 grid gap-10 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-14">
          <ContentsRail active={active} />

          <div className="min-w-0">
            <Chapter index={1} id="hiw-idea" title="The map as a football pitch">
              <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
                <div className="flex max-w-[62ch] flex-col gap-4 text-[15px] leading-[1.85]">
                  <p>
                    Imagine a player standing in each city, passing the ball along one road at a time. A pass down a
                    road of length <span style={MONO}>w</span> only completes with probability{' '}
                    <span className="text-[#67e8f9]" style={MONO}>
                      e<sup>-0.01w</sup>
                    </span>
                    , so long roads lose the ball more often. Players prefer short roads, and prefer passing to cities
                    that are themselves dangerous — meaning close to the goal city.
                  </p>
                  <p>
                    <span className="font-semibold text-[#e2f8ff]">xGT(city)</span> is the probability that a
                    possession starting in that city eventually reaches the goal. A city with a high chance of reaching
                    the goal gets a low h; one where the ball is usually lost gets a high h.
                  </p>
                </div>
                <PassCompletionPanel />
              </div>
            </Chapter>

            <Chapter index={2} id="hiw-h" title="From probability to h">
              <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
                <div className="flex min-w-0 flex-col gap-4">
                  <Formula>{`h(city) = floor( -ln(xGT(city)) / γ + 0.5 )
h(goal) = 0                γ = 0.01`}</Formula>
                  <p className="max-w-[62ch] text-[15px] leading-[1.85]">
                    The logarithm turns a probability into something that adds up along a route, which is what A* needs:
                    h has to be in the same units as the road costs it is added to. Every halving of xGT adds the same
                    ~69 to h, however far from the goal you are.
                  </p>
                </div>
                <XgtToHPanel />
              </div>
            </Chapter>

            <Chapter
              index={3}
              id="hiw-build"
              title="Building the table"
              lead="One table of 20 numbers per goal city, built before the search starts. Every new value is computed from the old table and only then swapped in — a synchronous (Jacobi) update."
            >
              <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {BUILD_STEPS.map((step, index) => (
                  <li key={step.title} className={`${GLASS_CARD} relative flex flex-col gap-2 p-5`}>
                    <div className="flex items-center gap-3">
                      <span
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-cyan-400/50 bg-[#060a13] text-[11px] font-bold text-[#67e8f9]"
                        style={MONO}
                      >
                        {index + 1}
                      </span>
                      <span className={`text-[10px] text-[#a5f3fc] ${PIXEL}`}>{step.title}</span>
                    </div>
                    <p className="text-[14px] leading-[1.7]">{step.body}</p>
                    {index < BUILD_STEPS.length - 1 && (
                      <TbArrowRight
                        aria-hidden
                        size={16}
                        className="absolute top-1/2 -right-[14px] z-10 hidden -translate-y-1/2 text-cyan-400/60 xl:block"
                      />
                    )}
                  </li>
                ))}
              </ol>

              <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
                <Formula caption="The update rule, applied to every non-goal city u each round">
                  {`pref(u,v) = e^(-β·w) · xGT[v]^τ
P(u,v)    = pref(u,v) / Σ pref(u,·)
xGT'[u]   = Σ P(u,v) · e^(-γ·w) · xGT[v]`}
                </Formula>
                <dl className={`${GLASS_CARD} flex flex-col justify-center gap-3 p-5`}>
                  {CONSTANTS.map(([symbol, value, note]) => (
                    <div key={symbol} className="grid grid-cols-[20px_44px_1fr] items-baseline gap-2 text-[13px]">
                      <dt className="text-[#67e8f9]" style={MONO}>
                        {symbol}
                      </dt>
                      <dd className="text-[#e2f8ff]" style={MONO}>
                        {value}
                      </dd>
                      <dd className="text-[#7dd3fc]">{note}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </Chapter>

            <Chapter
              index={4}
              id="hiw-table"
              title="The table for goal = Bucharest"
              lead="With Bucharest as the goal, these are exactly the h values printed under each node in the tree above."
            >
              <HTablePanel />
              <p className="mt-4 max-w-[70ch] text-[14px] leading-[1.8] text-[#7dd3fc]">
                h grows with distance from Bucharest, yet nothing but the road list went into it. A different goal city
                produces a different table; all 20 are built once when the API starts.
              </p>
            </Chapter>

            <Chapter index={5} id="hiw-search" title="How the search uses it">
              <div className="grid gap-3 md:grid-cols-3">
                {SEARCH_RULES.map((rule) => (
                  <div key={rule.head} className={`${GLASS_CARD} flex flex-col gap-3 p-5`}>
                    <p className="text-[15px] font-bold text-[#67e8f9]" style={MONO}>
                      {rule.head}
                    </p>
                    <p className="text-[14px] leading-[1.75]">{rule.body}</p>
                  </div>
                ))}
              </div>
              <Callout tone="info" title="Reading the trace">
                Every node carries <span style={MONO}>expandedAt</span>: the step it was expanded at, or{' '}
                <span style={MONO}>-1</span> if it never was. That is why the same city can appear twice with different g
                — only one of them is the node the search actually followed.
              </Callout>
            </Chapter>

            <Chapter
              index={6}
              id="hiw-results"
              title="How well it works"
              lead="Measured over all 380 start/goal pairs on this map: the cheapest route every single time, while opening far fewer cities than the usual alternatives."
            >
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
                <ExpansionsPanel />
                <div className="flex flex-col gap-3">
                  <Finding title="The one tie on the map">
                    Going Zerind → Craiova, Arad and Oradea both come out at f = 484. Name order picks Arad, which gives
                    441; the other choice would have cost 448.
                  </Finding>
                  <Finding title="No detours backwards">
                    With this h, every expansion is a child of the previous step, so the tree always grows straight
                    down. Straight-line distance jumps back to older branches instead.
                  </Finding>
                </div>
              </div>
              <Callout tone="warn" title="Being honest about it">
                h is not provably consistent on this map, so optimality rests on that 380-pair measurement rather than on
                a theorem — enough for a fixed map and a fixed table.
              </Callout>
            </Chapter>

            <Chapter index={7} id="hiw-never" title="What it never uses">
              <ul className="grid gap-3 md:grid-cols-3">
                {NEVER_USED.map(([title, body]) => (
                  <li
                    key={title}
                    className="flex flex-col gap-2 rounded-[15px] border border-red-400/20 bg-red-500/[0.04] p-5"
                  >
                    <span className="flex items-center gap-2 text-[14px] font-semibold text-[#fecaca]">
                      <TbBan size={16} className="shrink-0 text-[#f87171]" />
                      {title}
                    </span>
                    <p className="text-[14px] leading-[1.7] text-[#cbe7f5]">{body}</p>
                  </li>
                ))}
              </ul>
            </Chapter>
          </div>
        </div>

        <footer className="relative mt-4 flex flex-wrap items-center justify-between gap-3 pt-6">
          <GlowDivider />
          <p className="text-[12px] text-[#5b7a94]">Source: Martin, The Greatest Creative Playmaker of All Time</p>
          <BackToTree />
        </footer>
      </div>
    </section>
  );
}

// ─── Layout pieces ────────────────────────────────────────────────────────

function Hero() {
  const kpis: { value: string; label: string; note: string; color: string }[] = [
    { value: '380/380', label: 'cheapest route found', note: 'every start/goal pair', color: '#4ade80' },
    { value: '4.94', label: 'cities expanded', note: 'on average, vs 6.80 straight-line', color: '#67e8f9' },
    { value: '0', label: 'coordinates used', note: 'built from the road list alone', color: '#fbbf24' },
  ];

  return (
    <header className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-end">
      <div>
        <p className={`text-[9px] tracking-widest text-[#5b7a94] ${PIXEL}`}>
          THE HEURISTIC · <span className="text-[#67e8f9]">xGT-v2b</span>
        </p>
        <h2
          className={`mt-5 text-[24px] leading-[1.45] text-[#a5f3fc] sm:text-[28px] ${PIXEL}`}
          style={{ textShadow: '0 0 10px rgba(34,211,238,0.9), 0 0 24px rgba(34,211,238,0.45)' }}
        >
          How our heuristic works
        </h2>
        <p className="mt-6 max-w-[58ch] text-[16px] leading-[1.8] text-[#7dd3fc]">
          A* is only as good as its h — the guess of how far a city still is from the goal. Ours is computed from the
          road list alone: no coordinates, no precomputed shortest paths. Everything below is a fixed property of the
          heuristic, the same on every search.
        </p>
      </div>

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {kpis.map((kpi) => (
          <li key={kpi.label} className={`${GLASS_CARD} flex flex-col gap-1 p-4`}>
            <span
              className="text-[28px] leading-none font-bold"
              style={{ ...MONO, color: kpi.color, textShadow: `0 0 12px ${kpi.color}66` }}
            >
              {kpi.value}
            </span>
            <span className="mt-2 text-[13px] font-semibold text-[#e2f8ff]">{kpi.label}</span>
            <span className="text-[12px] leading-[1.5] text-[#5b7a94]">{kpi.note}</span>
          </li>
        ))}
      </ul>
    </header>
  );
}

function ContentsRail({ active }: { active: ChapterId }) {
  return (
    // Sticky inside the page's own scroll container; self-start keeps the
    // grid from stretching it to the full column height, which would leave
    // it nothing to stick within.
    <nav aria-label="How it works — contents" className="sticky top-8 hidden self-start lg:block">
      <p className={`mb-4 text-[8px] tracking-widest text-[#5b7a94] ${PIXEL}`}>CONTENTS</p>
      <ol className="flex flex-col border-l border-cyan-500/15">
        {CHAPTERS.map(({ id, title, icon: Icon }, index) => {
          const isActive = id === active;
          return (
            <li key={id}>
              {/* Plain anchors: native hash scrolling follows this page's own
                  scroll container, next/link's does not. */}
              <a
                href={`#${id}`}
                aria-current={isActive ? 'true' : undefined}
                className={`-ml-px flex items-center gap-3 border-l-2 py-2 pl-4 text-[13px] transition ${
                  isActive
                    ? 'border-[#22d3ee] text-[#ecfeff]'
                    : 'border-transparent text-[#5b7a94] hover:border-cyan-500/40 hover:text-[#a5f3fc]'
                }`}
              >
                <span className="w-5 text-[11px] text-cyan-400/60" style={MONO}>
                  {String(index + 1).padStart(2, '0')}
                </span>
                <Icon size={14} className={isActive ? 'text-[#22d3ee]' : ''} />
                {title}
              </a>
            </li>
          );
        })}
      </ol>
      <div className="mt-8">
        <BackToTree />
      </div>
    </nav>
  );
}

/**
 * The rule between chapters: bright at the chapter number, fading to the
 * right, with a blurred copy underneath as its glow (a box-shadow would glow
 * evenly along the faded end too) and a lit node where it starts.
 */
function GlowDivider() {
  const line = 'absolute inset-x-0 top-0 bg-gradient-to-r from-cyan-300 via-cyan-400/50 to-transparent';
  return (
    <div aria-hidden className="pointer-events-none">
      <div className={`${line} h-[3px] -translate-y-px opacity-80 blur-[3px]`} />
      <div className={`${line} h-px`} />
      <span className="absolute top-0 left-0 h-2 w-2 -translate-y-1/2 rounded-full bg-cyan-200 shadow-[0_0_10px_3px_rgba(34,211,238,0.8)]" />
    </div>
  );
}

function Chapter({
  index,
  id,
  title,
  lead,
  children,
}: {
  index: number;
  id: ChapterId;
  title: string;
  lead?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="relative scroll-mt-8 py-14 first:pt-0">
      {index > 1 && <GlowDivider />}
      <header className="mb-8 flex items-start gap-5">
        <span className={`text-[26px] leading-none text-cyan-400/35 ${PIXEL}`} aria-hidden>
          {String(index).padStart(2, '0')}
        </span>
        <div className="min-w-0 pt-1">
          <h3 className={`text-[14px] leading-[1.6] text-[#a5f3fc] sm:text-[15px] ${PIXEL}`} style={GLOW}>
            {title}
          </h3>
          {lead && <p className="mt-3 max-w-[70ch] text-[15px] leading-[1.8] text-[#7dd3fc]">{lead}</p>}
        </div>
      </header>
      {children}
    </section>
  );
}

function Formula({ children, caption }: { children: string; caption?: string }) {
  return (
    <figure className="flex min-w-0 flex-col gap-2">
      <pre
        className="cyan-scrollbar overflow-x-auto rounded-[12px] border border-cyan-500/20 bg-[#050912] px-5 py-4 text-[13px] leading-[1.9] text-[#67e8f9] shadow-[inset_0_0_24px_rgba(34,211,238,0.05)]"
        style={MONO}
      >
        {children}
      </pre>
      {caption && <figcaption className="text-[12px] text-[#5b7a94]">{caption}</figcaption>}
    </figure>
  );
}

function PanelTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-4 flex items-baseline justify-between gap-3">
      <p className="text-[13px] font-semibold text-[#e2f8ff]">{children}</p>
      {aside && <span className="text-right text-[12px] text-[#5b7a94]">{aside}</span>}
    </div>
  );
}

function Bar({ ratio, color, glow, className = 'w-full' }: { ratio: number; color: string; glow?: boolean; className?: string }) {
  return (
    <div className={`h-2.5 overflow-hidden rounded-sm border border-cyan-500/15 bg-[#060a13] ${className}`}>
      <div
        className="h-full rounded-sm"
        style={{ width: `${ratio * 100}%`, background: color, boxShadow: glow ? `0 0 8px ${color}` : undefined }}
      />
    </div>
  );
}

function Callout({ tone, title, children }: { tone: 'info' | 'warn'; title: string; children: ReactNode }) {
  const warn = tone === 'warn';
  return (
    <div
      className={`mt-4 flex gap-4 rounded-[12px] border px-5 py-4 ${
        warn ? 'border-amber-400/30 bg-amber-400/[0.06]' : 'border-cyan-400/25 bg-cyan-400/[0.05]'
      }`}
    >
      {warn ? (
        <TbAlertTriangle size={18} className="mt-0.5 shrink-0 text-[#fbbf24]" />
      ) : (
        <TbInfoCircle size={18} className="mt-0.5 shrink-0 text-[#67e8f9]" />
      )}
      <div className="text-[14px] leading-[1.75]">
        <p className={`font-semibold ${warn ? 'text-[#fde68a]' : 'text-[#a5f3fc]'}`}>{title}</p>
        <p className="mt-1 text-[#cbe7f5]">{children}</p>
      </div>
    </div>
  );
}

function Finding({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className={`${GLASS_CARD} flex-1 p-5`}>
      <p className="text-[14px] font-semibold text-[#e2f8ff]">{title}</p>
      <p className="mt-2 text-[14px] leading-[1.75]">{children}</p>
    </div>
  );
}

function BackToTree() {
  // See the note on the matching link in AStarTreeExplorer: a plain anchor,
  // and never id="top", which next/link resolves to document.body instead of
  // this page's scroll container.
  return (
    <a
      href="#search-tree"
      className="inline-flex items-center gap-2 rounded-[14px] border border-cyan-500/30 bg-[#0b1220] px-3 py-2 text-[12px] font-semibold text-[#67e8f9] transition hover:shadow-[0_0_20px_rgba(34,211,238,0.45)]"
    >
      <TbArrowUp size={14} />
      Back to the tree
    </a>
  );
}

// ─── Chapter visuals ──────────────────────────────────────────────────────

function PassCompletionPanel() {
  return (
    <div className={`${GLASS_CARD} self-start p-5`}>
      <PanelTitle aside="p = e^(−0.01·w)">Pass completion</PanelTitle>
      <ul className="flex flex-col gap-4">
        {PASS_EXAMPLES.map(([road, w]) => {
          const p = Math.exp(-GAMMA * w);
          return (
            <li key={road} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-2 text-[13px]">
                <span className="text-[#cbe7f5]">
                  {road}{' '}
                  <span className="text-[#5b7a94]" style={MONO}>
                    w={w}
                  </span>
                </span>
                <span className="font-semibold text-[#67e8f9]" style={MONO}>
                  {Math.round(p * 100)}%
                </span>
              </div>
              <Bar ratio={p} color="#22d3ee" />
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-[12px] leading-[1.6] text-[#5b7a94]">Real roads from the map — longer road, more turnovers.</p>
    </div>
  );
}

function XgtToHPanel() {
  return (
    <div className={`${GLASS_CARD} self-start p-5`}>
      <PanelTitle aside="γ = 0.01">xGT → h</PanelTitle>
      <table className="w-full text-[13px]" style={MONO}>
        <tbody>
          {XGT_EXAMPLES.map((xgt) => (
            <tr key={xgt} className="border-b border-cyan-500/10 last:border-b-0">
              <td className="py-2 text-[#cbe7f5]">{xgt}</td>
              <td className="py-2 text-center text-[#5b7a94]">
                <TbArrowRight size={13} className="inline" />
              </td>
              <td className="py-2 text-right font-semibold text-[#fbbf24]">{hFromXgt(xgt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-[12px] leading-[1.6] text-[#5b7a94]">Likelier to score → smaller h.</p>
    </div>
  );
}

function HTablePanel() {
  return (
    <div className={`${GLASS_CARD} p-6`}>
      <PanelTitle aside={<span style={MONO}>0 … {MAX_H}</span>}>h(city), nearest to farthest</PanelTitle>
      {/* Column-first flow, so reading down the left column and then the
          right keeps the sorted order. */}
      <ul className="columns-1 gap-x-10 md:columns-2">
        {H_TABLE.map(([city, h]) => {
          const isGoal = h === 0;
          return (
            <li key={city} className="flex break-inside-avoid items-center gap-3 py-1.5 text-[13px]">
              <span className={`w-[118px] shrink-0 truncate ${isGoal ? 'text-[#4ade80]' : 'text-[#cbe7f5]'}`}>
                {city}
              </span>
              {isGoal ? (
                <span className={`flex-1 text-[8px] text-[#4ade80] ${PIXEL}`}>GOAL</span>
              ) : (
                <Bar ratio={h / MAX_H} color="rgba(251,191,36,0.7)" className="min-w-0 flex-1" />
              )}
              <span
                className={`w-9 shrink-0 text-right font-semibold ${isGoal ? 'text-[#4ade80]' : 'text-[#fbbf24]'}`}
                style={MONO}
              >
                {h}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ExpansionsPanel() {
  return (
    <div className={`${GLASS_CARD} flex flex-col p-6`}>
      <PanelTitle aside="lower is better">Average cities expanded per search</PanelTitle>
      <div className="flex flex-1 flex-col justify-center gap-5">
        {EXPANSIONS.map((row) => (
          <div key={row.label} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-2 text-[13px]">
              <span className={row.ours ? 'font-semibold text-[#dcfce7]' : 'text-[#7dd3fc]'}>{row.label}</span>
              <span className={`font-semibold ${row.ours ? 'text-[#4ade80]' : 'text-[#7dd3fc]'}`} style={MONO}>
                {row.value.toFixed(2)}
              </span>
            </div>
            <Bar
              ratio={row.value / MAX_EXPANSIONS}
              color={row.ours ? '#4ade80' : 'rgba(103,232,249,0.4)'}
              glow={row.ours}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
