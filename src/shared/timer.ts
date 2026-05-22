import type { TimerMode, TimerSnapshot } from "./types";

export type CreateTimerSnapshotOptions = {
  mode?: TimerMode;
  countdownTotalSeconds?: number;
  isAlwaysOnTop?: boolean;
  now?: Date;
};

function clampSeconds(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.floor(value));
}

function elapsedFromStartedAt(snapshot: TimerSnapshot, now: Date): number {
  if (!snapshot.startedAtIso) {
    return snapshot.elapsedSeconds;
  }

  return clampSeconds((now.getTime() - new Date(snapshot.startedAtIso).getTime()) / 1000);
}

export function createTimerSnapshot(options: CreateTimerSnapshotOptions = {}): TimerSnapshot {
  return {
    mode: options.mode ?? "stopwatch",
    isRunning: false,
    isAlwaysOnTop: options.isAlwaysOnTop ?? true,
    elapsedSeconds: 0,
    countdownTotalSeconds: options.countdownTotalSeconds
      ? clampSeconds(options.countdownTotalSeconds)
      : undefined
  };
}

export function startTimer(snapshot: TimerSnapshot, now = new Date()): TimerSnapshot {
  if (snapshot.isRunning) {
    return tickTimer(snapshot, now);
  }

  const elapsedSeconds = clampSeconds(snapshot.elapsedSeconds);
  const zeroPoint = new Date(now.getTime() - elapsedSeconds * 1000);

  return {
    ...snapshot,
    isRunning: true,
    startedAtIso: zeroPoint.toISOString(),
    pausedAtIso: undefined,
    completedAtIso: undefined
  };
}

export function tickTimer(snapshot: TimerSnapshot, now = new Date()): TimerSnapshot {
  if (!snapshot.isRunning) {
    return snapshot;
  }

  const totalSeconds = snapshot.countdownTotalSeconds ?? 0;
  const elapsedSeconds =
    snapshot.mode === "countdown"
      ? Math.min(totalSeconds, elapsedFromStartedAt(snapshot, now))
      : elapsedFromStartedAt(snapshot, now);
  const countdownCompleted = snapshot.mode === "countdown" && totalSeconds > 0 && elapsedSeconds >= totalSeconds;

  return {
    ...snapshot,
    isRunning: countdownCompleted ? false : snapshot.isRunning,
    elapsedSeconds,
    completedAtIso: countdownCompleted ? now.toISOString() : undefined
  };
}

export function pauseTimer(snapshot: TimerSnapshot, now = new Date()): TimerSnapshot {
  const ticked = tickTimer(snapshot, now);

  return {
    ...ticked,
    isRunning: false,
    pausedAtIso: now.toISOString()
  };
}

export function resetTimer(snapshot: TimerSnapshot): TimerSnapshot {
  return {
    mode: snapshot.mode,
    isRunning: false,
    isAlwaysOnTop: snapshot.isAlwaysOnTop,
    elapsedSeconds: 0,
    countdownTotalSeconds: snapshot.countdownTotalSeconds
  };
}

export function updateTimerMode(snapshot: TimerSnapshot, mode: TimerMode): TimerSnapshot {
  return resetTimer({
    ...snapshot,
    mode,
    countdownTotalSeconds: mode === "countdown" ? snapshot.countdownTotalSeconds ?? 1500 : undefined
  });
}

export function updateCountdownTotal(snapshot: TimerSnapshot, totalSeconds: number): TimerSnapshot {
  const countdownTotalSeconds = clampSeconds(totalSeconds);

  return resetTimer({
    ...snapshot,
    mode: "countdown",
    countdownTotalSeconds
  });
}

export function updateAlwaysOnTop(snapshot: TimerSnapshot, isAlwaysOnTop: boolean): TimerSnapshot {
  return {
    ...snapshot,
    isAlwaysOnTop
  };
}

export function remainingCountdownSeconds(snapshot: TimerSnapshot): number {
  if (snapshot.mode !== "countdown") {
    return 0;
  }

  return Math.max(0, (snapshot.countdownTotalSeconds ?? 0) - snapshot.elapsedSeconds);
}

export function displaySeconds(snapshot: TimerSnapshot): number {
  return snapshot.mode === "countdown" ? remainingCountdownSeconds(snapshot) : snapshot.elapsedSeconds;
}

export function formatTimerSeconds(seconds: number): string {
  const clamped = clampSeconds(seconds);
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const remainingSeconds = clamped % 60;

  return [hours, minutes, remainingSeconds].map((part) => String(part).padStart(2, "0")).join(":");
}
