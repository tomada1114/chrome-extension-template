import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CountPanel, type CountPanelProps } from "../src/components/count-panel";

function renderPanel(overrides: Partial<CountPanelProps> = {}): CountPanelProps {
  const props: CountPanelProps = {
    heading: "Clicks",
    incrementLabel: "Count a click",
    settingsLabel: "Settings",
    count: 3,
    onIncrement: vi.fn(),
    onOpenSettings: vi.fn(),
    ...overrides,
  };
  render(<CountPanel {...props} />);
  return props;
}

describe("CountPanel", () => {
  it("shows the count in a live status region", () => {
    renderPanel({ count: 3 });
    expect(screen.getByRole("status")).toHaveTextContent("3");
  });

  it("marks the region busy and disables counting while the count loads", () => {
    renderPanel({ count: undefined });
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("button", { name: "Count a click" })).toBeDisabled();
  });

  it("calls back for a click and for the settings button", async () => {
    const user = userEvent.setup();
    const props = renderPanel();
    await user.click(screen.getByRole("button", { name: "Count a click" }));
    await user.click(screen.getByRole("button", { name: "Settings" }));
    expect(props.onIncrement).toHaveBeenCalledOnce();
    expect(props.onOpenSettings).toHaveBeenCalledOnce();
  });
});
