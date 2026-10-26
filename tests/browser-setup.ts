import { fakeBrowser } from "wxt/testing/fake-browser";

// `@wxt-dev/browser` and `@webext-core/messaging` read the browser globals.
// Pointing `chrome` at WxtVitest's fake puts both on one in-memory browser, so
// a message sent in a test reaches the listener the code under test registered.
// Assign once per file rather than through `vi.stubGlobal`: `unstubGlobals`
// would undo it after the first test.
Object.assign(globalThis, { chrome: fakeBrowser });
