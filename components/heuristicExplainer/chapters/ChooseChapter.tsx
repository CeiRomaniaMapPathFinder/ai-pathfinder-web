import { XGT_PARAMS } from '../../../lib/xgtHeuristic';
import { Callout, Chapter, Eq, M, Prose, T } from '../ui';
import ForkCaseStudy from './ForkCaseStudy';

export default function ChooseChapter() {
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

      <ForkCaseStudy />
    </Chapter>
  );
}
