"use client";

import { useMemo, useRef, useState } from "react";

import { useIntegritySignals } from "@/features/events/use-integrity-signals";

export function SessionShell({ sessionId }: { sessionId: string }) {
  const [code, setCode] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const previousCode = useRef("");

  const { trackEditorChange, requestFullscreen } = useIntegritySignals({
    sessionId,
    enabled: true,
  });

  const charCount = useMemo(() => code.length, [code]);

  return (
    <div ref={containerRef} className="flex flex-col gap-4 rounded-lg border border-zinc-200 p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-600">Temporary coding shell with integrity listeners enabled.</p>
        <button
          type="button"
          onClick={() => {
            if (containerRef.current) {
              void requestFullscreen(containerRef.current);
            }
          }}
          className="rounded border border-zinc-300 px-3 py-1 text-sm"
        >
          Fullscreen
        </button>
      </div>
      <textarea
        value={code}
        onChange={(event) => {
          const next = event.target.value;
          const previous = previousCode.current;
          const deltaSize = next.length - previous.length;

          trackEditorChange({
            deltaSize,
            insertedChars: deltaSize > 0 ? deltaSize : 0,
            deletedChars: deltaSize < 0 ? Math.abs(deltaSize) : 0,
          });

          previousCode.current = next;
          setCode(next);
        }}
        placeholder="Write code here..."
        className="min-h-72 rounded border border-zinc-300 p-3 font-mono text-sm"
      />
      <p className="text-xs text-zinc-500">Character count: {charCount}</p>
    </div>
  );
}
