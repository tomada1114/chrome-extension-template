import { browser } from "wxt/browser";

/** Set the toolbar icon's badge; an empty string hides it. */
export async function setBadgeText(text: string): Promise<void> {
  await browser.action.setBadgeText({ text });
}
