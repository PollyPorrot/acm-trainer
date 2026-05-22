import { describe, expect, test } from "vitest";
import {
  createTimerSnapshot,
  pauseTimer,
  remainingCountdownSeconds,
  resetTimer,
  startTimer,
  tickTimer,
  updateCountdownTotal
} from "../../src/shared/timer";

describe("timer helpers", () => {
  test("stopwatch accumulates elapsed seconds across start and pause", () => {
    const initial = createTimerSnapshot({ now: new Date("2026-05-22T00:00:00.000Z") });
    const running = startTimer(initial, new Date("2026-05-22T00:00:10.000Z"));
    const ticked = tickTimer(running, new Date("2026-05-22T00:01:15.000Z"));
    const paused = pauseTimer(ticked, new Date("2026-05-22T00:01:30.000Z"));

    expect(ticked.elapsedSeconds).toBe(65);
    expect(paused.elapsedSeconds).toBe(80);
    expect(paused.isRunning).toBe(false);
  });

  test("countdown clamps at zero and marks completion", () => {
    const timer = updateCountdownTotal(
      createTimerSnapshot({
        mode: "countdown",
        countdownTotalSeconds: 5,
        now: new Date("2026-05-22T00:00:00.000Z")
      }),
      5
    );
    const running = startTimer(timer, new Date("2026-05-22T00:00:00.000Z"));
    const completed = tickTimer(running, new Date("2026-05-22T00:00:07.000Z"));

    expect(completed.elapsedSeconds).toBe(5);
    expect(completed.isRunning).toBe(false);
    expect(completed.completedAtIso).toBe("2026-05-22T00:00:07.000Z");
    expect(remainingCountdownSeconds(completed)).toBe(0);
  });

  test("reset keeps mode, countdown total, and always-on-top preference", () => {
    const running = startTimer(
      createTimerSnapshot({
        mode: "countdown",
        countdownTotalSeconds: 90,
        isAlwaysOnTop: true,
        now: new Date("2026-05-22T00:00:00.000Z")
      }),
      new Date("2026-05-22T00:00:01.000Z")
    );
    const reset = resetTimer(running);

    expect(reset).toMatchObject({
      mode: "countdown",
      countdownTotalSeconds: 90,
      elapsedSeconds: 0,
      isRunning: false,
      isAlwaysOnTop: true
    });
  });
});
