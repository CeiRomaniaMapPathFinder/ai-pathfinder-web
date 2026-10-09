import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { TbPlayerPauseFilled, TbPlayerPlayFilled, TbPlayerTrackNext, TbPlayerTrackPrev } from 'react-icons/tb';
import { hFromXgt, INITIAL_XGT } from '../../../lib/xgtHeuristic';
import { roadsFromGoal, roundHSettles } from '../derive';
import ThreatMap from '../illustrations/ThreatMap';
import { MONO, TERM, pct, type ExplainerModel } from '../shared';
import { Card, Chapter, City, Eq, M, Prose, T } from '../ui';

const PLAY_MS = 700;

function RoundButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border border-cyan-500/30 bg-[#0b1220] text-[#67e8f9] transition hover:shadow-[0_0_14px_rgba(34,211,238,0.4)] disabled:opacity-30 disabled:shadow-none"
    >
      {children}
    </button>
  );
}

export default function SpreadChapter({ model }: { model: ExplainerModel }) {
  const { start, goal, result } = model;
  const last = result.rounds.length - 1;
  const [round, setRound] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [selected, setSelected] = useState(start === goal ? goal : start);

  const hops = useMemo(() => roadsFromGoal(goal), [goal]);
  const maxHops = Math.max(...Object.values(hops));
  const hSettles = useMemo(() => roundHSettles(result.rounds, result.h, goal, result.params.gamma), [result, goal]);

  useEffect(() => {
    if (!playing) return;
    const timer = setTimeout(
      () => {
        setRound(Math.min(round + 1, last));
        if (round + 1 >= last) setPlaying(false);
      },
      round < maxHops + 2 ? PLAY_MS : PLAY_MS / 3,
    );
    return () => clearTimeout(timer);
  }, [playing, round, last, maxHops]);

  const table = result.rounds[round];
  const selectedXgt = table[selected];
  const selectedH = selected === goal ? 0 : hFromXgt(selectedXgt);

  const story =
    round === 0
      ? `The starting guess. ${goal} is 100% (the ball is already in the goal) and every other city is a tiny ${pct(INITIAL_XGT)}. Nobody knows where the goal is yet.`
      : round === 1
        ? `Cities one road from ${goal} can now pass straight in, so they get a real value. Everyone else drops, because so far their neighbours look useless.`
        : round <= maxHops
          ? `The threat has reached cities ${round} roads from ${goal}. Each round it spreads one road further.`
          : round < hSettles
            ? `Every city has now heard of ${goal}. The values are being fine-tuned as better routes feed back in.`
            : round < last
              ? `From round ${hSettles} on, no rounded h changes any more. Only tiny decimals are still moving.`
              : `Converged after ${last} rounds: one more round would change no value by more than 0.000000000001.`;

  return (
    <Chapter index={5} id="hiw-spread" kicker="STEP 3" title="Letting threat spread">
      <Prose>
        <p>
          There&apos;s a chicken-and-egg problem. To compute <T k="xgt">xGT</T> of a city we need the <T k="xgt">xGT</T>{' '}
          of its neighbours, and they need theirs. We solve it by <strong className="text-[#e2f8ff]">repeating</strong>.
          Start from a rough guess, apply step 2 to every city at once using last round&apos;s numbers, and do it again
          until nothing changes.
        </p>
      </Prose>

      <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <Card className="!p-3 sm:!p-4">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <RoundButton
              label="Previous round"
              onClick={() => setRound((r) => Math.max(0, r - 1))}
              disabled={round === 0}
            >
              <TbPlayerTrackPrev size={14} />
            </RoundButton>
            <RoundButton
              label={playing ? 'Pause' : 'Play the rounds'}
              onClick={() => {
                if (round >= last) setRound(0);
                setPlaying((p) => !p);
              }}
            >
              {playing ? <TbPlayerPauseFilled size={14} /> : <TbPlayerPlayFilled size={14} />}
            </RoundButton>
            <RoundButton
              label="Next round"
              onClick={() => setRound((r) => Math.min(last, r + 1))}
              disabled={round === last}
            >
              <TbPlayerTrackNext size={14} />
            </RoundButton>
            <input
              type="range"
              min={0}
              max={last}
              value={round}
              aria-label="Round"
              onChange={(event) => {
                setPlaying(false);
                setRound(Number(event.target.value));
              }}
              className="min-w-[120px] flex-1 accent-cyan-400"
            />
            <span className="w-[92px] shrink-0 text-right text-[12px] text-[#a5f3fc]" style={MONO}>
              round {round}/{last}
            </span>
          </div>
          <ThreatMap table={table} start={start} goal={goal} selected={selected} onSelect={setSelected} />
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <p className="text-[11px] font-semibold tracking-wide text-[#5b7a94] uppercase">What is happening</p>
            <p className="mt-2 min-h-[7.5em] text-[14px] leading-[1.7] text-[#e2f8ff]" aria-live="polite">
              {story}
            </p>
          </Card>
          <Card>
            <p className="text-[11px] font-semibold tracking-wide text-[#5b7a94] uppercase">
              Following <City name={selected} start={start} goal={goal} />
            </p>
            <dl className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-[8px] bg-[#0b1220] px-3 py-2">
                <dt className="text-[11px] text-[#5b7a94]">xGT this round</dt>
                <dd className="text-[18px] font-bold" style={{ ...MONO, color: TERM.xgt }}>
                  {pct(selectedXgt)}
                </dd>
              </div>
              <div className="rounded-[8px] bg-[#0b1220] px-3 py-2">
                <dt className="text-[11px] text-[#5b7a94]">h if we stopped now</dt>
                <dd className="text-[18px] font-bold" style={{ ...MONO, color: TERM.h }}>
                  {selectedH}
                </dd>
              </div>
            </dl>
            <p className="mt-3 text-[12px] leading-[1.6] text-[#5b7a94]">
              Final: <M className="text-[#a7f3d0]">{pct(result.xgt[selected])}</M> →{' '}
              <M className="text-[#fde68a]">h = {result.h[selected]}</M>
              {selected !== goal && hops[selected] !== undefined && (
                <>
                  {' '}
                  · {hops[selected]} road{hops[selected] === 1 ? '' : 's'} from the goal
                </>
              )}
            </p>
          </Card>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Eq
          caption={`Every city except ${goal} is updated from the previous round's table, all at once; then the new table replaces the old one.`}
        >
          <div className="text-[#5b7a94]">round 0:</div>
          <div>
            <T k="xgt">xGT[{goal}]</T> = 1{'    '}
            <T k="xgt">xGT[others]</T> = {INITIAL_XGT}
          </div>
          <div className="text-[#5b7a94]">each round:</div>
          <div>
            <T k="xgt">xGT&apos;[u]</T> = Σ <T k="choice">P</T> · <T k="completion">C</T> · <T k="xgt">xGT[v]</T>
          </div>
        </Eq>
        <Prose className="text-[14px]">
          <p>
            Why not start every city at 0? Because the preference uses{' '}
            <T k="xgt">
              xGT(v)<sup>τ</sup>
            </T>
            . With all zeros, every road would score 0 and <T k="choice">P</T> would be 0 ÷ 0. A tiny {INITIAL_XGT}{' '}
            avoids that, and it is washed out within a few rounds.
          </p>
          <p>
            For goal <City name={goal} start={start} goal={goal} /> the table settles after{' '}
            <M className="font-semibold text-[#e2f8ff]">{last}</M> rounds. We stop when the largest change is below 10
            <sup>−12</sup>, a tolerance rather than exact equality, because decimals on a computer can flicker in their
            last digit forever.
          </p>
        </Prose>
      </div>
    </Chapter>
  );
}
