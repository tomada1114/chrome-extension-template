import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";

import { incrementCount, refreshBadge, startBackground } from "../src/background";
import { sendMessage } from "../src/platform/messaging";
import { clickCount, settings } from "../src/platform/storage";

let stop: (() => void) | undefined;

beforeEach(() => {
  fakeBrowser.reset();
});

afterEach(() => {
  stop?.();
  stop = undefined;
});

const badge = (): Promise<string> => fakeBrowser.action.getBadgeText({});

describe("incrementCount", () => {
  it("stores and answers the next count", async () => {
    await clickCount.set(2);
    await expect(incrementCount()).resolves.toBe(3);
    await expect(clickCount.get()).resolves.toBe(3);
  });
});

describe("refreshBadge", () => {
  it("shows the count while the setting is on", async () => {
    await clickCount.set(7);
    await refreshBadge();
    await expect(badge()).resolves.toBe("7");
  });

  it("hides the badge while the setting is off", async () => {
    await clickCount.set(7);
    await settings.set({ showBadge: false });
    await refreshBadge();
    await expect(badge()).resolves.toBe("");
  });
});

describe("startBackground", () => {
  it("answers incrementCount sent from another context", async () => {
    stop = startBackground();
    await expect(sendMessage("incrementCount")).resolves.toBe(1);
    await expect(clickCount.get()).resolves.toBe(1);
  });

  it("counts every overlapping increment message", async () => {
    stop = startBackground();
    const counts = await Promise.all([
      sendMessage("incrementCount"),
      sendMessage("incrementCount"),
    ]);

    expect(counts).toEqual([1, 2]);
    await expect(clickCount.get()).resolves.toBe(2);
  });

  it("rejects a failed increment without blocking later messages", async () => {
    stop = startBackground();
    vi.spyOn(fakeBrowser.storage.local, "set").mockRejectedValueOnce(
      Object.assign(new Error("Storage write failed"), {
        code: "ERR_TEST_STORAGE_WRITE",
      }),
    );

    const failed = sendMessage("incrementCount");
    const next = sendMessage("incrementCount");

    await Promise.all([
      expect(failed).rejects.toMatchObject({ code: "ERR_TEST_STORAGE_WRITE" }),
      expect(next).resolves.toBe(1),
    ]);
    await expect(clickCount.get()).resolves.toBe(1);
    await expect(sendMessage("incrementCount")).resolves.toBe(2);
    await expect(clickCount.get()).resolves.toBe(2);
  });

  it("keeps the badge in line when the count or the setting changes", async () => {
    stop = startBackground();
    await clickCount.set(4);
    await expect.poll(badge).toBe("4");
    await settings.set({ showBadge: false });
    await expect.poll(badge).toBe("");
  });

  it("removes its listeners through the function it returns", async () => {
    startBackground()();
    await clickCount.set(9);
    await expect(sendMessage("incrementCount")).rejects.toThrow();
    await expect(badge()).resolves.toBe("");
  });
});
