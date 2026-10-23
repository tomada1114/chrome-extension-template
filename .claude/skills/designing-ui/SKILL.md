---
name: designing-ui
description: >
  Covers this extension's visual language and its Tailwind v4 + shadcn/ui foundation:
  the design-direction lock, the tokens in src/assets/globals.css, components.json and
  adding a shadcn/ui component into src/components/ui/, cn and tailwind-merge, dark mode
  through prefers-color-scheme, the popup's size limits, bundled rather than remote
  fonts, and the Preflight traps. Use when building or restyling the popup or options
  page, choosing a color, type size, radius, spacing or motion, adding a theme token,
  running the shadcn CLI, or while the design direction is still unsettled.
---

# Designing UI

**Owns:** the visual direction and its lock, the theme tokens in
`src/assets/globals.css`, how a shadcn/ui component enters `src/components/`, and the
craft rules every screen follows. **Does not own:** which zone a component may import
from (AGENTS.md's Architecture); the TypeScript inside a component
(`writing-typescript`); the text a component renders (`localizing-ui`); the states a
screen renders, its accessible names and the popup's lifetime (`building-screens`);
settling the direction for a new extension the first time (`starting-an-app`).

Nothing here is enforced by a config or a test. A drifted screen passes every gate, so
the lock below is the check: read it before styling, and compare the rendered screen
against it afterwards.

## The lock

DESIGN DIRECTION: UNSETTLED.

The template ships no design direction. `src/assets/globals.css` carries shadcn/ui's
stock `neutral` tokens so a copied component renders on day one, and that is all they
are — not a choice anyone made. While this marker stands, style only with the existing
tokens and the registry's own classes; do not pick a palette, a typeface or a layout by
taste to get a screen done. In a project started from the template, stop and say the
direction is unsettled, then settle it through `starting-an-app` before the first real
screen.

Settling it replaces the marker with a filled lock of this shape, researched rather than
invented, and locked — a later screen adapts to it rather than renegotiating it:

```text
Primary reference:  the one product whose visual system this extension follows, and why.
Preserve:           what is kept from it — canvas, type roles, rules vs. shadows, radii,
                    density, the popup's width.
Borrow only:        the specific pieces taken from a second reference, and nothing else.
Role rules:         which color means what, stated once — the primary action, a status,
                    the toolbar badge.
Media strategy:     illustration, icons and graphics allowed, or ruled out.
Reject:             the genre defaults this extension will not ship.
Memorable move:     the one thing a reader should remember about the popup.
```

Follow it with a ledger — one row per decision a reader would otherwise take on trust:
the decision, its source, and why. Then replace the stock values in `globals.css` and
record the component recipes (primary action, field, card) in a `references/` file
beside this one. The toolbar icon belongs to the same lock: it is the one piece of the
design a user sees on every page.

Research with the user-level `refero-design` skill when it is installed. Without it,
follow [references/design-lock.md](references/design-lock.md), whose procedure needs no
other skill and no extra tool.

## Foundation

Tailwind v4 with no `tailwind.config.js` and no PostCSS config: the `@tailwindcss/vite`
plugin in `wxt.config.ts` is the whole of the build wiring, and the theme is CSS. Each
screen imports `src/assets/globals.css` from its `main.tsx`. Tokens are declared once
there and consumed as utilities; a component never carries a raw color, a one-off `px`
type size, or an arbitrary-value color.

- `components.json` points the CLI at `src/assets/globals.css` and every shadcn alias
  inside one zone — `@/components`, `@/components/ui`, `@/components/lib`,
  `@/components/lib/utils`, `@/components/hooks` — so the CLI writes into
  `src/components/` and nowhere else. `rsc` is `false`: there are no Server Components
  here, and a copy's `"use client"` line is noise to delete.
- `pnpm dlx shadcn@latest …` cannot run from the repository root: the CLI's own
  dependency graph reaches a package that `pnpm-workspace.yaml`'s `trustPolicy` refuses.
  Run it from a scratch directory outside the checkout and point it back with
  `-c <path to this checkout>`, so the component lands in `src/components/` while
  nothing installed into the repository bypasses the policy. Any package the component
  needs is then added with `pnpm add` here, under the review `managing-dependencies`
  owns.
- Rewrite the copy's imports on the way in: `cn` from `@/components/lib/utils`, and
  `Slot` from `@radix-ui/react-slot` rather than the `radix-ui` umbrella, which pulls
  every Radix primitive in for one. Give the props an `interface` and the function an
  explicit return type. `src/components/ui/button.tsx` is the worked example, and its
  header lists exactly that diff.
- A copied component is ordinary source to edit, not a dependency to configure around.
  Once the lock is settled, restyle each copy to it on the way in — an untouched default
  carries the stock palette and radius, which is exactly the drift this skill prevents.
- Prefer a registry component over a hand-rolled one. The lock's reject list still
  applies to a component that ships inside a library.

## Tokens

- The shape is shadcn's: a plain custom property on `:root` per color, mapped onto a
  utility by `@theme inline`. `inline` makes the utility read the property itself, which
  is what lets one media query swap every value.
- Dark mode follows `prefers-color-scheme` and nothing else — Tailwind v4's default
  `dark:` variant is the same media query, and `color-scheme: light dark` on `:root`
  lets the browser draw scrollbars and native controls to match. shadcn's `.dark` class
  is not used, because nothing sets it; a project that adds a theme setting moves the
  dark values under a selector, redeclares the variant with `@custom-variant dark`, and
  stores the choice through `managing-storage`.
- A token declared directly in a plain `@theme` block is emitted only once some utility
  uses it, so `var()` against an unused one from hand-written CSS resolves to nothing.
  Declare such a block `@theme static` when raw CSS reads the tokens too.
- Never give a size token and a color token the same name. With `--color-body` and
  `--text-body` both declared, a bare `text-body` always resolves to the color, and the
  size is reachable only through `text-[length:var(--text-body)]`.
- `twMerge` knows only Tailwind's default theme. A custom `--text-*` size is filed with
  the colors, so `cn("text-figure", "text-muted-foreground")` silently drops the size.
  Adding one means switching `src/components/lib/utils.ts` to `extendTailwindMerge` with
  `extend.theme.text` naming it, plus a `cn` case in `tests/ui-primitives.test.tsx` that
  keeps the size beside a color.

## Extension constraints

- **The popup's box.** Chrome sizes the popup to its content "between 25x25 and 800x600
  pixels" (<https://developer.chrome.com/docs/extensions/reference/api/action>, checked
  2026-10-23). Design for a fixed width well inside that, set on the root, and a height
  that scrolls inside the popup rather than past the bound. A layout that needs more
  room belongs on the options page, which opens in a tab.
- **Nothing loaded from elsewhere.** An extension page runs only code from its own
  package — the default `extension_pages` policy is
  `script-src 'self'; object-src 'self';`
  (<https://developer.chrome.com/docs/extensions/reference/manifest/content-security-policy>,
  checked 2026-10-23) — so a CDN script or a component that injects one cannot work.
  Fonts and stylesheets are not blocked by that policy, but this repository bundles them
  anyway: a font from a font service is a request to a third party every time the popup
  opens, telling it who uses the extension, and a popup with no network renders in a
  fallback face. A typeface enters as a font package or as files under `src/assets/`,
  imported from `globals.css` (`managing-dependencies` for a package).
- **The content script's UI is not themed here.** A host page's styles surround anything
  a content script mounts, and `globals.css` is never injected into it; that UI is
  `building-entrypoints`' subject.

## Measuring contrast

Measure contrast; never estimate it. For every foreground/background token pair a change
adds or alters — including one it alters by changing only one side — compute the WCAG
2.x ratio in both color schemes, from the values in `globals.css`'s `:root` block and
its `prefers-color-scheme: dark` block. Body text needs 4.5:1; large text and UI parts
(a control's boundary, a focus ring, an icon that carries meaning) need 3:1. Placeholder
and disabled colors never carry a label.

Record every pair, scheme and ratio in the pull request; no gate checks them. Compute
them with [references/design-lock.md](references/design-lock.md)'s script.

## Craft rules

- Preflight resets headings, links and margins. `globals.css` restores heading sizes and
  link underlines in `@layer base`, and deliberately does not restore a `<p>` margin: a
  base margin leaks into every caption set beside a button in a flex row. Space with the
  container's `gap-*`, not with margins on the children.
- Tailwind v4's Preflight also gives a button `cursor: default`; the base layer restores
  the pointer for enabled buttons. Keep that rule rather than adding `cursor-pointer`
  per component.
- Focus is visible on every control; never remove a ring to tidy a field.
- Motion is functional and short, and `prefers-reduced-motion` collapses all of it. A
  wait state is one shared inline status, not a new spinner per screen.
- The options page is a full tab: a fluid column with a readable maximum width and a
  16px gutter at a narrow window, and no horizontal scroll. The popup has one width.

## Reviewing a screen

No gate sees what a screen looks like. The agent's part comes first:

- `pnpm build && pnpm test:e2e`: the screen builds, loads in Chromium and its controls
  are found by role and name. A spec may also capture a screenshot of the screen in each
  scheme with `page.emulateMedia({ colorScheme: "dark" })`, headless, for the pull
  request.
- A component test that finds the screen's controls by role and accessible name, which
  proves structure and labels, not appearance. **REQUIRED:** `writing-tests`.
- The contrast numbers for every pair the change touched.
- The diff read against the lock: tokens only, no raw color or arbitrary value, nothing
  the reject list rules out, nothing loaded from another origin.

The human's part, asked once: in a single message, ask the owner to run `pnpm dev`, open
the popup from the toolbar and the options page from it, and look at each in light and
in dark, with reduced motion on, at the options page's narrowest window, and by keyboard
alone with the focus ring visible on every control — each compared against the lock.
`pnpm dev` opens a browser window, so it is theirs to start. **REQUIRED:**
`running-the-extension` for the hand-off.

The pull request carries what they saw, item by item, and "not reviewed" for any item
nobody looked at — a green run never stands in for it.

## A screen with no precedent here

Do not extrapolate from taste. Research the surface with the method the lock section
names, then adapt the findings to the lock rather than letting them relax it. If a
finding and the lock genuinely conflict, say so and let a human decide which gives way —
quietly softening the lock toward a safer middle is the failure this file guards
against.
