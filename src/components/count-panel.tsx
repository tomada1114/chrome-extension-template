import type { ReactElement } from "react";

import { Button } from "./ui/button";

export interface CountPanelProps {
  readonly heading: string;
  readonly incrementLabel: string;
  readonly settingsLabel: string;
  /** `undefined` while the stored count is still loading. */
  readonly count: number | undefined;
  readonly onIncrement: () => void;
  readonly onOpenSettings: () => void;
}

export function CountPanel({
  heading,
  incrementLabel,
  settingsLabel,
  count,
  onIncrement,
  onOpenSettings,
}: CountPanelProps): ReactElement {
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
        <Button onClick={onIncrement} disabled={count === undefined}>
          {incrementLabel}
        </Button>
        <Button variant="outline" onClick={onOpenSettings}>
          {settingsLabel}
        </Button>
      </div>
    </main>
  );
}
