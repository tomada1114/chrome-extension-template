import type { WritableStoredValue } from "../src/core/stored-value";

/**
 * An in-memory {@link WritableStoredValue} for component tests, which run
 * under jsdom with no extension storage around them. `emit` plays the part of
 * another context writing the value.
 */
export interface MemoryStoredValue<T> extends WritableStoredValue<T> {
  emit(value: T): void;
  /** Make the next `set` reject, as a failed storage write does. */
  failNextSet(): void;
}

export function memoryStoredValue<T>(initial: T): MemoryStoredValue<T> {
  let value = initial;
  let failNext = false;
  const listeners = new Set<(value: T) => void>();
  const emit = (next: T): void => {
    value = next;
    for (const listener of listeners) {
      listener(next);
    }
  };
  return {
    get: () => Promise.resolve(value),
    set: (next) => {
      if (failNext) {
        failNext = false;
        return Promise.reject(new Error("ERR_STORAGE_WRITE: simulated failure"));
      }
      emit(next);
      return Promise.resolve();
    },
    watch: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    emit,
    failNextSet: () => {
      failNext = true;
    },
  };
}
