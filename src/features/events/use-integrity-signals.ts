"use client";

import { useCallback, useEffect, useRef } from "react";

import { BATCH_INTERVAL_MS, BIG_EDIT_INSERT_CHARS, IDLE_SEC } from "@/config/integrity";

import type { IntegrityEventInput } from "./schema";

type IntegrityEventType = IntegrityEventInput["type"];

type FlushReason = "interval" | "beforeunload" | "hidden";

type EditorChangeInput = {
  deltaSize: number;
  insertedChars: number;
  deletedChars: number;
};

type UseIntegritySignalsInput = {
  sessionId: string;
  enabled?: boolean;
};

const INGEST_ENDPOINT = "/api/events";

const makeEventId = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export function useIntegritySignals({
  sessionId,
  enabled = true,
}: UseIntegritySignalsInput) {
  const bufferRef = useRef<IntegrityEventInput[]>([]);
  const typingBucketsRef = useRef<Map<number, number>>(new Map());
  const lastInputAtRef = useRef<number>(Date.now());
  const lastKeypressAtRef = useRef<number | null>(null);
  const idleActiveRef = useRef(false);
  const totalsRef = useRef({ insertedChars: 0, deletedChars: 0 });
  const flushingRef = useRef(false);

  const pushEvent = useCallback(
    (type: IntegrityEventType, metadata: Record<string, unknown>) => {
      bufferRef.current.push({
        clientEventId: makeEventId(),
        tsISO: new Date().toISOString(),
        type,
        metadata,
      });
    },
    [],
  );

  const markInputActivity = useCallback(() => {
    lastInputAtRef.current = Date.now();
    idleActiveRef.current = false;
  }, []);

  const flushTypingBuckets = useCallback(() => {
    for (const [bucketSecond, keypressCount] of typingBucketsRef.current.entries()) {
      pushEvent("TYPING_BUCKET", {
        bucketSecond,
        keypressCount,
      });
    }
    typingBucketsRef.current.clear();
  }, [pushEvent]);

  const flush = useCallback(
    async (reason: FlushReason) => {
      if (flushingRef.current) {
        return;
      }

      flushTypingBuckets();
      if (bufferRef.current.length === 0) {
        return;
      }

      flushingRef.current = true;

      const events = [...bufferRef.current];
      const payload = {
        sessionId,
        events,
      };

      const allowKeepalive = reason === "beforeunload" || reason === "hidden";
      if (
        allowKeepalive &&
        typeof navigator !== "undefined" &&
        typeof navigator.sendBeacon === "function"
      ) {
        const beaconOk = navigator.sendBeacon(
          INGEST_ENDPOINT,
          new Blob([JSON.stringify(payload)], { type: "application/json" }),
        );
        if (beaconOk) {
          bufferRef.current = [];
          flushingRef.current = false;
          return;
        }
      }

      bufferRef.current = [];

      try {
        const response = await fetch(INGEST_ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "same-origin",
          keepalive: allowKeepalive,
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          bufferRef.current = [...events, ...bufferRef.current];
        }
      } catch {
        bufferRef.current = [...events, ...bufferRef.current];
      } finally {
        flushingRef.current = false;
      }
    },
    [flushTypingBuckets, sessionId],
  );

  const trackEditorChange = useCallback(
    (change: EditorChangeInput) => {
      totalsRef.current.insertedChars += change.insertedChars;
      totalsRef.current.deletedChars += change.deletedChars;
      markInputActivity();

      pushEvent("EDITOR_CHANGE", {
        deltaSize: change.deltaSize,
        insertedChars: change.insertedChars,
        deletedChars: change.deletedChars,
        totalInsertedChars: totalsRef.current.insertedChars,
        totalDeletedChars: totalsRef.current.deletedChars,
        largeJump: change.insertedChars > BIG_EDIT_INSERT_CHARS,
      });
    },
    [markInputActivity, pushEvent],
  );

  const requestFullscreen = useCallback(
    async (target: Element) => {
      if (!("requestFullscreen" in target)) {
        return;
      }

      await (target as Element & { requestFullscreen: () => Promise<void> }).requestFullscreen();
    },
    [],
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const onVisibilityChange = () => {
      if (document.hidden) {
        pushEvent("PAGE_HIDDEN", {});
        void flush("hidden");
      } else {
        pushEvent("PAGE_VISIBLE", {});
      }
    };

    const onWindowBlur = () => {
      pushEvent("FOCUS_LOSS", {});
    };

    const onWindowFocus = () => {
      pushEvent("FOCUS_GAIN", {});
      markInputActivity();
    };

    const onFullscreenChange = () => {
      const type = document.fullscreenElement ? "FULLSCREEN_ENTER" : "FULLSCREEN_EXIT";
      pushEvent(type, {});
    };

    const onCopy = () => {
      pushEvent("CLIPBOARD_COPY", {});
    };

    const onCut = () => {
      pushEvent("CLIPBOARD_CUT", {});
    };

    const onPaste = (event: ClipboardEvent) => {
      const text = event.clipboardData?.getData("text") ?? "";
      const lineCount = text.length === 0 ? 0 : text.split(/\r?\n/).length;
      const now = Date.now();
      const msSinceLastKeypress =
        lastKeypressAtRef.current === null ? null : now - lastKeypressAtRef.current;

      pushEvent("CLIPBOARD_PASTE", { length: text.length, lineCount });
      pushEvent("PASTE_ANALYZED", {
        length: text.length,
        lineCount,
        msSinceLastKeypress,
      });
      markInputActivity();
    };

    const onKeydown = () => {
      const now = Date.now();
      const bucketSecond = Math.floor(now / 1000);
      typingBucketsRef.current.set(
        bucketSecond,
        (typingBucketsRef.current.get(bucketSecond) ?? 0) + 1,
      );
      lastKeypressAtRef.current = now;
      markInputActivity();
    };

    const onPointerDown = () => {
      markInputActivity();
    };

    const onBeforeUnload = () => {
      void flush("beforeunload");
    };

    const flushInterval = window.setInterval(() => {
      void flush("interval");
    }, BATCH_INTERVAL_MS);

    const idleInterval = window.setInterval(() => {
      const idleForSeconds = Math.floor((Date.now() - lastInputAtRef.current) / 1000);
      if (idleForSeconds >= IDLE_SEC && !idleActiveRef.current) {
        pushEvent("IDLE", { idleForSeconds });
        idleActiveRef.current = true;
      }
    }, 1000);

    window.addEventListener("blur", onWindowBlur);
    window.addEventListener("focus", onWindowFocus);
    window.addEventListener("keydown", onKeydown);
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("beforeunload", onBeforeUnload);

    document.addEventListener("visibilitychange", onVisibilityChange);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("copy", onCopy);
    document.addEventListener("cut", onCut);
    document.addEventListener("paste", onPaste);

    return () => {
      window.clearInterval(flushInterval);
      window.clearInterval(idleInterval);

      window.removeEventListener("blur", onWindowBlur);
      window.removeEventListener("focus", onWindowFocus);
      window.removeEventListener("keydown", onKeydown);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("beforeunload", onBeforeUnload);

      document.removeEventListener("visibilitychange", onVisibilityChange);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("cut", onCut);
      document.removeEventListener("paste", onPaste);
    };
  }, [enabled, flush, markInputActivity, pushEvent]);

  return {
    trackEditorChange,
    requestFullscreen,
    flushNow: () => flush("interval"),
  };
}
