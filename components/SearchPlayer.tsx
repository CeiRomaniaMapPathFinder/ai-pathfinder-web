'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  TbChevronDown,
  TbPlayerPauseFilled,
  TbPlayerPlayFilled,
  TbPlayerSkipBackFilled,
  TbPlayerSkipForwardFilled,
  TbPlayerTrackNextFilled,
  TbPlayerTrackPrevFilled,
} from 'react-icons/tb';
import RomaniaMap from './RomaniaMap';
import type { SearchTraceStep } from '../lib/searchApi';
import { describePlayerStatus } from '../lib/playbackStatus';
import { GLASS_CARD } from '../lib/uiTheme';

type SearchPlayerProps = {
  title: string;
  start?: string;
  goal?: string;
  trace: SearchTraceStep[];
  active: boolean;
  onActivate: () => void;
  onStepChange?: (step: SearchTraceStep | undefined, index: number) => void;
  runToken?: number;
  resetToken?: number;
};

const SPEEDS = [0.5, 1, 1.5, 2, 4];
const BASE_STEP_MS = 800;
const RUN_BOTH_DURATION_MS = 6000;

export default function SearchPlayer({
  title,
  start,
  goal,
  trace,
  active,
  onActivate,
  onStepChange,
  runToken,
  resetToken,
}: SearchPlayerProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const frameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const elapsedRef = useRef(0);
  const syncedStepDurationRef = useRef<number | null>(null);
  const lastRunTokenRef = useRef(runToken);
  const lastResetTokenRef = useRef(resetToken);

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
    syncedStepDurationRef.current = null;
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

    syncedStepDurationRef.current = null;
    setStepIndex((current) => (current >= maxIndex ? 0 : current));
    setIsPlaying(true);
  }, [isPlaying, maxIndex, pause, trace.length]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    pause();
    setStepIndex(0);
  }, [start, goal, trace, pause]);

  useEffect(() => {
    if (runToken === undefined || runToken === lastRunTokenRef.current) return;
    lastRunTokenRef.current = runToken;

    const remainingSteps = maxIndex - stepIndex;
    if (trace.length <= 1 || remainingSteps <= 0) return;

    syncedStepDurationRef.current = RUN_BOTH_DURATION_MS / remainingSteps;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsPlaying(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runToken]);

  useEffect(() => {
    if (resetToken === undefined || resetToken === lastResetTokenRef.current) return;
    lastResetTokenRef.current = resetToken;
    reset();
  }, [resetToken, reset]);

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

      const stepDuration = syncedStepDurationRef.current ?? BASE_STEP_MS / speed;

      if (elapsedRef.current >= stepDuration) {
        elapsedRef.current %= stepDuration;
        setStepIndex((current) => {
          if (current >= maxIndex) {
            setIsPlaying(false);
            syncedStepDurationRef.current = null;
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

  const { statusLabel, pathText } = describePlayerStatus(trace, step, start, goal);

  return (
    <section
      onMouseDown={onActivate}
      className={`flex min-h-0 flex-1 flex-col ${GLASS_CARD} px-4 pt-2.5 pb-2 transition ${
        active ? 'ring-2 ring-cyan-400/50 shadow-[0_0_25px_rgba(34,211,238,0.25)]' : ''
      }`}
    >
      <div className="flex shrink-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <h2
            className="text-[13px] font-bold leading-tight text-[#a5f3fc] sm:truncate sm:text-[14px]"
            style={{ textShadow: '0 0 6px rgba(34,211,238,0.6)' }}
          >
            {title}
          </h2>
          <p className="mt-0.5 text-[11px] text-[#7dd3fc] sm:truncate">
            {statusLabel} · {pathText}
          </p>
        </div>
        <div className="shrink-0 text-right text-[10px] leading-tight text-[#5b7a94]">
          <div className="font-semibold text-[#a5f3fc]">Step {trace.length ? stepIndex + 1 : 0} / {trace.length}</div>
        </div>
      </div>

      <div className="mt-1.5 aspect-[3/2] max-h-[70vh] w-full xl:aspect-auto xl:max-h-none xl:min-h-0 xl:flex-1">
        <RomaniaMap start={start} goal={goal} step={step} />
      </div>

      <div className="mt-1.5 flex shrink-0 items-center gap-1">
        <button type="button" title="Reset" onClick={reset} className="flex h-6 w-6 items-center justify-center rounded-md text-[#7dd3fc] hover:bg-cyan-500/10">
          <TbPlayerSkipBackFilled size={13} />
        </button>
        <button type="button" title="Previous step" onClick={previous} disabled={stepIndex === 0} className="flex h-6 w-6 items-center justify-center rounded-md text-[#7dd3fc] hover:bg-cyan-500/10 disabled:opacity-30">
          <TbPlayerTrackPrevFilled size={13} />
        </button>
        <button
          type="button"
          title={isPlaying ? 'Pause' : 'Play'}
          onClick={togglePlay}
          disabled={trace.length <= 1}
          className="flex h-6 min-w-8 items-center justify-center rounded-md bg-[#0891b2] px-2 text-[#f0fdff] shadow-[0_0_10px_rgba(34,211,238,0.4)] hover:bg-cyan-600 disabled:opacity-30 disabled:shadow-none"
        >
          {isPlaying ? <TbPlayerPauseFilled size={13} /> : <TbPlayerPlayFilled size={13} />}
        </button>
        <button type="button" title="Next step" onClick={next} disabled={stepIndex >= maxIndex} className="flex h-6 w-6 items-center justify-center rounded-md text-[#7dd3fc] hover:bg-cyan-500/10 disabled:opacity-30">
          <TbPlayerTrackNextFilled size={13} />
        </button>
        <button type="button" title="Jump to end" onClick={jumpToEnd} disabled={stepIndex >= maxIndex} className="flex h-6 w-6 items-center justify-center rounded-md text-[#7dd3fc] hover:bg-cyan-500/10 disabled:opacity-30">
          <TbPlayerSkipForwardFilled size={13} />
        </button>

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
          className="mx-2 min-w-0 flex-1 accent-[#22d3ee]"
        />

        <div className="relative flex items-center">
          <select
            aria-label="Playback speed"
            value={speed}
            onChange={(event) => setSpeed(Number(event.target.value))}
            className="h-6 appearance-none rounded-md border-none bg-transparent py-0 pr-4 pl-1 text-xs font-semibold text-[#7dd3fc] outline-none"
          >
            {SPEEDS.map((value) => <option key={value} value={value} className="bg-[#0b1220] text-[#e2f8ff]">{value}×</option>)}
          </select>
          <TbChevronDown size={12} className="pointer-events-none absolute right-0.5 text-[#7dd3fc]" />
        </div>
      </div>
    </section>
  );
}