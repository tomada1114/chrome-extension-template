# Testing a storage migration

`@wxt-dev/storage` migrates an item when `storage.defineItem` runs, which is when
`src/platform/storage.ts` is first imported. A test file that imports it at the top has
therefore already run every migration — against the empty `fakeBrowser` the file started
with — before any `beforeEach` could seed an old value. The test has to seed first and
import second.

## The shape

Reset the fake and the module registry before each case, seed the old value _and_ its
version meta key through the raw area, then import the module fresh:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";

beforeEach(() => {
  fakeBrowser.reset();
  vi.resetModules();
});

/** The storage module, imported after the test has seeded the area. */
const loadStorage = () => import("../src/platform/storage");

describe("settings v1 -> v2", () => {
  it("migrates a v1 value", async () => {
    await fakeBrowser.storage.sync.set({
      settings: { badge: false }, // the v1 shape
      settings$: { v: 1 }, // the version meta key: `<name>$`
    });
    const { settings } = await loadStorage();
    await expect(settings.get()).resolves.toStrictEqual({ showBadge: false });
    await expect(fakeBrowser.storage.sync.get("settings$")).resolves.toStrictEqual({
      settings$: { v: 2 },
    });
  });
});
```

The `settings` names and the `badge` field above are illustrative: the template's
`settings` item is at version 1 with no migration. Substitute the item and the shapes
being migrated.

## The cases a migration owes

- **The previous version, with its meta key.** The value comes back in the new shape and
  the meta key reads the new version.
- **No meta key at all.** A value written before the item was versioned counts as
  version 1, so seeding only the value must migrate exactly as the first case does.
- **Every older version still supported.** A user may update from any earlier release;
  seed each older version's shape and expect the current one.
- **A malformed old value.** The migration accepts anything; garbage under the old key
  ends as the parser's default, not as a thrown error. A migration that throws is only
  logged (`Migration failed`) and leaves the old value in place, which the reader then
  meets.
- **Already current.** A value at the current version is returned untouched.
- **Empty storage.** Nothing seeded reads the fallback, and the first write records the
  current version in the meta key.

## Traps

- `fakeBrowser.reset()` alone is not enough between cases: without `vi.resetModules()`
  the second dynamic import returns the module the first case loaded, whose migration
  has already finished.
- Seeding through the exported `settings.set(...)` writes through the new item and the
  current version; seed the raw area instead.
- A test that also exercises messaging relies on `tests/browser-setup.ts` having pointed
  the `chrome` global at `fakeBrowser`; a fresh module import does not undo that.
- The file joins the `unit` project by default. `placing-tests` owns whether it belongs
  beside `tests/storage.test.ts` or in a file of its own.
