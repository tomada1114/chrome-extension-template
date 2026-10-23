import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";

// The manifest is generated from this file, `package.json` and the entrypoint
// files under `src/entrypoints/`; `.output/<target>/manifest.json` is the
// result, and `tests/manifest.test.ts` pins the parts a store review and a
// user's consent depend on. `version` is deliberately absent: WXT copies it
// from `package.json`, which is the single place a release bumps.
export default defineConfig({
  srcDir: "src",
  // Auto-imports would let an entrypoint reach `browser`, `storage` or a
  // `define*` helper without naming it, which hides exactly the edges
  // `tests/boundaries.test.ts` and the ESLint zones exist to see.
  imports: false,
  modules: ["@wxt-dev/module-react", "@wxt-dev/i18n/module"],
  // Chrome and Edge run the same Chromium build; listing both narrows
  // `import.meta.env.BROWSER` to the two values this extension ships for.
  targetBrowsers: ["chrome", "edge"],
  manifest: {
    name: "__MSG_extName__",
    description: "__MSG_extDescription__",
    default_locale: "en",
    // Every entry is a consent prompt a user reads at install time, and adding
    // one later disables the extension for every existing user until they
    // accept it. `changing-permissions` owns this list.
    permissions: ["storage"],
    action: {
      default_title: "__MSG_extName__",
    },
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  webExt: {
    // `pnpm dev` launches a browser of its own with a throwaway profile; the
    // developer's own windows and profile are never touched.
    keepProfileChanges: false,
  },
});
