// `chrome` below is the service worker's global, evaluated inside the worker;
// this reference only gives it a type on the test side.
/// <reference types="chrome" />

import en from "../src/locales/en.json" with { type: "json" };
import { expect, test } from "./fixtures";

test("the popup counts a click through the service worker", async ({
  context,
  extensionId,
}) => {
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);

  const count = popup.getByRole("status");
  await expect(count).toHaveText("0");

  await popup.getByRole("button", { name: en.popup.increment }).click();
  await expect(count).toHaveText("1");

  // A reopened popup reads the stored count, not a fresh in-memory one.
  await popup.reload();
  await expect(count).toHaveText("1");
});

test("the badge follows the count and the options page turns it off", async ({
  context,
  extensionId,
  serviceWorker,
}) => {
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  await popup.getByRole("button", { name: en.popup.increment }).click();

  const badgeText = (): Promise<string> =>
    serviceWorker.evaluate(() => chrome.action.getBadgeText({}));
  await expect.poll(badgeText).toBe("1");

  const options = await context.newPage();
  await options.goto(`chrome-extension://${extensionId}/options.html`);
  const toggle = options.getByRole("checkbox", {
    name: en.options.showBadge,
  });
  await expect(toggle).toBeChecked();
  await toggle.uncheck();

  await expect.poll(badgeText).toBe("");
});

test("a rejected increment message is announced and can be retried", async ({
  context,
  extensionId,
  serviceWorker,
}) => {
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  await expect(popup.getByRole("status")).toHaveText("0");

  // Fail the handler's next storage write so the real message channel rejects.
  await serviceWorker.evaluate(() => {
    const set = chrome.storage.local.set.bind(chrome.storage.local);
    chrome.storage.local.set = () => {
      chrome.storage.local.set = set;
      return Promise.reject(new Error("Storage unavailable"));
    };
  });

  const increment = popup.getByRole("button", { name: en.popup.increment });
  await increment.click();
  await expect(popup.getByRole("alert")).toHaveText(en.popup.incrementError);
  await expect(popup.getByRole("status")).toHaveText("0");
  await expect(increment).toBeEnabled();
  await increment.click();
  await expect(popup.getByRole("status")).toHaveText("1");
  await expect(popup.getByRole("alert")).toHaveCount(0);
});
