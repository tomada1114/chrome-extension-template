import { useEffect, useState } from "react";

import type { StoredValue } from "../../core/stored-value";

/**
 * The current value of `source`, or `undefined` until the first read
 * resolves, kept current as another context writes it.
 *
 * @remarks
 * A write from the watcher always wins over the initial read: the read can
 * resolve after a change already arrived, and rendering it then would show the
 * older value.
 */
export function useStoredValue<T>(source: StoredValue<T>): T | undefined {
  const [value, setValue] = useState<T | undefined>(undefined);

  useEffect(() => {
    let watched = false;
    let active = true;
    const unwatch = source.watch((next) => {
      watched = true;
      setValue(next);
    });
    void source.get().then((initial) => {
      if (active && !watched) {
        setValue(initial);
      }
    });
    return () => {
      active = false;
      unwatch();
    };
  }, [source]);

  return value;
}
