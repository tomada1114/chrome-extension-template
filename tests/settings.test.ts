import { describe, expect, it } from "vitest";

import { DEFAULT_SETTINGS, parseSettings } from "../src/core/settings";

describe("parseSettings", () => {
  it("keeps a well-formed value", () => {
    expect(parseSettings({ showBadge: false })).toStrictEqual({ showBadge: false });
  });

  it.each([
    ["nothing stored yet", null],
    ["a primitive", "showBadge"],
    ["an array", []],
  ])("falls back to the defaults for %s", (_, stored) => {
    expect(parseSettings(stored)).toStrictEqual(DEFAULT_SETTINGS);
  });

  it("replaces only the malformed field", () => {
    expect(parseSettings({ showBadge: "yes" })).toStrictEqual(DEFAULT_SETTINGS);
  });

  it("drops fields this release does not know, written by a newer one", () => {
    expect(parseSettings({ showBadge: false, theme: "dark" })).toStrictEqual({
      showBadge: false,
    });
  });
});
