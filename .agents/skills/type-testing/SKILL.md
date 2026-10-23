---
name: type-testing
description: >
  Covers compile-time assertions with Vitest's expectTypeOf, written in the same suite
  as the runtime tests for the surface they check - the Result vocabulary in
  src/core/result.ts, the message names and reply types ProtocolMap gives sendMessage, a
  stored value's type, the catalog keys i18n.t accepts. Use when adding or reviewing a
  @ts-expect-error assertion, a type test for a changed exported signature or a generic
  that must not widen, an `as const satisfies` list that must stay in step with a union,
  or a type test that passes though the annotation it checks is wrong.
---

# Type Testing

**Owns:** type-level assertions — what to assert about a type, where the assertion goes,
and the ways such an assertion silently passes without testing anything. **Does not
own:** runtime behavior assertions (`writing-tests`); which file a test lives in and
which vitest project it joins (`placing-tests`); the type-system judgment inside the
module being asserted about (`writing-typescript`).

## Where a type assertion goes

There is no separate types-only test file. An `expectTypeOf` assertion lives in the same
suite as the runtime tests for the surface it checks, so a change to that surface breaks
both halves in one place instead of leaving a type file nobody opened. Today that is
`tests/result.test.ts`, for the `Result` vocabulary every zone is written against; a
type assertion about the message protocol belongs in the suite that sends those
messages, one about a stored value in `tests/storage.test.ts`.

An `it()` whose whole assertion is type-level is legitimate and needs no runtime
`expect`. Enforced by: `eslint.config.mjs`'s `vitest/expect-expect`, which lists
`expectTypeOf` among its `assertFunctionNames` precisely so such a case is not reported
as assertion-less.

Vitest does not type-check, so a type assertion's red shows in `pnpm typecheck` (part of
`pnpm check:quick`), never in `pnpm exec vitest run`. `tsconfig.json` includes `tests/`
and `e2e/`, which is what puts these assertions under the compiler at all.

## What is worth asserting

Assert what inference is supposed to preserve, not what the annotation already says:

- **A generic that must not widen.** `ok<T>(value: T): Result<T, never>` keeps the
  value's own type and leaves the error branch open to any `E`. A generic is asserted on
  a concrete call —
  `expectTypeOf(ok(DEFAULT_SETTINGS)).toEqualTypeOf<Result<Settings, never>>()` —
  because only a concrete input can prove the generic was not collapsed to its
  constraint. `useStoredValue<T>` returning `T | undefined` is the same kind of claim.
- **A discriminated union narrowing on its discriminant.** `Result` narrows on `ok`;
  assert both branches (see Trap 2 for how to do it without proving nothing).
- **Which inputs are accepted and which are rejected.** A message name `ProtocolMap`
  does not declare, a payload of the wrong shape, or a catalog key `src/locales/en.json`
  lacks must fail to compile — with `@ts-expect-error`, written the way Trap 1
  describes. The reply type is worth pinning too: what `sendMessage` resolves to is the
  type the receiving handler promised, and a widened `unknown` there is a protocol that
  no longer checks anything.
- **A literal list that has to stay in step with a union.** Close the list with
  `as const satisfies readonly Member[]`, then compare it to the union with
  `expectTypeOf<(typeof LIST)[number]>().toEqualTypeOf<Member>()`. The two halves pull
  in opposite directions: `satisfies` rejects an entry that is not a member, and the
  `expectTypeOf` rejects a member the list forgot. Annotating the list
  `readonly Member[]` instead would lose the literal tuple type and let a new member
  land with no case for it. Such a list lives wherever the two things it holds together
  live: in source when one of them is a constant the extension ships, in a test when
  what is being pinned is an inference the source cannot state about itself.

## Trap 1: a `@ts-expect-error` inside `it()` still runs

Vitest executes the body of `it()`. A directly inlined invalid call is therefore
evaluated at test time, not just type-checked — if the call happens to throw or have a
side effect, the test can pass or fail for the wrong reason, and if the assertion
depends on a code path never reached, nothing was proven at all.

```ts
// Wrong: sends the invalid message as part of the test body.
it("rejects a message the protocol does not declare", async () => {
  // @ts-expect-error resetCount is not a key of ProtocolMap
  await sendMessage("resetCount");
});

// Right: declare the invalid call inside a function, never invoke it. The
// assertion is that the function fails to compile.
it("rejects a message the protocol does not declare", () => {
  const rejected = (): unknown =>
    // @ts-expect-error resetCount is not a key of ProtocolMap
    sendMessage("resetCount");
  expect(rejected).toBeTypeOf("function");
});
```

## Trap 2: a union initializer narrows before the assertion runs

TypeScript narrows a `const` on its initializer, so
`const result: Result<T, E> = { ok: false, error }` infers the failure member rather
than the union. An assertion against a variable declared that way tests one concrete
member and proves nothing about the branch that is supposed to widen and narrow.

```ts
// Wrong: `result` is already the failure member, so the union is never tested.
const result: Result<Settings, RangeError> = {
  ok: false,
  error: new RangeError("out of range"),
};

// Right: receive the value as a function parameter, so the annotation on the
// parameter — not the argument's own type — is what narrowing is checked against.
function classify(result: Result<Settings, RangeError>): void {
  if (result.ok) {
    expectTypeOf(result.value).toEqualTypeOf<Settings>();
  } else {
    expectTypeOf(result.error).toEqualTypeOf<RangeError>();
  }
}
classify(ok(DEFAULT_SETTINGS));
```

The narrowing only bites when the initializer's own type is a single member of the
declared union — an object literal, or a class instance.
`const result: Result<string, RangeError> = ok("hello")` keeps the union, because `ok`
returns `Result<T, never>`, itself a union; that is why the narrowing cases in
`tests/result.test.ts` are real tests rather than instances of this trap. Do not rely on
the difference: a parameter is unambiguous, and an initializer's type can change under
you.

## Trap 3: `@ts-expect-error` can be satisfied by the wrong error

`@ts-expect-error` only asserts that the next line fails to compile — it does not check
_why_. A typo'd property name and a genuine type-contract violation both satisfy it
equally, so a rename or an unrelated refactor can leave the comment green while testing
nothing you intended. Wherever the expected failure is about a type (a wrong argument
type, a wrong return type) rather than a missing symbol, pair the `@ts-expect-error`
with an `expectTypeOf` assertion on the correct call next to it, so the test still fails
if the error moves to a different line or a different cause.

`eslint.config.mjs` requires a description of at least ten characters on every
`@ts-expect-error` and bans `@ts-ignore` outright — the description is what a reader
compares the actual failure against.

## Annotated generic exports

A generic function whose return type is hand-annotated instead of left to inference can
be annotated wider than what the implementation actually returns, which silently loses
precision for every caller. Any exported generic with an explicit return annotation
needs a type test proving the annotation is no wider than the inferred type — compare
`expectTypeOf(fn(...)).toEqualTypeOf<...>()` against a call whose input is concrete
enough to pin down the narrowest expected result. `ok`, `err`, `useStoredValue` and
`useStoredState` are the annotated generics in the tree. **BACKGROUND:**
`writing-typescript` explains why annotating a generic export is the standard way to
accidentally widen it.

## What these assertions do not cover

They check the type-checker's view of a module as compiled from a test — nothing here is
packed or published, so there is no separate consumer-side resolution to diverge from
it. Two consequences worth planning around:

- A type assertion is erased before anything runs. It says nothing about whether a value
  at runtime matches the type — which is the whole problem with storage, where a value
  written by another release or another device is typed only by what this release hopes
  is there. That is why a stored value is declared `unknown` and parsed, and why its
  test asserts the parsed value at runtime rather than its type.
- `wxt build` compiles through Vite, which strips types without checking them. An
  entrypoint whose types stopped matching what it is handed fails `pnpm typecheck`, and
  only because `tsconfig.json` includes `src/` and the `.wxt/` types `wxt prepare`
  generated — a stale `.wxt/` after a catalog change is a type error naming `#i18n`, not
  a test failure.
