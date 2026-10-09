import { useMemo, useState, type ReactNode } from 'react';
import { TbCheck, TbX } from 'react-icons/tb';
import { computeXgt, explainCity, ROADS, XGT_PARAMS, type XgtParams } from '../../../lib/xgtHeuristic';
import ForkMap, { FORK_COLORS } from '../illustrations/ForkMap';
import PassFan from '../illustrations/PassFan';
import { MONO, ROLE, TERM, pct } from '../shared';
import { Card, PanelTitle, T, Toggle } from '../ui';

const FROM = 'Zerind';
const MEET = 'Sibiu';
const GOAL = 'Bucharest';
const REST_PATH = ['Sibiu', 'Rimnicu Vilcea', 'Pitesti', 'Bucharest'];
const FIRST_VERSION: XgtParams = { beta: 0.01, gamma: 0.01, tau: 0 };

type Version = 'first' | 'final';

function road(a: string, b: string): number {
  return ROADS[a].find((r) => r.to === b)!.w;
}

const REST = REST_PATH.slice(1).reduce((sum, city, i) => sum + road(REST_PATH[i], city), 0);

function Part({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h4 className="flex items-center gap-3 text-[14px] font-semibold text-[#e2f8ff]">
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-cyan-400/60 text-[11px] font-bold text-[#67e8f9]"
          style={MONO}
        >
          {n}
        </span>
        {title}
      </h4>
      {children}
    </section>
  );
}

export default function ForkCaseStudy() {
  const [version, setVersion] = useState<Version>('first');
  const params = version === 'first' ? FIRST_VERSION : XGT_PARAMS;

  const sides = useMemo(() => {
    const { xgt, h } = computeXgt(GOAL, params);
    const side = (city: string) => {
      const first = road(FROM, city);
      const second = road(city, MEET);
      const breakdown = explainCity(city, xgt, params);
      return {
        city,
        first,
        second,
        toMeet: first + second,
        h: h[city],
        f: first + h[city],
        breakdown,
        toSibiu: breakdown.terms.find((term) => term.to === MEET)!.choice,
      };
    };
    return { arad: side('Arad'), oradea: side('Oradea') };
  }, [params]);

  const { arad, oradea } = sides;
  const firstGap = arad.first - oradea.first;
  const hGap = oradea.h - arad.h;
  const correct = arad.f < oradea.f;

  return (
    <Card className="mt-8 flex flex-col gap-8">
      <header className="max-w-[68ch]">
        <p className="text-[11px] font-semibold tracking-wide text-[#5b7a94] uppercase">Case study</p>
        <p className="mt-1 text-[16px] font-semibold text-[#e2f8ff]">
          Why the player has to look at the receiver: the fork at {FROM}
        </p>
        <p className="mt-2 text-[14px] leading-[1.7] text-[#9cc3dc]">
          Say A* is searching from {FROM} to {GOAL}. Its very first decision is which neighbour of {FROM} to open, Arad
          or Oradea. This is where our first version went wrong. Use the switch below to flip between the two rules. It
          stays on screen while you read, so you can watch every number in the three parts change.
        </p>
      </header>

      <div className="sticky top-3 z-20 -mx-1 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[14px] border border-cyan-400/30 bg-[#081120]/[0.97] px-3 py-2 shadow-[0_10px_28px_rgba(0,0,0,0.55)] backdrop-blur-md">
        <span className="text-[11px] font-semibold tracking-wide text-[#5b7a94] uppercase max-sm:hidden">
          Pass-choice rule
        </span>
        <Toggle
          label="Pass-choice rule"
          value={version}
          onChange={setVersion}
          options={[
            {
              value: 'first',
              label: (
                <>
                  First<span className="max-sm:hidden">: short roads only</span>
                </>
              ),
            },
            {
              value: 'final',
              label: (
                <>
                  Final<span className="max-sm:hidden">: + dangerous receivers</span>
                </>
              ),
            },
          ]}
        />
        <span
          className={`ml-auto flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-semibold ${
            correct
              ? 'border-emerald-400/40 bg-emerald-400/10 text-[#bbf7d0]'
              : 'border-red-400/40 bg-red-500/10 text-[#fecaca]'
          }`}
          aria-live="polite"
        >
          {correct ? <TbCheck size={14} /> : <TbX size={14} />}
          <span className="max-sm:hidden">A* opens</span>
          <span className="sm:hidden">opens</span> {correct ? 'Arad' : 'Oradea'}
          <span className="max-sm:hidden">first</span>
        </span>
      </div>

      <Part n={1} title={`The fork: two ways from ${FROM} to ${MEET}`}>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-center">
          <div className="rounded-[12px] border border-cyan-500/15 bg-[#060a13]/60 p-3">
            <ForkMap arad={arad} oradea={oradea} rest={REST} />
            <p className="mt-2 px-1 text-[12px] leading-[1.6] text-[#5b7a94]">
              <span style={{ color: FORK_COLORS.short }}>Green</span> = the way via Arad,{' '}
              <span style={{ color: FORK_COLORS.long }}>pink</span> = the way via Oradea. The glowing first road is the
              one A* opens with the rule selected in the bar.
            </p>
          </div>
          <div className="flex flex-col gap-3 text-[14px] leading-[1.7]">
            <p>
              Both ways meet at {MEET}. After that, the rest of the drive to {GOAL} is the same ({REST} more), so the
              whole question is which way to {MEET} is shorter.
            </p>
            <ul className="flex flex-col gap-2" style={MONO}>
              <li className="rounded-[8px] bg-[#0b1220] px-3 py-2 text-[13px]">
                <span style={{ color: FORK_COLORS.long }}>via Oradea</span> {oradea.first} + {oradea.second} ={' '}
                <strong className="text-[#e2f8ff]">{oradea.toMeet}</strong>
              </li>
              <li className="rounded-[8px] bg-[#0b1220] px-3 py-2 text-[13px]">
                <span style={{ color: FORK_COLORS.short }}>via Arad</span>
                {'  '} {arad.first} + {arad.second} = <strong className="text-[#e2f8ff]">{arad.toMeet}</strong>{' '}
                <span className="text-[#4ade80]">← {oradea.toMeet - arad.toMeet} shorter</span>
              </li>
            </ul>
            <p>
              The catch: Arad&apos;s <em>first</em> road is {firstGap} <em>longer</em> ({arad.first} vs {oradea.first}).
              Standing at {FROM}, A* only knows that first road (<T k="g">g</T>) plus the guess <T k="h">h</T>. To pick
              Arad, the guess has to make up those {firstGap}:
            </p>
            <p
              className="rounded-[10px] border border-cyan-400/25 bg-cyan-400/[0.05] px-3 py-2 text-[13px]"
              style={MONO}
            >
              <T k="h">h(Oradea)</T> − <T k="h">h(Arad)</T> must be more than {firstGap}
            </p>
          </div>
        </div>
      </Part>

      <Part n={2} title="How the player on each city passes">
        <p className="max-w-[72ch] text-[14px] leading-[1.7]">
          Arad and Oradea are only worth something because of their pass to {MEET}. Their other roads lead back to{' '}
          {FROM} or off to Timisoara, away from the goal. So what matters is{' '}
          <strong className="text-[#e2f8ff]">how often each player passes toward {MEET}</strong>.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {[oradea, arad].map((side) => (
            <div key={side.city} className="rounded-[12px] border border-cyan-500/15 bg-[#060a13]/60 p-3 sm:p-4">
              <PanelTitle aside={<span style={MONO}>arrow width = chance picked</span>}>
                Player on {side.city} ({side.breakdown.terms.length} roads)
              </PanelTitle>
              <PassFan breakdown={side.breakdown} goal={GOAL} title={`Passing choices from ${side.city}`} />
              <dl className="mt-2 grid grid-cols-2 gap-2 text-[12px]">
                <div className="rounded-[8px] bg-[#0b1220] px-3 py-2">
                  <dt className="text-[#5b7a94]">passes toward {MEET}</dt>
                  <dd className="text-[16px] font-bold" style={{ ...MONO, color: TERM.choice }}>
                    {pct(side.toSibiu)}
                  </dd>
                </div>
                <div className="rounded-[8px] bg-[#0b1220] px-3 py-2">
                  <dt className="text-[#5b7a94]">
                    so <T k="h">h({side.city})</T> =
                  </dt>
                  <dd className="text-[16px] font-bold" style={{ ...MONO, color: TERM.h }}>
                    {side.h}
                  </dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
        <p className="max-w-[72ch] text-[14px] leading-[1.7] text-[#cbe7f5]">
          {version === 'first' ? (
            <>
              With <strong className="text-[#e2f8ff]">short roads only</strong>, Arad&apos;s player spreads the ball
              over three roads by length alone. Only {pct(arad.toSibiu)} goes toward {MEET}. The rest goes to the short
              roads back to {FROM} and to Timisoara. Oradea has just two roads, so {pct(oradea.toSibiu)} of its passes
              go toward {MEET}. Having more roads makes Arad look <em>worse</em>, even though it is closer.
            </>
          ) : (
            <>
              When the player also looks at <strong className="text-[#e2f8ff]">how dangerous each receiver is</strong>,
              both players see that {MEET} is the only useful target. Arad now passes there {pct(arad.toSibiu)} of the
              time and Oradea {pct(oradea.toSibiu)}. The difference now comes from the pass itself: Arad&apos;s road to{' '}
              {MEET} is shorter ({arad.second} vs {oradea.second}), so it arrives more often, and Arad gets the lower{' '}
              <T k="h">h</T>.
            </>
          )}
        </p>
      </Part>

      <Part n={3} title={`What A* does at ${FROM}`}>
        <div className="grid gap-3 sm:grid-cols-2">
          {[oradea, arad].map((side) => {
            const opened = side.f === Math.min(arad.f, oradea.f);
            return (
              <div
                key={side.city}
                className={`rounded-[12px] border px-4 py-3 ${opened ? 'border-cyan-300/60 bg-cyan-400/[0.07]' : 'border-cyan-500/15 bg-[#060a13]/60'}`}
              >
                <p className="flex items-center justify-between text-[13px] font-semibold text-[#e2f8ff]">
                  {side.city}
                  {opened && (
                    <span className="rounded-full bg-cyan-400/15 px-2 py-0.5 text-[10px] font-bold text-[#67e8f9]">
                      OPENED FIRST
                    </span>
                  )}
                </p>
                <p className="mt-2 text-[14px]" style={MONO}>
                  <T k="f">f</T> = <span style={{ color: TERM.g }}>{side.first}</span> +{' '}
                  <span style={{ color: TERM.h }}>{side.h}</span> = <strong style={{ color: TERM.f }}>{side.f}</strong>
                </p>
                <p className="mt-1 text-[11px] text-[#5b7a94]">road from {FROM} + guess for the rest</p>
              </div>
            );
          })}
        </div>
        <div
          className={`flex gap-3 rounded-[12px] border px-4 py-3 text-[14px] leading-[1.7] ${
            correct ? 'border-emerald-400/30 bg-emerald-400/[0.06]' : 'border-red-400/30 bg-red-500/[0.06]'
          }`}
        >
          {correct ? (
            <TbCheck size={20} className="mt-0.5 shrink-0 text-[#4ade80]" />
          ) : (
            <TbX size={20} className="mt-0.5 shrink-0" style={{ color: ROLE.goal }} />
          )}
          <p className="text-[#e2f8ff]">
            <span style={MONO}>
              h(Oradea) − h(Arad) = {oradea.h} − {arad.h} = {hGap}
            </span>
            {correct ? (
              <>
                , more than the {firstGap} it needed. A* opens <strong className="text-[#4ade80]">Arad</strong> and
                heads down the shorter way. That is the whole reason for τ: letting the player look at where the
                receiver is fixes the ranking without using any distances.
              </>
            ) : (
              <>
                . That is negative: the guess says Arad is <em>farther</em>. A* opens{' '}
                <strong style={{ color: ROLE.goal }}>Oradea</strong> and heads down the longer way. Switch to the final
                rule in the bar to see the fix.
              </>
            )}
          </p>
        </div>
      </Part>
    </Card>
  );
}
