import { defineConfig } from "vitest/config";
import { WxtVitest } from "wxt/testing/vitest-plugin";

// Without this, a fixture suite written to fail is collected as one of this
// repository's own tests.
const fixtures = "tests/fixtures/**";

// Tests that import repository automation, touch the filesystem, spawn a
// subprocess, or use git. They are listed explicitly so a new test defaults to
// the short-timeout unit project until its I/O needs are deliberately reviewed.
// The files not listed here are pure unit tests; guard-rules.test.ts and
// pr-checks.test.ts are the intentional exceptions to the usual `src/**` rule,
// because each drives a pure-function module under scripts/lib/ directly and
// touches nothing else.
//
// The two boundary suites — boundaries and placeholders — are listed for the
// same reason workflows.test.ts is: they
// assert against files on disk rather than against imported code, walking
// whole trees to do it. They are fast today, but their cost scales with the
// repository rather than with what they import, which is exactly the case
// the short unit budget is not meant to cover.
const automationTests = [
  "tests/agent-tiers.test.ts",
  "tests/apply-ruleset.test.ts",
  "tests/boundaries.test.ts",
  "tests/check-staged.test.ts",
  "tests/ci-sync.test.ts",
  "tests/ci-watch.test.ts",
  "tests/clean.test.ts",
  "tests/git-env.test.ts",
  "tests/labels.test.ts",
  "tests/lefthook-merge-guard.test.ts",
  "tests/lefthook-partial-stage.test.ts",
  "tests/locales.test.ts",
  "tests/node-tools.test.ts",
  "tests/placeholders.test.ts",
  "tests/repo-tree.test.ts",
  "tests/ruleset-contexts.test.ts",
  "tests/skills-frontmatter.test.ts",
  "tests/sync-agents.test.ts",
  "tests/sync-labels.test.ts",
  "tests/tooling-ignores.test.ts",
  "tests/verify-hooks.test.ts",
  "tests/workflows.test.ts",
];

// The one suite that needs `pnpm build`'s output on disk before it can run at
// all: it reads `.output/chrome-mv3/manifest.json` and pins what a user
// consents to at install time. That is why it is its own project rather than
// another entry in `automationTests` — the default run (`pnpm test`,
// `pnpm test:coverage`, and ci.yml's `test` job) has no build to read, and a
// suite that quietly built one for itself would pay for a second build in every
// workflow. It refuses to run against a missing build instead, so the build
// stays the caller's to do exactly once. `pnpm run test:manifest` is what runs
// it, from `check:source` and from ci.yml's `extension` job immediately after
// `Build`. Naming the file here is still what keeps it out of `unit` below,
// whose glob would otherwise collect it on a 5-second budget.
//
// The end-to-end suite under `e2e/` is Playwright's, not Vitest's, and no glob
// here reaches it.
const manifestTests = ["tests/manifest.test.ts"];

export default defineConfig({
  // WxtVitest reads `wxt.config.ts` and gives every project below what a
  // build would: the `@/` alias, the generated `#i18n` module, the
  // `import.meta.env` values, and `browser` replaced by `fakeBrowser`, an
  // in-memory implementation of the extension APIs that `writing-tests`
  // describes resetting between tests.
  plugins: [WxtVitest()],
  test: {
    environment: "node",
    // Cleanup is the runner's job, not each test's. A spy, a stubbed env var or
    // a stubbed global that outlives the test that created it turns a later
    // failure into a mystery whose cause is in a different file, and makes the
    // "each test passes when run alone" rule in AGENTS.md unenforceable.
    restoreMocks: true,
    clearMocks: true,
    unstubEnvs: true,
    unstubGlobals: true,
    // A focused test silently shrinks the suite to one case. Failing on it
    // everywhere — not only under CI, which is the default — means the author
    // finds it before the commit rather than the pipeline finding it after.
    allowOnly: false,
    // Four projects, split by what a test actually touches rather than by
    // where it lives: a new `.test.ts` file is unit by default, a `.test.tsx`
    // file needs a DOM and joins `component` instead, the explicit automation
    // list receives the long budget only after its I/O needs are known, and
    // `manifest` is the one suite that cannot run without a build to read. A
    // hung unit or component test (no I/O, so it can only be looping or
    // awaiting forever) is a bug that should be visible in seconds.
    // `coverage` below is unaffected by this split — Vitest collects and
    // thresholds coverage once for the whole run, never per project.
    //
    // `extends: true` is what carries `allowOnly: false` and the
    // restore/clear/unstub settings above into every project below; a
    // hand-written project object without it would silently drop them.
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["tests/**/*.test.ts"],
          exclude: [...automationTests, ...manifestTests, fixtures],
          setupFiles: ["./tests/browser-setup.ts"],
          testTimeout: 5_000,
          hookTimeout: 5_000,
        },
      },
      {
        extends: true,
        test: {
          name: "component",
          // A React component needs `document`/`window` to render, so this
          // project alone runs under jsdom; `tests/**/*.test.ts` stays on the
          // faster `node` environment inherited from the top level. A
          // `.test.ts` file that drives DOM code without React — the content
          // script's — opts in with a `@vitest-environment jsdom` docblock.
          environment: "jsdom",
          include: ["tests/**/*.test.tsx"],
          exclude: [fixtures],
          setupFiles: ["./tests/browser-setup.ts", "./tests/dom-setup.ts"],
          // No I/O here either: rendering a component and querying the
          // result is the same budget as a unit test.
          testTimeout: 5_000,
          hookTimeout: 5_000,
        },
      },
      {
        extends: true,
        test: {
          name: "automation",
          include: automationTests,
          // Repository automation tests shell out to git/node in temp
          // directories, which is slower than a unit test but must not be
          // allowed to hang CI.
          testTimeout: 120_000,
          hookTimeout: 120_000,
        },
      },
      {
        extends: true,
        test: {
          name: "manifest",
          include: manifestTests,
          // Reading one JSON file from disk: a unit budget is plenty.
          testTimeout: 5_000,
          hookTimeout: 5_000,
        },
      },
    ],
    coverage: {
      provider: "v8",
      reportsDirectory: "coverage",
      reporter: ["text", "lcov"],
      // Report every source and automation file, so an untested module shows
      // up as 0% instead of vanishing from the denominator.
      include: ["src/**/*.ts", "src/**/*.tsx", "scripts/**/*.mjs"],
      // No top-level lines/functions/statements/branches here: Vitest's v8
      // provider checks those against the coverage of *all* included files
      // combined (src and scripts together), which would let a well-tested
      // src/ subsidize an untested scripts/ file or vice versa. Each glob
      // below is its own independent threshold set instead, so the src/ zones,
      // scripts/**, and scripts/lib/guard/** are each judged only against
      // their own coverage.
      thresholds: {
        // The floor covers the zones whose code is this repository's own
        // logic. `src/entrypoints/**` and the `.tsx` half of
        // `src/components/**` are deliberately absent: they are WXT entry
        // points and rendered markup, and a floor they cannot meet would only
        // teach the next author to move the number. What exercises them
        // instead is the Playwright suite under `e2e/`, which loads the built
        // extension into Chromium. Nothing of that shows up here: coverage
        // stops at the process boundary. They stay inside `include` above, so
        // they still report as a percentage — they simply have no floor to
        // trip. This is a narrower threshold glob, not a `coverage.exclude`
        // entry, which AGENTS.md forbids by name.
        "src/{core,platform,background,content}/**": {
          lines: 80,
          functions: 80,
          statements: 80,
          branches: 80,
        },
        // `src/components/**` mixes rendered markup with plain logic — a
        // hook, a formatter — and only the `.tsx` files have a rendering step
        // to excuse them. The `.ts` files are held to the same floor as the
        // zones above, so moving logic out of `src/platform/` into a component
        // module is not a way out of one.
        "src/components/**/*.ts": {
          lines: 80,
          functions: 80,
          statements: 80,
          branches: 80,
        },
        // scripts/lib/guard/** is the credential/path-detection rule engine —
        // the most security-critical code in the repository — so it carries a
        // higher floor than the rest of scripts/**. Measured baseline at the
        // time this floor was set: 90.9% statements, 82.35% branches, 100%
        // functions, 90% lines. Each value below is that measurement rounded
        // down to the nearest multiple of 5.
        "scripts/lib/guard/**": {
          lines: 90,
          functions: 100,
          statements: 90,
          branches: 80,
        },
        // Last raised by issue #98 against a measured baseline of 88.52%
        // statements, 80.05% branches, 93.79% functions and 88.48% lines,
        // each rounded down to the nearest multiple of 5 — the convention
        // every raise here has used (#44, #88, #98). Three of the scripts
        // that baseline was measured over have since left the tree with the
        // packaging gates (issue #4); the floor is deliberately left where it
        // was rather than re-fitted to whatever the smaller tree now scores.
        // It exists so a new automation script can't ship with zero tests and
        // nothing reporting the number moving; scripts/lib/guard/** also
        // counts toward this aggregate, on top of its own stricter floor
        // above.
        "scripts/**": {
          lines: 85,
          functions: 90,
          statements: 85,
          branches: 80,
        },
      },
    },
  },
});
