/**
 * A value that lives outside the current page and can change under it: what a
 * popup or options screen reads, and re-renders when another context writes.
 *
 * @remarks
 * Declared here, framework-free, so `src/components/` can render one without
 * importing a browser API: `src/platform/storage.ts` produces it, a component
 * consumes it, and a test hands the component an in-memory one.
 */
export interface StoredValue<T> {
  get(): Promise<T>;
  /** Calls `listener` with each new value; the returned function unsubscribes. */
  watch(listener: (value: T) => void): () => void;
}

/** A {@link StoredValue} the current context may also write. */
export interface WritableStoredValue<T> extends StoredValue<T> {
  set(value: T): Promise<void>;
}
