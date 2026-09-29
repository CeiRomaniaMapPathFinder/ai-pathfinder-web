// Drag a road length and watch how many of 20 passes still arrive:
// C = e^(−γw). Ticks mark the shortest and longest roads on the real map.

import { useId, useState } from 'react';
import { XGT_PARAMS } from '../../../lib/xgtHeuristic';
import { MONO, TERM, pct } from '../shared';
import { Card, PanelTitle } from '../ui';

const MIN_W = 20;
const MAX_W = 260;
const PASSES = 20;
/** Shortest and longest roads on this map. */
const MAP_EXTREMES = [
  { w: 70, label: 'shortest road (Lugoj–Mehadia)' },
  { w: 211, label: 'longest road (Fagaras–Bucharest)' },
];

export default function PassOdds({ initial = 100 }: { initial?: number }) {
  const [w, setW] = useState(initial);
  const inputId = useId();
  const completion = Math.exp(-XGT_PARAMS.gamma * w);
  const arrived = Math.round(completion * PASSES);

  return (
    <Card>
      <PanelTitle aside={<span style={MONO}>C = e^(−0.01 · w)</span>}>Try a road length</PanelTitle>

      <label htmlFor={inputId} className="flex items-baseline justify-between gap-3 text-[13px]">
        <span className="text-[#cbe7f5]">
          road cost{' '}
          <span style={MONO} className="font-semibold text-[#ecfeff]">
            w = {w}
          </span>
        </span>
        <span className="text-[20px] font-bold" style={{ ...MONO, color: TERM.completion }}>
          {pct(completion)}
        </span>
      </label>
      <input
        id={inputId}
        type="range"
        min={MIN_W}
        max={MAX_W}
        value={w}
        onChange={(event) => setW(Number(event.target.value))}
        className="mt-3 w-full accent-pink-400"
      />
      <div className="relative mt-1 h-5 text-[10px] text-[#5b7a94]" aria-hidden>
        {MAP_EXTREMES.map((mark) => (
          <button
            key={mark.w}
            type="button"
            tabIndex={-1}
            title={mark.label}
            onClick={() => setW(mark.w)}
            className="absolute -translate-x-1/2 hover:text-[#a5f3fc]"
            style={{ left: `${((mark.w - MIN_W) / (MAX_W - MIN_W)) * 100}%` }}
          >
            ▲{mark.w}
          </button>
        ))}
      </div>

      <p className="mt-3 text-[13px] text-[#cbe7f5]">
        Out of {PASSES} passes down this road,{' '}
        <span className="font-semibold" style={{ color: TERM.completion }}>
          {arrived}
        </span>{' '}
        arrive:
      </p>
      <ul className="mt-2 grid grid-cols-10 gap-1.5" aria-label={`${arrived} of ${PASSES} passes arrive`}>
        {Array.from({ length: PASSES }, (_, index) => {
          const ok = index < arrived;
          return (
            <li
              key={index}
              className={`flex aspect-square items-center justify-center rounded-full border text-[10px] transition-colors duration-300 ${
                ok
                  ? 'border-pink-300/70 bg-pink-400/25 text-pink-100'
                  : 'border-slate-600/50 bg-transparent text-slate-600'
              }`}
            >
              {ok ? '●' : '×'}
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-[12px] leading-[1.6] text-[#5b7a94]">
        Every extra 69 of road halves the chance. A lost ball is a turnover — that possession is worth nothing.
      </p>
    </Card>
  );
}
