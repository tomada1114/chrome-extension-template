# Patterns this template does not adopt

Each row is a pattern an implementer tends to reach for out of habit, and the reason
this template does without it. Adopting one is a change of stance: propose it in a pull
request the owner signs off, rather than introducing it inside an unrelated change.

| Pattern                           | Why not                                                                                                                                          | Instead                                                                                  |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| A dependency-injection container  | Each context wires its few dependencies in plain code a reader can follow: an entrypoint hands a screen its `StoredValue`s as props.             | Build dependencies in the entrypoint and pass them down as arguments or props.           |
| A client state-management library | Storage already is the source of truth every context shares, and a store beside it is a second one that disagrees the moment another tab writes. | A `StoredValue` read through `useStoredValue`/`useStoredState`; `useState` for UI state. |
| An in-process event bus           | Who calls whom stops being visible in the import graph that `eslint.config.mjs` and `tests/boundaries.test.ts` check.                            | A direct function call inside a context; a typed `ProtocolMap` message between contexts. |
| A repository per entity           | An interface per stored key is speculative; `src/platform/storage.ts` already is the one module that declares and reads every key.               | One `StoredValue` per key, declared beside the others.                                   |
| Use-case or interactor classes    | A class with one `execute` method is a function with ceremony, and a listener already orchestrates.                                              | A plain exported function in `src/core/`, called from the listener.                      |
| A global mutable singleton        | The service worker is stopped when it idles and a popup when it closes, so module state is silently lost; in tests it leaks between cases.       | Immutable module constants; state in storage, passed as arguments.                       |

**BACKGROUND:** `building-entrypoints`, for which context a piece of logic runs in and
how the contexts talk to each other.
