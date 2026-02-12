// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useIntegritySignals } from "./use-integrity-signals";

describe("useIntegritySignals", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
      }),
    );
    Object.defineProperty(navigator, "sendBeacon", {
      configurable: true,
      value: vi.fn(() => true),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("batches browser events and posts to /api/events", async () => {
    const { result } = renderHook(() =>
      useIntegritySignals({ sessionId: "sess_1", enabled: true }),
    );

    act(() => {
      window.dispatchEvent(new Event("blur"));
    });

    await act(async () => {
      await result.current.flushNow();
    });

    expect(fetch).toHaveBeenCalled();
    const call = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[0]).toBe("/api/events");
    const payload = JSON.parse(call[1].body as string) as {
      sessionId: string;
      events: Array<{ type: string }>;
    };
    expect(payload.sessionId).toBe("sess_1");
    expect(payload.events.some((event) => event.type === "FOCUS_LOSS")).toBe(true);
  });

  it("flushes with sendBeacon on beforeunload", () => {
    const sendBeacon = vi.fn(() => true);
    Object.defineProperty(navigator, "sendBeacon", {
      configurable: true,
      value: sendBeacon,
    });

    renderHook(() => useIntegritySignals({ sessionId: "sess_1", enabled: true }));

    act(() => {
      window.dispatchEvent(new Event("blur"));
      window.dispatchEvent(new Event("beforeunload"));
    });

    expect(sendBeacon).toHaveBeenCalled();
  });

  it("attaches listeners once for stable props", () => {
    const windowAddSpy = vi.spyOn(window, "addEventListener");
    const documentAddSpy = vi.spyOn(document, "addEventListener");

    const { rerender } = renderHook(
      ({ sessionId }) => useIntegritySignals({ sessionId, enabled: true }),
      {
        initialProps: { sessionId: "sess_1" },
      },
    );

    const windowCallsAfterMount = windowAddSpy.mock.calls.length;
    const documentCallsAfterMount = documentAddSpy.mock.calls.length;

    rerender({ sessionId: "sess_1" });

    expect(windowAddSpy.mock.calls.length).toBe(windowCallsAfterMount);
    expect(documentAddSpy.mock.calls.length).toBe(documentCallsAfterMount);
  });

  it("emits captured events to optional callback", () => {
    const onEventCaptured = vi.fn();

    renderHook(() =>
      useIntegritySignals({
        sessionId: "sess_1",
        enabled: true,
        onEventCaptured,
      }),
    );

    act(() => {
      window.dispatchEvent(new Event("blur"));
    });

    expect(onEventCaptured).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "FOCUS_LOSS",
      }),
    );
  });
});
