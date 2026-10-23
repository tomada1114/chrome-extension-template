import { useCallback, useState } from "react";

import type { WritableStoredValue } from "../../core/stored-value";
import { useStoredValue } from "./use-stored-value";

interface PendingEdit<T> {
  readonly value: T;
  /** The stored value the edit was made against. */
  readonly base: T | undefined;
}

/**
 * {@link useStoredValue} for a value this screen also edits: the edit renders
 * at once instead of after the storage round trip, and a write that fails is
 * dropped so the screen falls back to what storage really holds.
 *
 * @remarks
 * Without the local copy a controlled input snaps back to the stored value
 * until `storage.onChanged` arrives, which reads to a user — and to an
 * end-to-end test — as a click that did nothing. The edit is shown only while
 * storage still holds the value it was made against; the first change that
 * arrives afterwards, from this screen or another context, replaces it.
 */
export function useStoredState<T>(
  source: WritableStoredValue<T>,
): readonly [T | undefined, (next: T) => void] {
  const stored = useStoredValue(source);
  const [pending, setPending] = useState<PendingEdit<T> | undefined>(undefined);

  const update = useCallback(
    (next: T) => {
      setPending({ value: next, base: stored });
      source.set(next).catch(() => {
        setPending(undefined);
      });
    },
    [source, stored],
  );

  const current =
    pending !== undefined && Object.is(pending.base, stored) ? pending.value : stored;
  return [current, update] as const;
}
