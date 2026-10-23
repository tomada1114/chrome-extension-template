import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  type BrowserContext,
  chromium,
  test as base,
  type Worker,
} from "@playwright/test";

const extensionPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  ".output",
  "chrome-mv3",
);

interface ExtensionFixtures {
  context: BrowserContext;
  serviceWorker: Worker;
  extensionId: string;
}

export const test = base.extend<ExtensionFixtures>({
  // eslint-disable-next-line no-empty-pattern -- Playwright reads a fixture's dependencies from this destructuring pattern; an empty one is how a fixture declares it needs none.
  context: async ({}, use) => {
    if (!existsSync(path.join(extensionPath, "manifest.json"))) {
      throw new Error(
        `ERR_E2E_NO_BUILD: ${extensionPath} has no build; run \`pnpm build\` first`,
      );
    }
    const context = await chromium.launchPersistentContext("", {
      channel: "chromium",
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ],
    });
    await use(context);
    await context.close();
  },
  serviceWorker: async ({ context }, use) => {
    const [existing] = context.serviceWorkers();
    await use(existing ?? (await context.waitForEvent("serviceworker")));
  },
  extensionId: async ({ serviceWorker }, use) => {
    const id = new URL(serviceWorker.url()).host;
    await use(id);
  },
});

export const expect = test.expect;
