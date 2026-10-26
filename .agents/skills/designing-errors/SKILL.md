---
name: designing-errors
description: >
  Covers the shape of an error type and the vocabulary of its `code` string, in both
  src/** - a failure a service-worker handler reports across a message, a Result's error
  branch, a thrown invariant such as ERR_MISSING_ROOT - and scripts/**, where a stage
  prefix such as ERR_AGENTS_* is reported on stderr. Use when adding an Error subclass,
  choosing or renaming an ERR_* code, deciding between returning a Result and throwing,
  an error that loses its class after sendMessage, deciding what an error may never
  carry (a credential, page content, user data), or the PR line a changed code needs.
---

# Designing Errors

**Owns:** the shape of an error type and the vocabulary of `code` strings, in both
`src/**` and `scripts/**`. **Does not own:** which handler answers a message and what
the protocol declares (`building-entrypoints`); general type-system judgment
(`writing-typescript`); how an error is asserted in a test (`writing-tests`); what a
screen shows a user when an action fails (`building-screens`); the full stderr message
shape for repository automation (`writing-repo-scripts` — the `ERR_` prefix rule below
is shared with it).

## The one rule that matters

**`code` is the contract; `message` is not.** A caller branches on `code` because it is
a stable string literal; `message` is prose for a human reading a log and may be
reworded at any time. Never write a test, a catch clause, or a script's own error
handling that matches on `message` text — match on `code`, or on the error's class via
`instanceof` when the error never crossed a message (below).

## Return or throw

- An expected failure — a write storage refused, a value that failed to parse, an action
  the current state does not allow — is part of the signature. Return it as the error
  branch of a `Result` from `src/core/result.ts`, so the caller cannot forget it the way
  an undocumented `throw` lets them.
- A bug — a broken invariant, a page missing the element it renders into — throws,
  because there is nothing useful for a caller to do with it. Give the error a literal
  `code` property, either on an error class or assigned to a plain `Error`.

## Shape of an error class

- Subclass `Error`, set `this.name` to the class name in the constructor, and declare
  `readonly code` as a **literal** type — never `string`. The literal is what lets a
  consumer narrow on `code` and get a typed error back.
- Two spellings, both correct, chosen by how many failures the class covers. One class
  over a closed vocabulary takes the code as a constructor parameter typed as the union;
  a class per failure declares `readonly code = "ERR_..." as const`. A class whose
  `code` widens to `string` gives a consumer nothing to switch on and is the shape to
  reject in review.
- Declare `code` as an instance field, never a getter: a field is an own property, which
  is what survives a message (below).
- Keep the underlying failure on `cause` rather than folding it into `message`, so a log
  can still show it without any caller having to know where it came from.

```ts
export class StoredShapeError extends Error {
  /** Literal, not `string`: this is what a caller narrows on. */
  readonly code = "ERR_STORAGE_SHAPE" as const;

  /** The key that failed — never the value that was stored under it. */
  readonly key: string;

  constructor(key: string, options?: ErrorOptions) {
    super(`The value stored under ${key} did not have the expected shape.`, options);
    this.name = "StoredShapeError";
    this.key = key;
  }
}
```

## An error that crosses a message loses its class

When a handler in the service worker throws, the sender's `sendMessage` rejects — but
not with the handler's error. `@webext-core/messaging` serializes it, sends it back, and
rebuilds it on the sending side as a plain `Error` carrying the original `name`,
`message`, `stack`, `cause` and every own enumerable property (observed in
`node_modules/@webext-core/messaging/dist` at 4.0.0, 2026-10-23). Three consequences:

- `instanceof` is always false on the sending side. Branch on `code`, which survives as
  an own property.
- `message`, `stack` and `cause` all travel to the sender, which may be a content script
  running inside someone else's page. What an error carries is decided with that reader
  in mind.
- An expected failure a handler reports is better declared than thrown: a `Result` as
  the reply type in `ProtocolMap` is typed on both ends and survives the structured
  clone as it is. A throw across a message is for the bug, where the sender only needs
  to know that it failed.

## What an error may never carry

An error travels further than the code that raised it: into the console of the context
that logs it, into a message reply, and from a content script into the host page's
devtools console. Decide what it holds on that basis, not on what would be convenient to
debug with.

- **Never a credential.** No token, no key, no URL with a secret in its query string.
  The extension bundles none (AGENTS.md's "Security and human approval"), and an error
  is not where one should first appear.
- **Never user content.** A stored value, the text or URL of a page the user visits, a
  tab's title, and a message payload are the user's data; a message that quotes them
  turns every log line into a copy of their browsing. Name the shape instead — a key, a
  field path, a length that was exceeded, an allowed set — not the content.
- For an argument-validation error, the field that names what was rejected is the dotted
  path as written in the public signature (`options.maxLength`) — never an internal
  variable name, which can be renamed without that being a contract change.

## Aborts keep the caller's reason by identity

When a function reports an abort, the reason the caller passed must survive as the same
object, not as a fresh error carrying the same message — a caller that aborts with its
own instance compares `error.cause === myReason` to learn that _its_ cancellation is
what happened, and a copy breaks that. Return the reason itself when it already is an
`Error`; otherwise wrap it and keep the raw value on `cause`. For a function that
_raises_ the abort, pass the exact same error instance to `controller.abort(...)` and to
the rejection. Identity holds inside one context only; across a message it is lost with
the class.

## Choosing a `code` string

- `ERR_` prefix, `SCREAMING_SNAKE_CASE`, describing the failure rather than the function
  that raised it (`ERR_STORAGE_WRITE`, not `ERR_SET_FAILED`).
- Under `src/**`, the prefix after `ERR_` names the subject the code belongs to — the
  storage schema, the message protocol, a screen's mount — and a zone that reports
  several failures declares their union once, beside the module that raises them, rather
  than spelling string literals at each site.
- Under `scripts/**`, the code carries the stage prefix of the check that raised it
  (`ERR_AGENTS_*` in `scripts/sync-agents.mjs`, `ERR_LABELS_*` in
  `scripts/lib/labels-manifest.mjs`, `ERR_GIT_*`, `ERR_GH_*`), so the code alone —
  without opening the script — tells you which check to go read. Pick an existing stage
  prefix over inventing a new one when the failure belongs to a check that already has
  one.
- When a function can fail for several structurally different reasons, model them as a
  discriminated union keyed on `code` (or one class per reason) rather than one class
  with several optional fields — a consumer should be able to `switch` on `code` and get
  every field narrowed, not check which optional fields happen to be set.

## Changing a `code`

Nothing here is published, so this is not a semver decision. Whether it is a contract
change depends on where the code travels. A code that only one context raises and
catches is private: change it together with its tests. A code that crosses `ProtocolMap`
is contract (AGENTS.md's "What is contract and what is private"), because a content
script from the previous release can still be running in an open tab and switching on
the old spelling after an update.

- Say so in the PR body, in one line naming the old code, the new one, and which sender
  has to change. A code that changes silently is one the other context finds out about
  only when a branch stops being taken.
- A `Record<Code, …>` table written `as const satisfies` fails to compile when a code is
  added to or removed from its union — the backstop for one half of it. It cannot see
  the previous release's content script, and it cannot see a `scripts/**` code at all.
