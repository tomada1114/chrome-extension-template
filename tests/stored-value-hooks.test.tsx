import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, expectTypeOf, it } from "vitest";

import { useStoredState } from "../src/components/hooks/use-stored-state";
import { useStoredValue } from "../src/components/hooks/use-stored-value";
import type { StoredValue } from "../src/core/stored-value";
import { memoryStoredValue } from "./memory-stored-value";

describe("useStoredValue", () => {
  it("is undefined until the first read, then the stored value", async () => {
    const source = memoryStoredValue(4);
    const { result } = renderHook(() => useStoredValue(source));
    expect(result.current).toBeUndefined();
    await waitFor(() => {
      expect(result.current).toBe(4);
    });
  });

  it("follows a write from another context", async () => {
    const source = memoryStoredValue(4);
    const { result } = renderHook(() => useStoredValue(source));
    await waitFor(() => {
      expect(result.current).toBe(4);
    });
    act(() => {
      source.emit(5);
    });
    expect(result.current).toBe(5);
  });

  it("keeps a change that arrived before the initial read resolved", async () => {
    let resolveRead: (value: number) => void = () => undefined;
    let listener: (value: number) => void = () => undefined;
    const slow: StoredValue<number> = {
      get: () =>
        new Promise((resolve) => {
          resolveRead = resolve;
        }),
      watch: (next) => {
        listener = next;
        return () => undefined;
      },
    };
    const { result } = renderHook(() => useStoredValue(slow));
    act(() => {
      listener(9);
    });
    await act(async () => {
      resolveRead(1);
      await Promise.resolve();
    });
    expect(result.current).toBe(9);
  });

  it("stops listening once unmounted", async () => {
    const source = memoryStoredValue(1);
    const { result, unmount } = renderHook(() => useStoredValue(source));
    await waitFor(() => {
      expect(result.current).toBe(1);
    });
    unmount();
    source.emit(2);
    expect(result.current).toBe(1);
  });
});

describe("useStoredState", () => {
  it("renders an edit at once and keeps it once storage confirms it", async () => {
    const source = memoryStoredValue(false);
    const { result } = renderHook(() => useStoredState(source));
    await waitFor(() => {
      expect(result.current[0]).toBe(false);
    });
    act(() => {
      result.current[1](true);
    });
    expect(result.current[0]).toBe(true);
    await expect(source.get()).resolves.toBe(true);
  });

  it("falls back to the stored value when the write fails", async () => {
    const source = memoryStoredValue(false);
    const { result } = renderHook(() => useStoredState(source));
    await waitFor(() => {
      expect(result.current[0]).toBe(false);
    });
    source.failNextSet();
    act(() => {
      result.current[1](true);
    });
    await waitFor(() => {
      expect(result.current[0]).toBe(false);
    });
  });

  it("lets a later write from another context replace the edit", async () => {
    const source = memoryStoredValue("a");
    const { result } = renderHook(() => useStoredState(source));
    await waitFor(() => {
      expect(result.current[0]).toBe("a");
    });
    act(() => {
      result.current[1]("b");
    });
    act(() => {
      source.emit("c");
    });
    expect(result.current[0]).toBe("c");
  });
});

describe("the hooks' types", () => {
  it("are undefined-able until the first read, and typed by the source", () => {
    expectTypeOf(useStoredValue<number>).returns.toEqualTypeOf<number | undefined>();
    expectTypeOf(useStoredState<boolean>).returns.toEqualTypeOf<
      readonly [boolean | undefined, (next: boolean) => void]
    >();
  });

  it("take a writable source for state and refuse a read-only one", () => {
    const readOnly: StoredValue<number> = memoryStoredValue(0);
    // @ts-expect-error -- useStoredState writes back, so a source without `set` is refused.
    expectTypeOf(useStoredState).toBeCallableWith(readOnly);
  });
});
