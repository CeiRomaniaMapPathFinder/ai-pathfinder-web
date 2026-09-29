import { XGT_PARAMS } from '../../../lib/xgtHeuristic';
import { chainInto } from '../derive';
import PassChain from '../illustrations/PassChain';
import PassOdds from '../illustrations/PassOdds';
import { dec, pct, type ExplainerModel } from '../shared';
import { Callout, Card, Chapter, City, Eq, M, PanelTitle, Prose, T } from '../ui';

export default function FailChapter({ model }: { model: ExplainerModel }) {
  const { start, goal } = model;
  const chain = chainInto(goal);
  const gamma = XGT_PARAMS.gamma;
  const cNear = Math.exp(-gamma * chain.wNear);
  const cFar = Math.exp(-gamma * chain.wFar);

  return (
    <Chapter index={3} id="hiw-fail" kicker="STEP 1" title="Passes can fail">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
        <div className="flex min-w-0 flex-col gap-5">
          <Prose>
            <p>
              A long pass is more likely to be intercepted. So each road gets a{' '}
              <strong className="text-[#e2f8ff]">completion chance</strong> <T k="completion">C</T>: the probability
              that a pass down it arrives. It falls smoothly as the road cost <M>w</M> grows:
            </p>
          </Prose>
          <Eq caption={<>γ (gamma) = {gamma} sets how quickly the chance drops. e ≈ 2.718.</>}>
            <div>
              <T k="completion">C(road)</T> = e<sup>−γ · w</sup>
            </div>
          </Eq>
          <Prose>
            <p>
              Why an exponential? Because it makes chances <em>multiply</em> the same way road costs <em>add</em>. A
              ball that has to make two passes to reach the goal must survive both. Here are the two shortest roads
              leading into <City name={goal} start={start} goal={goal} />:
            </p>
          </Prose>
          <Card>
            <PanelTitle aside="the ball starts on the left">Two passes to the goal</PanelTitle>
            <PassChain chain={chain} />
            <Eq>
              <div>
                {pct(cFar)} × {pct(cNear)} = <T k="completion">{pct(cFar * cNear)}</T>
              </div>
              <div className="text-[#9cc3dc]">
                e<sup>−γ·{chain.wFar}</sup> × e<sup>−γ·{chain.wNear}</sup> = e
                <sup>
                  −γ·({chain.wFar} + {chain.wNear})
                </sup>{' '}
                = e<sup>−γ·{chain.wFar + chain.wNear}</sup> = {dec(cFar * cNear)}
              </div>
            </Eq>
            <p className="mt-3 text-[13px] leading-[1.7] text-[#9cc3dc]">
              The total road length, {chain.wFar + chain.wNear}, is hidden inside the chance. We use that in step 4 to
              turn a chance back into a road cost.
            </p>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <PassOdds initial={chain.wNear} />
          <Callout tone="idea" title="Why passes must be able to fail">
            Our very first version had no <T k="completion">C</T>, so the ball was never lost. Then every attack reaches
            the goal eventually, every city scores 100%, every <T k="h">h</T> comes out 0, and A* is guessing blind.
            Losing the ball on long roads is what makes far-away cities worth less.
          </Callout>
        </div>
      </div>
    </Chapter>
  );
}
