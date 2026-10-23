import { fakeBrowser } from "wxt/testing/fake-browser";

// WxtVitest replaces `wxt/browser` with this fake, but `@webext-core/messaging`
// reaches for the `chrome` global itself. Pointing that global at the same
// fake puts both on one in-memory browser, so a message sent in a test
// reaches the listener the code under test registered. Assigned once per file
// rather than through `vi.stubGlobal`, which `unstubGlobals` would undo after
// the first test.
Object.assign(globalThis, { chrome: fakeBrowser });
