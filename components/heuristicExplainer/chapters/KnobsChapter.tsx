import { Fragment, type ReactNode } from 'react';
import { XGT_PARAMS } from '../../../lib/xgtHeuristic';
import { MONO, TERM, type TermKey } from '../shared';
import { Callout, Card, Chapter, Eq, T } from '../ui';

const KNOBS: {
  symbol: string;
  name: string;
  value: number;
  term: TermKey;
  what: ReactNode;
  low: ReactNode;
  high: ReactNode;
}[] = [
  {
    symbol: 'β',
    name: 'beta',
    value: XGT_PARAMS.beta,
    term: 'shortness',
    what: 'How much the player dislikes long passes when choosing.',
    low: 'Long and short roads look alike, so the player wanders more.',
    high: 'The player grabs the shortest road even when it leads away.',
  },
  {
    symbol: 'γ',
    name: 'gamma',
    value: XGT_PARAMS.gamma,
    term: 'completion',
    what: 'How quickly a pass gets riskier with length. It also sets the unit of h (the ÷ γ in step 4).',
    low: 'Passes almost never fail, so every city looks about the same.',
    high: 'Every pass is a gamble, and h is pulled toward the plain road length.',
  },
  {
    symbol: 'τ',
    name: 'tau',
    value: XGT_PARAMS.tau,
    term: 'xgt',
    what: 'How much the player looks at where the receiver is.',
    low: 'τ = 0 is the first version: cities with many roads look worse than they are.',
    high: 'Above ~3 the player becomes perfect and h just copies the shortest road distance, which leaves nothing of the football idea.',
  },
];

const RECIPE: [ReactNode, ReactNode, string][] = [
  [
    <T key="c" k="completion">
      C(u,v)
    </T>,
    <>
      e<sup>−γ·w</sup>
    </>,
    'step 1: will the pass arrive?',
  ],
  [
    'preference(u,v)',
    <>
      <T k="shortness">
        e<sup>−β·w</sup>
      </T>{' '}
      ·{' '}
      <T k="xgt">
        xGT(v)<sup>τ</sup>
      </T>
    </>,
    'step 2: short and dangerous',
  ],
  [
    <T key="p" k="choice">
      P(u→v)
    </T>,
    'preference ÷ Σ preference',
    'step 2: chances add up to 100%',
  ],
  [
    <T key="x" k="xgt">
      xGT(u)
    </T>,
    <>
      Σ <T k="choice">P</T> · <T k="completion">C</T> · <T k="xgt">xGT(v)</T>
    </>,
    'step 3: repeat until settled',
  ],
  [
    <T key="h" k="h">
      h(u)
    </T>,
    <>
      round( −ln <T k="xgt">xGT(u)</T> ÷ γ )
    </>,
    'step 4: into road-cost units',
  ],
];

export default function KnobsChapter() {
  return (
    <Chapter
      index={9}
      id="hiw-knobs"
      kicker="SUMMARY"
      title="The three knobs, and the whole recipe"
      lead="The model has three fixed settings. They were chosen by testing, not per route: the same values are used for every start and goal."
    >
      <ul className="grid gap-3 md:grid-cols-3">
        {KNOBS.map((knob) => (
          <li key={knob.symbol}>
            <Card className="flex h-full flex-col gap-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[22px] font-bold" style={{ ...MONO, color: TERM[knob.term] }}>
                  {knob.symbol} = {knob.value}
                </span>
                <span className="text-[12px] text-[#5b7a94]">{knob.name}</span>
              </div>
              <p className="text-[14px] leading-[1.7] text-[#e2f8ff]">{knob.what}</p>
              <dl className="mt-auto flex flex-col gap-2 text-[13px] leading-[1.6]">
                <div>
                  <dt className="text-[11px] font-semibold tracking-wide text-[#5b7a94] uppercase">too small</dt>
                  <dd className="text-[#9cc3dc]">{knob.low}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold tracking-wide text-[#5b7a94] uppercase">too large</dt>
                  <dd className="text-[#9cc3dc]">{knob.high}</dd>
                </div>
              </dl>
            </Card>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex flex-col gap-4">
        <Eq caption="Steps 1–4 in five lines. Repeat the middle two for every city until nothing changes, then convert.">
          <div className="grid grid-cols-[auto_auto_1fr] gap-x-3">
            {RECIPE.map(([lhs, rhs, note], index) => (
              <Fragment key={index}>
                <span className="text-right">{lhs}</span>
                <span>= {rhs}</span>
                <span className="pl-4 text-[#5b7a94]">{note}</span>
              </Fragment>
            ))}
          </div>
        </Eq>
        <Callout tone="warn" title="An honest note">
          Because the player sometimes hesitates, <T k="h">h</T> tends to come out slightly <em>above</em> the true
          remaining cost, not below it. So the textbook guarantee that A* returns the cheapest route does not
          automatically apply. On this map it does find the cheapest route, but that was checked by testing every route,
          not proven.
        </Callout>
      </div>
    </Chapter>
  );
}
