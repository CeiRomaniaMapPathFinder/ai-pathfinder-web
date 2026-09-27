import { useMemo, useState } from 'react';
import { computeXgt, explainCity, XGT_PARAMS, type XgtParams } from '../../../lib/xgtHeuristic';
import PassFan from '../illustrations/PassFan';
import { MONO, ROLE, TERM, pct } from '../shared';
import { Callout, Card, Chapter, Eq, M, PanelTitle, Prose, T, Toggle } from '../ui';

// The case where our first version went wrong. Fixed on purpose: it is the
// story of why τ exists, not a property of the selected route.
const CASE = { from: 'Zerind', goal: 'Bucharest', left: { city: 'Arad', w: 75 }, right: { city: 'Oradea', w: 71 } };
const FIRST_VERSION: XgtParams = { beta: 0.01, gamma: 0.01, tau: 0 };

type Version = 'first' | 'final';

export default function ChooseChapter() {
  const [version, setVersion] = useState<Version>('first');
  const params = version === 'first' ? FIRST_VERSION : XGT_PARAMS;

  const study = useMemo(() => {
    const { xgt, h } = computeXgt(CASE.goal, params);
    const side = ({ city, w }: { city: string; w: number }) => ({
      city,
      w,
      breakdown: explainCity(city, xgt, params),
      h: h[city],
      f: w + h[city],
    });
    return { left: side(CASE.left), right: side(CASE.right) };
  }, [params]);

  const winner = study.left.f <= study.right.f ? study.left : study.right;
  const correct = winner.city === CASE.left.city;
  const toSibiu = (side: typeof study.left) => side.breakdown.terms.find((term) => term.to === 'Sibiu')!.choice;

  return (
    <Chapter index={4} id="hiw-choose" kicker="STEP 2" title="Choosing a pass">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)]">
        <div className="flex min-w-0 flex-col gap-5">
          <Prose>
            <p>
              Most cities have two to four roads, so the player with the ball has to choose. We don&apos;t pick one
              &ldquo;best&rdquo; pass. Instead the player picks each road with some chance <T k="choice">P</T>, and a
              city&apos;s threat is the average outcome over those choices. For every road, multiply three things, then
              add up the roads:
            </p>
          </Prose>
          <Eq caption="Summed over every road leaving city u; v is the city at the other end.">
            <div>
              <T k="xgt">xGT(u)</T> = Σ <T k="choice">P(u→v)</T> · <T k="completion">C(u,v)</T> · <T k="xgt">xGT(v)</T>
            </div>
            <div className="text-[12px] text-[#5b7a94]">picked? · arrives? · worth there</div>
          </Eq>
          <Prose>
            <p>
              What decides <T k="choice">P</T>? The obvious answer is that players prefer short, safe passes, so each
              road gets a <T k="shortness">shortness score</T>{' '}
              <M>
                e<sup>−β·w</sup>
              </M>
              . This was our first version, and it had a flaw.{' '}
              <strong className="text-[#e2f8ff]">A city with more roads looks worse</strong>, because its player keeps
              choosing short passes that lead nowhere.
            </p>
            <p>
              Real players don&apos;t just pass to whoever is closest. They look for a teammate in a{' '}
              <em>dangerous position</em>. So the final version multiplies in the receiver&apos;s own threat, raised to
              a power τ that sets how much it matters:
            </p>
          </Prose>
          <Eq
            caption={
              <>
                β = {XGT_PARAMS.beta} (dislike of long passes), τ = {XGT_PARAMS.tau} (liking for dangerous receivers).
                Dividing by the sum over all of u&apos;s roads makes the P values add up to 100%.
              </>
            }
          >
            <div>
              <span className="text-[#cbe7f5]">preference(u→v)</span> ={' '}
              <T k="shortness">
                e<sup>−β·w</sup>
              </T>{' '}
              ·{' '}
              <T k="xgt">
                xGT(v)<sup>τ</sup>
              </T>
            </div>
            <div>
              <T k="choice">P(u→v)</T> = preference(u→v) / Σ preference(u→·)
            </div>
          </Eq>
        </div>

        <div className="self-start">
          <Callout tone="idea" title="Why xGT appears twice">
            <T k="xgt">xGT(v)</T> is in the preference (the player <em>looks at</em> how dangerous the receiver is) and
            in the sum (it is <em>what the pass is worth</em> when it arrives). The first is about choosing, the second
            about the outcome.
          </Callout>
        </div>
      </div>

      <Card className="mt-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[13px] font-semibold text-[#e2f8ff]">
              Case study: going {CASE.from} → {CASE.goal}, should A* go through Arad or Oradea?
            </p>
            <p className="mt-1 text-[12px] text-[#5b7a94]">
              This is where the first version went wrong. Arad is really the better way (its best route is 7 shorter),
              but it has three roads to Oradea&apos;s two.
            </p>
          </div>
          <Toggle
            label="Pass-choice rule"
            value={version}
            onChange={setVersion}
            options={[
              { value: 'first', label: 'Short roads only (first version)' },
              { value: 'final', label: '+ dangerous receivers (final)' },
            ]}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {[study.left, study.right].map((side) => (
            <div key={side.city} className="rounded-[12px] border border-cyan-500/15 bg-[#060a13]/60 p-3 sm:p-4">
              <PanelTitle aside={<span style={MONO}>arrow width = chance picked</span>}>
                Player on {side.city}
              </PanelTitle>
              <PassFan breakdown={side.breakdown} goal={CASE.goal} title={`Passing choices from ${side.city}`} />
              <dl className="mt-2 grid grid-cols-2 gap-2 text-[12px]">
                <div className="rounded-[8px] bg-[#0b1220] px-3 py-2">
                  <dt className="text-[#5b7a94]">passes toward Sibiu</dt>
                  <dd className="text-[16px] font-bold" style={{ ...MONO, color: TERM.choice }}>
                    {pct(toSibiu(side))}
                  </dd>
                </div>
                <div className="rounded-[8px] bg-[#0b1220] px-3 py-2">
                  <dt className="text-[#5b7a94]">
                    → <T k="h">h({side.city})</T>
                  </dt>
                  <dd className="text-[16px] font-bold" style={{ ...MONO, color: TERM.h }}>
                    {side.h}
                  </dd>
                </div>
              </dl>
            </div>
          ))}
        </div>

        <div
          className={`mt-4 flex flex-col gap-2 rounded-[12px] border px-4 py-3 text-[13px] leading-[1.7] ${
            correct ? 'border-emerald-400/30 bg-emerald-400/[0.06]' : 'border-red-400/30 bg-red-500/[0.06]'
          }`}
        >
          <p style={MONO} className="text-[#cbe7f5]">
            at {CASE.from}: <T k="f">f(Arad)</T> = {study.left.w} + {study.left.h} = {study.left.f}
            {'   '}vs{'   '}
            <T k="f">f(Oradea)</T> = {study.right.w} + {study.right.h} = {study.right.f}
          </p>
          <p className="text-[#e2f8ff]">
            A* opens <strong style={{ color: correct ? '#4ade80' : ROLE.goal }}>{winner.city}</strong> first.{' '}
            {correct
              ? "Correct. Arad's player now sends most passes toward Sibiu, where the danger is, so Arad gets the lower h."
              : "Wrong way. Arad's player sends most passes down its short roads to Zerind and Timisoara, which lead away from the goal, so Arad looks worse than Oradea even though it is closer."}
          </p>
        </div>
      </Card>
    </Chapter>
  );
}
