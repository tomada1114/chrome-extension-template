import { beforeEach, describe, expect, it } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";

import { DEFAULT_SETTINGS } from "../src/core/settings";
import { clickCount, settings } from "../src/platform/storage";

// WxtVitest swaps `browser` for this in-memory fake. Its state is module-wide,
// so every test starts from an empty browser rather than from the last
// test's writes.
beforeEach(() => {
  fakeBrowser.reset();
});

describe("clickCount", () => {
  it("reads zero before anything was stored", async () => {
    await expect(clickCount.get()).resolves.toBe(0);
  });

  it("reads back what was written, from local storage", async () => {
    await clickCount.set(3);
    await expect(clickCount.get()).resolves.toBe(3);
    await expect(fakeBrowser.storage.local.get("clickCount")).resolves.toStrictEqual({
      clickCount: 3,
    });
  });

  it("tells a watcher about a write", async () => {
    const seen: number[] = [];
    const unwatch = clickCount.watch((value) => seen.push(value));
    await clickCount.set(5);
    unwatch();
    await clickCount.set(6);
    expect(seen).toStrictEqual([5]);
  });
});

describe("settings", () => {
  it("reads the defaults before anything was stored", async () => {
    await expect(settings.get()).resolves.toStrictEqual(DEFAULT_SETTINGS);
  });

  it("round-trips through sync storage", async () => {
    await settings.set({ showBadge: false });
    await expect(settings.get()).resolves.toStrictEqual({ showBadge: false });
  });

  it("parses what another device wrote rather than trusting it", async () => {
    await fakeBrowser.storage.sync.set({ settings: { showBadge: "nope" } });
    await expect(settings.get()).resolves.toStrictEqual(DEFAULT_SETTINGS);
  });

  it("hands a watcher the parsed value", async () => {
    const seen: unknown[] = [];
    const unwatch = settings.watch((value) => seen.push(value));
    await fakeBrowser.storage.sync.set({ settings: { showBadge: false, extra: 1 } });
    unwatch();
    expect(seen).toStrictEqual([{ showBadge: false }]);
  });
});
