import { describe, expect, it } from "vitest";

import { BADGE_MAX, BADGE_OVERFLOW, formatBadge, nextCount } from "../src/core/counter";

describe("nextCount", () => {
  it("adds one to a well-formed count", () => {
    expect(nextCount(0)).toBe(1);
    expect(nextCount(41)).toBe(42);
  });

  it.each([
    ["a negative number", -3],
    ["a fraction", 1.5],
    ["NaN", Number.NaN],
    ["Infinity", Number.POSITIVE_INFINITY],
  ])("restarts at one when storage hands back %s", (_, stored) => {
    expect(nextCount(stored)).toBe(1);
  });

  it("stops at the largest safe integer instead of losing precision", () => {
    expect(nextCount(Number.MAX_SAFE_INTEGER)).toBe(Number.MAX_SAFE_INTEGER);
  });
});

describe("formatBadge", () => {
  it("is empty for zero, so Chrome hides the badge", () => {
    expect(formatBadge(0)).toBe("");
  });

  it("spells out a count up to the maximum", () => {
    expect(formatBadge(1)).toBe("1");
    expect(formatBadge(BADGE_MAX)).toBe(String(BADGE_MAX));
  });

  it("switches to the overflow text past the maximum", () => {
    expect(formatBadge(BADGE_MAX + 1)).toBe(BADGE_OVERFLOW);
  });

  it.each([-1, 2.5, Number.NaN])("is empty for a malformed count (%s)", (count) => {
    expect(formatBadge(count)).toBe("");
  });
});
