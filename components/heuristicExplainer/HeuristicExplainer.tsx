'use client';

import { useMemo } from 'react';
import { TbArrowDown } from 'react-icons/tb';
import { CITIES, computeXgt } from '../../lib/xgtHeuristic';
import ChooseChapter from './chapters/ChooseChapter';
import DistanceChapter from './chapters/DistanceChapter';
import FailChapter from './chapters/FailChapter';
import FirstMoveChapter from './chapters/FirstMoveChapter';
import FootballChapter from './chapters/FootballChapter';
import GuessChapter from './chapters/GuessChapter';
import KnobsChapter from './chapters/KnobsChapter';
import SpreadChapter from './chapters/SpreadChapter';
import WorkedChapter from './chapters/WorkedChapter';
import ContentsRail, { ContentsChips } from './ContentsRail';
import { GLOW, MONO, PIXEL, ROLE, TERM, pct, type ExplainerModel } from './shared';
import { BackToTree, Card, GlowDivider } from './ui';

const GRID_SURFACE = {
  backgroundImage:
    'linear-gradient(rgba(34,211,238,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.04) 1px, transparent 1px)',
  backgroundSize: '40px 40px',
};

const FALLBACK = { start: 'Arad', goal: 'Bucharest' };

export default function HeuristicExplainer({ start, goal }: { start: string; goal: string }) {
  const known = CITIES.includes(start) && CITIES.includes(goal);
  const route = known ? { start, goal } : FALLBACK;
  const result = useMemo(() => computeXgt(route.goal), [route.goal]);
  const model: ExplainerModel = { ...route, result };

  return (
    <section
      id="how-it-works"
      className="relative w-full shrink-0 border-t border-cyan-400/50 bg-[#0a1322] text-[#cbe7f5]"
      style={GRID_SURFACE}
    >
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

      <div className="relative mx-auto w-full max-w-[1240px] px-4 pt-20 pb-12 sm:px-8">
        <Hero model={model} known={known} />

        <div className="mt-10 lg:hidden">
          <ContentsChips />
        </div>

        <div className="mt-10 grid gap-10 lg:mt-16 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-14">
          <ContentsRail />

          <div className="min-w-0">
            <GuessChapter model={model} />
            <FootballChapter model={model} />
            <FailChapter model={model} />
            <ChooseChapter />
            <SpreadChapter model={model} />
            <DistanceChapter model={model} />
            <WorkedChapter model={model} />
            <FirstMoveChapter model={model} />
            <KnobsChapter />
          </div>
        </div>

        <footer className="relative mt-4 flex flex-wrap items-center justify-end gap-3 pt-6">
          <GlowDivider />
          <BackToTree />
        </footer>
      </div>
    </section>
  );
}

function Hero({ model, known }: { model: ExplainerModel; known: boolean }) {
  const { start, goal, result } = model;
  const same = start === goal;

  return (
    <header className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-end lg:gap-10">
      <div>
        <p className={`text-[9px] tracking-widest text-[#5b7a94] ${PIXEL}`}>
          THE HEURISTIC · <span className="text-[#67e8f9]">xGT</span>
        </p>
        <h2
          className={`mt-5 text-[20px] leading-[1.45] text-[#a5f3fc] sm:text-[28px] ${PIXEL}`}
          style={{ textShadow: '0 0 10px rgba(34,211,238,0.9), 0 0 24px rgba(34,211,238,0.45)' }}
        >
          How our heuristic works
        </h2>
        <p className="mt-6 max-w-[58ch] text-[16px] leading-[1.8] text-[#7dd3fc]">
          A* needs a guess of how far every city still is from the goal. We made ours by treating the road map as a
          football pitch and asking how likely an attack from each city is to score. The chapters below build that idea
          one step at a time, with the numbers from your route.
        </p>
        {!known && (
          <p className="mt-3 text-[13px] text-[#fbbf24]">
            The route in the address isn&apos;t on the map, so this explanation uses {FALLBACK.start} → {FALLBACK.goal}.
          </p>
        )}
      </div>

      <Card className="relative overflow-hidden">
        <p className={`text-[8px] tracking-widest text-[#5b7a94] ${PIXEL}`}>YOUR ROUTE</p>
        <p className="mt-3 flex flex-wrap items-center gap-2 text-[18px] font-semibold">
          <span style={{ color: ROLE.start }}>{start}</span>
          <span className="text-[#5b7a94]">→</span>
          <span style={{ color: ROLE.goal }}>{goal}</span>
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-[10px] bg-[#060a13] px-3 py-3">
            <p className="text-[11px] text-[#5b7a94]">chance to score from {start}</p>
            <p className="mt-1 text-[24px] leading-none font-bold" style={{ ...MONO, color: TERM.xgt }}>
              {pct(result.xgt[start])}
            </p>
            <p className="mt-1 text-[11px] text-[#5b7a94]">xGT({start})</p>
          </div>
          <div className="rounded-[10px] bg-[#060a13] px-3 py-3">
            <p className="text-[11px] text-[#5b7a94]">guess of the cost left</p>
            <p className="mt-1 text-[24px] leading-none font-bold" style={{ ...MONO, color: TERM.h }}>
              {result.h[start]}
            </p>
            <p className="mt-1 text-[11px] text-[#5b7a94]">h({start})</p>
          </div>
        </div>
        <p className="mt-4 text-[13px] leading-[1.7] text-[#9cc3dc]">
          {same
            ? 'Start and goal are the same city, so the chance is 100% and h is 0.'
            : `In our model, an attack starting in ${start} reaches ${goal} ${pct(result.xgt[start])} of the time. By the end of this section you will see exactly how that becomes h = ${result.h[start]}.`}
        </p>
      </Card>
    </header>
  );
}
