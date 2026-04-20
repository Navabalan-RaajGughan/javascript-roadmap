"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface PomodoroState {
  timeLeft: number; // seconds remaining
  isRunning: boolean;
  isBreak: boolean;
  sessionsCompleted: number;
}

interface PomodoroActions {
  start: () => void;
  pause: () => void;
  reset: () => void;
  skip: () => void;
}

type UsePomodoroReturn = PomodoroState & PomodoroActions;

/**
 * Pomodoro timer hook.
 * @param workMinutes   Duration of a work session (default: 25)
 * @param breakMinutes  Duration of a break session (default: 5)
 */
export function usePomodoro(
  workMinutes: number = 25,
  breakMinutes: number = 5
): UsePomodoroReturn {
  const [timeLeft, setTimeLeft] = useState(workMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Play a short beep using Web Audio API
  const playBeep = useCallback(() => {
    try {
      const ctx = new AudioContext();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.frequency.value = 800;
      oscillator.type = "sine";
      gain.gain.value = 0.3;
      oscillator.start();
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      oscillator.stop(ctx.currentTime + 0.5);
      // Play a second beep after a short delay
      setTimeout(() => {
        try {
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          osc2.frequency.value = 1000;
          osc2.type = "sine";
          gain2.gain.value = 0.3;
          osc2.start();
          gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
          osc2.stop(ctx.currentTime + 0.5);
        } catch {
          /* ignore */
        }
      }, 300);
    } catch {
      /* Web Audio not available */
    }
  }, []);

  // Tick the timer
  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Timer done — switch modes
          playBeep();
          if (!isBreak) {
            setSessionsCompleted((s) => s + 1);
            setIsBreak(true);
            return breakMinutes * 60;
          } else {
            setIsBreak(false);
            return workMinutes * 60;
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, isBreak, workMinutes, breakMinutes, playBeep]);

  const start = useCallback(() => setIsRunning(true), []);
  const pause = useCallback(() => setIsRunning(false), []);

  const reset = useCallback(() => {
    setIsRunning(false);
    setIsBreak(false);
    setTimeLeft(workMinutes * 60);
  }, [workMinutes]);

  const skip = useCallback(() => {
    if (isBreak) {
      setIsBreak(false);
      setTimeLeft(workMinutes * 60);
    } else {
      setIsBreak(true);
      setTimeLeft(breakMinutes * 60);
    }
    setIsRunning(false);
  }, [isBreak, workMinutes, breakMinutes]);

  return {
    timeLeft,
    isRunning,
    isBreak,
    sessionsCompleted,
    start,
    pause,
    reset,
    skip,
  };
}
