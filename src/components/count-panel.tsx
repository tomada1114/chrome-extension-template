import { type ReactElement, useState } from "react";

import { Button } from "./ui/button";

export interface CountPanelProps {
  readonly heading: string;
  readonly incrementLabel: string;
  readonly settingsLabel: string;
  readonly incrementErrorLabel: string;
  /** `undefined` while the stored count is still loading. */
  readonly count: number | undefined;
  readonly onIncrement: () => Promise<unknown>;
  readonly onOpenSettings: () => void;
}

export function CountPanel({
  heading,
  incrementLabel,
  settingsLabel,
  incrementErrorLabel,
  count,
  onIncrement,
  onOpenSettings,
}: CountPanelProps): ReactElement {
  const [incrementPending, setIncrementPending] = useState(false);
  const [incrementFailed, setIncrementFailed] = useState(false);

  async function increment(): Promise<void> {
    setIncrementPending(true);
    setIncrementFailed(false);
    try {
      await onIncrement();
    } catch {
      setIncrementFailed(true);
    } finally {
      setIncrementPending(false);
    }
  }

  return (
    <main className="flex w-72 flex-col gap-3 p-4">
      <h1 className="text-sm font-medium text-muted-foreground">{heading}</h1>
      <output
        aria-live="polite"
        aria-busy={count === undefined}
        className="text-3xl font-semibold"
      >
        {count ?? "…"}
      </output>
      <div className="flex gap-2">
        <Button
          onClick={() => void increment()}
          disabled={count === undefined || incrementPending}
        >
          {incrementLabel}
        </Button>
        <Button variant="outline" onClick={onOpenSettings}>
          {settingsLabel}
        </Button>
      </div>
      {incrementFailed && <p role="alert">{incrementErrorLabel}</p>}
    </main>
  );
}
