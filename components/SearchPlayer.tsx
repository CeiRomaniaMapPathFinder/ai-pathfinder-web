'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import RomaniaMap from './RomaniaMap';
import type { SearchTraceStep } from '../lib/routePath';

type SearchPlayerProps = {
  title: string;
  start?: string;
  goal?: string;
  trace: SearchTraceStep[];
  active: boolean;
  onActivate: () => void;
  onStepChange?: (step: SearchTraceStep | undefined, index: number) => void;
};

const SPEEDS = [0.5, 1, 1.5, 2, 4];
const BASE_STEP_MS = 800;

export default function SearchPlayer({
  title,
  start,
  goal,
  trace,
  active,
  onActivate,
  onStepChange,
}: SearchPlayerProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const frameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const elapsedRef = useRef(0);

  const maxIndex = Math.max(trace.length - 1, 0);
  const step = trace[stepIndex];

  const stopAnimationFrame = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    lastTimeRef.current = null;
    elapsedRef.current = 0;
  }, []);

  const pause = useCallback(() => {
    setIsPlaying(false);
    stopAnimationFrame();
  }, [stopAnimationFrame]);

  const reset = useCallback(() => {
    pause();
    setStepIndex(0);
  }, [pause]);

  const previous = useCallback(() => {
    pause();
    setStepIndex((current) => Math.max(0, current - 1));
  }, [pause]);

  const next = useCallback(() => {
    pause();
    setStepIndex((current) => Math.min(maxIndex, current + 1));
  }, [maxIndex, pause]);

  const jumpToEnd = useCallback(() => {
    pause();
    setStepIndex(maxIndex);
  }, [maxIndex, pause]);

  const togglePlay = useCallback(() => {
    if (trace.length <= 1) return;

    if (isPlaying) {
      pause();
      return;
    }

    setStepIndex((current) => (current >= maxIndex ? 0 : current));
    setIsPlaying(true);
  }, [isPlaying, maxIndex, pause, trace.length]);

  useEffect(() => {
    pause();
    setStepIndex(0);
  }, [start, goal, trace, pause]);

  useEffect(() => {
    onStepChange?.(step, stepIndex);
  }, [onStepChange, step, stepIndex]);

  useEffect(() => {
    if (!isPlaying || trace.length <= 1) {
      stopAnimationFrame();
      return;
    }

    const frame = (time: number) => {
      if (lastTimeRef.current === null) lastTimeRef.current = time;
      elapsedRef.current += time - lastTimeRef.current;
      lastTimeRef.current = time;

      const stepDuration = BASE_STEP_MS / speed;

      if (elapsedRef.current >= stepDuration) {
        elapsedRef.current %= stepDuration;
        setStepIndex((current) => {
          if (current >= maxIndex) {
            setIsPlaying(false);
            return current;
          }
          return current + 1;
        });
      }

      frameRef.current = requestAnimationFrame(frame);
    };

    frameRef.current = requestAnimationFrame(frame);
    return stopAnimationFrame;
  }, [isPlaying, maxIndex, speed, stopAnimationFrame, trace.length]);

  useEffect(() => {
    if (!active) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches('input, textarea, select, [contenteditable="true"]')) return;

      if (event.code === 'Space') {
        event.preventDefault();
        togglePlay();
      } else if (event.code === 'ArrowLeft') {
        event.preventDefault();
        previous();
      } else if (event.code === 'ArrowRight') {
        event.preventDefault();
        next();
      } else if (event.code === 'Home') {
        event.preventDefault();
        reset();
      } else if (event.code === 'End') {
        event.preventDefault();
        jumpToEnd();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [active, jumpToEnd, next, previous, reset, togglePlay]);

  useEffect(() => stopAnimationFrame, [stopAnimationFrame]);

  const pathText = step?.path.length
    ? step.path.join(' → ')
    : start && goal
      ? `${start} → ${goal}`
      : 'Select a start and goal city';

  return (
    <section
      onMouseDown={onActivate}
      className={`flex min-h-0 flex-1 flex-col rounded-[15px] bg-white px-7 pt-5 pb-4 shadow-sm transition ${
        active ? 'ring-2 ring-black/10' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-[22px] font-bold">{title}</h2>
          <p className="mt-1 truncate text-sm text-gray-500">
            {step?.done ? 'Path Found' : 'Current Path'}&nbsp;&nbsp; {pathText}
          </p>
        </div>
        <div className="shrink-0 text-right text-xs text-gray-500">
          <div className="font-semibold text-gray-900">Step {trace.length ? stepIndex + 1 : 0} / {trace.length}</div>
          <div>{active ? 'Keyboard active' : 'Click card for keyboard'}</div>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <RomaniaMap start={start} goal={goal} step={step} />
      </div>

      <div className="mt-2 flex items-center gap-1.5">
        <button type="button" title="Reset" onClick={reset} className="h-7 w-7 rounded-md text-sm text-gray-500 hover:bg-gray-100">↺</button>
        <button type="button" title="Previous step" onClick={previous} disabled={stepIndex === 0} className="h-7 w-7 rounded-md text-sm text-gray-500 hover:bg-gray-100 disabled:opacity-30">◀</button>
        <button type="button" title={isPlaying ? 'Pause' : 'Play'} onClick={togglePlay} disabled={trace.length <= 1} className="h-7 min-w-9 rounded-md bg-black px-3 text-sm text-white hover:bg-gray-800 disabled:opacity-30">
          {isPlaying ? '❚❚' : '▶'}
        </button>
        <button type="button" title="Next step" onClick={next} disabled={stepIndex >= maxIndex} className="h-7 w-7 rounded-md text-sm text-gray-500 hover:bg-gray-100 disabled:opacity-30">▶|</button>
        <button type="button" title="Jump to end" onClick={jumpToEnd} disabled={stepIndex >= maxIndex} className="h-7 w-7 rounded-md text-sm text-gray-500 hover:bg-gray-100 disabled:opacity-30">⏭</button>

        <input
          aria-label={`${title} search step`}
          type="range"
          min={0}
          max={maxIndex}
          value={Math.min(stepIndex, maxIndex)}
          disabled={trace.length <= 1}
          onChange={(event) => {
            pause();
            setStepIndex(Number(event.target.value));
          }}
          className="mx-2 min-w-0 flex-1 accent-black"
        />

        <select
          aria-label="Playback speed"
          value={speed}
          onChange={(event) => setSpeed(Number(event.target.value))}
          className="h-7 rounded-md border-none bg-transparent px-1 text-xs font-semibold text-gray-500 outline-none"
        >
          {SPEEDS.map((value) => <option key={value} value={value}>{value}×</option>)}
        </select>
      </div>
    </section>
  );
}