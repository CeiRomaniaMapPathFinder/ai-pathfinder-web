import { firstMoves } from '../derive';
import GuessDiagram from '../illustrations/GuessDiagram';
import type { ExplainerModel } from '../shared';
import { Card, Chapter, City, M, Prose, T } from '../ui';

export default function GuessChapter({ model }: { model: ExplainerModel }) {
  const { start, goal, result } = model;
  const first = start === goal ? null : firstMoves(start, result.h)[0];

  return (
    <Chapter index={1} id="hiw-guess" kicker="THE PROBLEM" title="A* needs a guess">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:items-center">
        <Prose>
          <p>
            A* opens cities in order of <T k="f">f</T> = <T k="g">g</T> + <T k="h">h</T>. <T k="g">g</T> is the road
            cost already driven from the start, so it is known exactly. <T k="h">h</T> is a <em>guess</em> of the cost
            still left to the goal. It can&apos;t be known without solving the whole problem, and the quality of this
            guess decides how straight A* heads for the goal.
          </p>
          <p>
            Our guess has to meet two conditions. It must be a{' '}
            <strong className="text-[#e2f8ff]">number in road-cost units</strong>, because it is added to <T k="g">g</T>
            . And it must be <strong className="text-[#e2f8ff]">smaller for cities that are better placed</strong>,
            because A* opens the smallest <T k="f">f</T> first.
          </p>
          <p>
            The rest of this page builds that number from scratch for your route,{' '}
            <City name={start} start={start} goal={goal} /> → <City name={goal} start={start} goal={goal} />. At the
            start <T k="g">g = 0</T>, so the first number A* sees is <T k="h">h({start})</T> ={' '}
            <M className="font-semibold text-[#fbbf24]">{result.h[start]}</M>.
          </p>
        </Prose>

        {first ? (
          <Card>
            <GuessDiagram start={start} via={first.city} goal={goal} g={first.g} h={first.h} />
            <p className="mt-2 text-[12px] leading-[1.6] text-[#5b7a94]">
              One road into the search: A* has driven {first.g} to reach {first.city}. How far is it still to {goal}?
              That missing number is <T k="h">h</T>.
            </p>
          </Card>
        ) : (
          <Card>
            <p className="text-[14px] leading-[1.7]">
              Your start is already the goal, so <T k="h">h = 0</T> and A* stops at once. Pick a different start in{' '}
              <em>Change Route</em> to see a real search; the explanation below still uses {goal} as the goal.
            </p>
          </Card>
        )}
      </div>
    </Chapter>
  );
}
