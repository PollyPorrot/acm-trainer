import { Pause, Pin, Play, RotateCcw, TimerReset } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import {
  createTimerSnapshot,
  displaySeconds,
  formatTimerSeconds,
  pauseTimer,
  resetTimer,
  startTimer,
  tickTimer,
  updateAlwaysOnTop,
  updateCountdownTotal,
  updateTimerMode
} from "../../shared/timer";
import type { TimerMode, TimerSnapshot } from "../../shared/types";

function readCountdownMinutes(snapshot: TimerSnapshot): string {
  return String(Math.max(1, Math.round((snapshot.countdownTotalSeconds ?? 1500) / 60)));
}

function parseMinutes(value: string): number {
  const minutes = Number(value);

  if (!Number.isFinite(minutes)) {
    return 25;
  }

  return Math.min(999, Math.max(1, Math.floor(minutes)));
}

export function TimerPage() {
  const [snapshot, setSnapshot] = useState(() =>
    createTimerSnapshot({
      mode: "stopwatch",
      countdownTotalSeconds: 25 * 60,
      isAlwaysOnTop: true
    })
  );
  const [countdownMinutes, setCountdownMinutes] = useState(() => readCountdownMinutes(snapshot));

  useEffect(() => {
    if (!snapshot.isRunning) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setSnapshot((current) => tickTimer(current));
    }, 250);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [snapshot.isRunning]);

  useEffect(() => {
    try {
      void api.setTimerAlwaysOnTop(snapshot.isAlwaysOnTop).catch(() => undefined);
    } catch {
      // The timer page can be rendered by Vite without Electron during development.
    }
  }, [snapshot.isAlwaysOnTop]);

  useEffect(() => {
    if (!snapshot.completedAtIso) {
      return;
    }

    try {
      void api.notifyTimerComplete().catch(() => undefined);
    } catch {
      // The timer page can be rendered by Vite without Electron during development.
    }
  }, [snapshot.completedAtIso]);

  const displayValue = useMemo(() => formatTimerSeconds(displaySeconds(snapshot)), [snapshot]);
  const isCompleted = snapshot.mode === "countdown" && Boolean(snapshot.completedAtIso);

  function switchMode(mode: TimerMode) {
    setSnapshot((current) => {
      const next = updateTimerMode(current, mode);
      setCountdownMinutes(readCountdownMinutes(next));
      return next;
    });
  }

  function applyCountdownMinutes(minutesText = countdownMinutes) {
    const minutes = parseMinutes(minutesText);

    setCountdownMinutes(String(minutes));
    setSnapshot((current) => updateCountdownTotal(current, minutes * 60));
  }

  function start() {
    setSnapshot((current) => {
      const prepared =
        current.mode === "countdown" && !current.countdownTotalSeconds
          ? updateCountdownTotal(current, parseMinutes(countdownMinutes) * 60)
          : current;

      return startTimer(prepared);
    });
  }

  function pause() {
    setSnapshot((current) => pauseTimer(current));
  }

  function reset() {
    setSnapshot((current) => resetTimer(current));
  }

  function toggleAlwaysOnTop() {
    setSnapshot((current) => updateAlwaysOnTop(current, !current.isAlwaysOnTop));
  }

  return (
    <main className="timer-window-page">
      <section className="timer-card" aria-label="ACM timer">
        <div className="timer-mode-tabs" role="tablist" aria-label="Timer mode">
          <button
            type="button"
            data-active={snapshot.mode === "stopwatch"}
            onClick={() => switchMode("stopwatch")}
          >
            正计时
          </button>
          <button
            type="button"
            data-active={snapshot.mode === "countdown"}
            onClick={() => switchMode("countdown")}
          >
            倒计时
          </button>
        </div>

        <output className="timer-display" aria-live="polite" data-testid="timer-display">
          {displayValue}
        </output>
        <p className="timer-status">{isCompleted ? "倒计时完成" : snapshot.isRunning ? "计时中" : "已暂停"}</p>

        {snapshot.mode === "countdown" ? (
          <div className="countdown-editor">
            <label>
              <span>分钟</span>
              <input
                min="1"
                max="999"
                type="number"
                value={countdownMinutes}
                onBlur={() => applyCountdownMinutes()}
                onChange={(event) => setCountdownMinutes(event.target.value)}
              />
            </label>
            <div className="preset-row" aria-label="Countdown presets">
              {[25, 45, 90].map((minutes) => (
                <button
                  type="button"
                  key={minutes}
                  onClick={() => {
                    setCountdownMinutes(String(minutes));
                    applyCountdownMinutes(String(minutes));
                  }}
                >
                  {minutes}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="timer-controls">
          <button
            className="primary-button"
            type="button"
            data-testid="timer-start"
            onClick={snapshot.isRunning ? pause : start}
          >
            {snapshot.isRunning ? <Pause size={17} /> : <Play size={17} />}
            {snapshot.isRunning ? "暂停" : "开始"}
          </button>
          <button className="icon-button" type="button" aria-label="重置" onClick={reset}>
            <RotateCcw size={18} />
          </button>
          <button
            className="icon-button"
            type="button"
            aria-label={snapshot.isAlwaysOnTop ? "取消置顶" : "窗口置顶"}
            data-active={snapshot.isAlwaysOnTop}
            onClick={toggleAlwaysOnTop}
          >
            <Pin size={18} />
          </button>
          <button className="icon-button" type="button" aria-label="回到默认倒计时" onClick={() => applyCountdownMinutes("25")}>
            <TimerReset size={18} />
          </button>
        </div>
      </section>
    </main>
  );
}
