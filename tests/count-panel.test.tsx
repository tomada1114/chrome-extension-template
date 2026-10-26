import { act, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CountPanel, type CountPanelProps } from "../src/components/count-panel";

function renderPanel(overrides: Partial<CountPanelProps> = {}): CountPanelProps {
  const props: CountPanelProps = {
    heading: "Clicks",
    incrementLabel: "Count a click",
    settingsLabel: "Settings",
    incrementErrorLabel: "Could not count the click. Try again.",
    count: 3,
    onIncrement: vi.fn().mockResolvedValue(undefined),
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

  it("prevents overlapping increments and is usable after success", async () => {
    const user = userEvent.setup();
    let resolvePending = (): void => undefined;
    const pending = new Promise<void>((resolve) => {
      resolvePending = resolve;
    });
    const onIncrement = vi
      .fn()
      .mockReturnValueOnce(pending)
      .mockResolvedValue(undefined);
    renderPanel({ onIncrement });
    const button = screen.getByRole("button", { name: "Count a click" });
    await user.click(button);
    expect(button).toBeDisabled();
    await user.click(button);
    expect(onIncrement).toHaveBeenCalledOnce();
    await act(async () => {
      resolvePending();
      await pending;
    });
    expect(button).toBeEnabled();
    await user.click(button);
    expect(onIncrement).toHaveBeenCalledTimes(2);
  });

  it("announces a failed increment and lets the reader retry", async () => {
    const user = userEvent.setup();
    const onIncrement = vi
      .fn()
      .mockRejectedValueOnce(new Error("Unavailable"))
      .mockResolvedValueOnce(4);
    renderPanel({ onIncrement });
    const button = screen.getByRole("button", { name: "Count a click" });
    await user.click(button);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not count the click. Try again.",
    );
    expect(screen.getByRole("status")).toHaveTextContent("3");
    expect(button).toBeEnabled();
    expect(button).toHaveFocus();
    await user.click(button);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(onIncrement).toHaveBeenCalledTimes(2);
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
