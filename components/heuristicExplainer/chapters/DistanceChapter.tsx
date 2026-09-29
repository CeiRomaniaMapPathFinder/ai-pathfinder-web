import { XGT_PARAMS } from '../../../lib/xgtHeuristic';
import { chainInto } from '../derive';
import ChanceCurve from '../illustrations/ChanceCurve';
import { MONO, ROLE, TERM, dec, pct, type ExplainerModel } from '../shared';
import { Bar, Card, Chapter, City, Eq, PanelTitle, Prose, T } from '../ui';

export default function DistanceChapter({ model }: { model: ExplainerModel }) {
  const { start, goal, result } = model;
  const gamma = XGT_PARAMS.gamma;
  const chain = chainInto(goal);
  const chainChance = Math.exp(-gamma * (chain.wFar + chain.wNear));
  const rows = Object.keys(result.h).sort((a, b) => result.h[a] - result.h[b] || a.localeCompare(b));
  const maxH = Math.max(...Object.values(result.h));
  const startRaw = -Math.log(result.xgt[start]) / gamma;

  return (
    <Chapter index={6} id="hiw-distance" kicker="STEP 4" title="From chance to h">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)]">
        <div className="flex min-w-0 flex-col gap-5">
          <Prose>
            <p>
              <T k="xgt">xGT</T> is a chance between 0 and 1, but A* needs <T k="h">h</T> in road-cost units so it can
              be added to <T k="g">g</T>. Remember from step 1 that chances along a chain multiply,{' '}
              <span style={MONO}>
                e<sup>−γ·a</sup> × e<sup>−γ·b</sup> = e<sup>−γ·(a+b)</sup>
              </span>
              , so the total road length sits in the exponent. The natural logarithm <span style={MONO}>ln</span> brings
              it back down:
            </p>
          </Prose>
          <Eq caption="Rounded to the nearest whole number. The goal itself has xGT = 1, so h(goal) = 0.">
            <div>
              <T k="h">h(city)</T> = round( −ln( <T k="xgt">xGT(city)</T> ) ÷ γ )
            </div>
          </Eq>
          <Card>
            <PanelTitle>Check it on the two-pass chain from step 1</PanelTitle>
            <Eq>
              <div>
                −ln( {dec(chainChance)} ) ÷ {gamma} = −ln( e<sup>−γ·{chain.wFar + chain.wNear}</sup> ) ÷ γ ={' '}
                <T k="h">{chain.wFar + chain.wNear}</T>
              </div>
            </Eq>
            <p className="mt-3 text-[13px] leading-[1.7] text-[#9cc3dc]">
              That is exactly the road length {chain.far} → {chain.near} → {goal}. For a real city the ball sometimes
              takes a side road, so <T k="xgt">xGT</T> is a little lower and <T k="h">h</T> comes out a little above the
              plain road length. That small extra is the football model at work, not a distance measurement.
            </p>
          </Card>
          <Prose>
            <p>
              High chance → small <T k="h">h</T>. Low chance → large <T k="h">h</T>. Each time the chance halves,{' '}
              <T k="h">h</T> grows by about 69, however far from the goal you are.
            </p>
          </Prose>
        </div>

        <Card className="self-start">
          <PanelTitle aside="every dot is a city">xGT → h for goal {goal}</PanelTitle>
          <ChanceCurve xgt={result.xgt} h={result.h} start={start} goal={goal} />
          {start !== goal && (
            <p className="mt-3 text-[13px] leading-[1.7] text-[#9cc3dc]">
              <City name={start} start={start} goal={goal} />: −ln({dec(result.xgt[start])}) ÷ {gamma} ={' '}
              {startRaw.toFixed(1)} → <T k="h">h = {result.h[start]}</T>
            </p>
          )}
        </Card>
      </div>

      <Card className="mt-6">
        <PanelTitle aside={<span style={MONO}>these are the h values under each node in the tree above</span>}>
          The full table for goal <City name={goal} start={start} goal={goal} />
        </PanelTitle>
        {/* Column-first flow, so reading down the left column and then the
            right keeps the sorted order. */}
        <ul className="columns-1 gap-x-10 md:columns-2">
          {rows.map((city) => {
            const isGoal = city === goal;
            const isStart = city === start;
            return (
              <li
                key={city}
                className={`flex break-inside-avoid items-center gap-3 rounded-[6px] px-2 py-1.5 text-[13px] ${isStart ? 'bg-emerald-400/[0.08]' : ''}`}
              >
                <span
                  className="w-[112px] shrink-0 truncate"
                  style={{
                    color: isGoal ? ROLE.goal : isStart ? ROLE.start : '#cbe7f5',
                    fontWeight: isGoal || isStart ? 600 : 400,
                  }}
                >
                  {city}
                </span>
                <span className="w-[54px] shrink-0 text-right text-[11px]" style={{ ...MONO, color: TERM.xgt }}>
                  {pct(result.xgt[city])}
                </span>
                <Bar ratio={result.h[city] / maxH} color="rgba(251,191,36,0.7)" className="min-w-0 flex-1" />
                <span className="w-9 shrink-0 text-right font-semibold" style={{ ...MONO, color: TERM.h }}>
                  {result.h[city]}
                </span>
              </li>
            );
          })}
        </ul>
      </Card>
    </Chapter>
  );
}
