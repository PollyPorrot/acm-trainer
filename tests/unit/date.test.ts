import { describe, expect, test } from "vitest";
import {
  formatLocalDateTimeInput,
  isSameLocalDay,
  monthKeyFromIso,
  parseLocalDateTimeInput
} from "../../src/shared/date";

describe("date helpers", () => {
  test("isSameLocalDay compares dates using the local calendar day", () => {
    const morning = new Date(2026, 4, 22, 8, 30);
    const evening = new Date(2026, 4, 22, 23, 45);
    const nextMorning = new Date(2026, 4, 23, 0, 15);

    expect(isSameLocalDay(morning.toISOString(), evening.toISOString())).toBe(true);
    expect(isSameLocalDay(morning.toISOString(), nextMorning.toISOString())).toBe(false);
  });

  test("monthKeyFromIso returns the local year and month key", () => {
    const localDate = new Date(2026, 0, 5, 9, 0);

    expect(monthKeyFromIso(localDate.toISOString())).toBe("2026-01");
  });

  test("formatLocalDateTimeInput formats an ISO string for a datetime-local input", () => {
    const localDate = new Date(2026, 10, 9, 6, 7);

    expect(formatLocalDateTimeInput(localDate.toISOString())).toBe("2026-11-09T06:07");
  });

  test("parseLocalDateTimeInput parses a datetime-local value as local time and persists ISO", () => {
    const expected = new Date(2026, 10, 9, 6, 7).toISOString();

    expect(parseLocalDateTimeInput("2026-11-09T06:07")).toBe(expected);
  });
});
