"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import type { editor as MonacoEditorApi } from "monaco-editor";

import { problemStatement } from "@/features/coding/problem";
import { useIntegritySignals } from "@/features/events/use-integrity-signals";

type Language = "javascript" | "typescript";

type RunResponse = {
  tests: Array<{ name: string; passed: boolean; message: string }>;
  snapshotId: string;
};

type SubmitResponse = {
  submitted: true;
  snapshotId: string;
  reviewUrl: string;
};

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
});

export function CodingWorkspace({ sessionId }: { sessionId: string }) {
  const [language, setLanguage] = useState<Language>("typescript");
  const [code, setCode] = useState(problemStatement.starterCode);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [runResult, setRunResult] = useState<RunResponse | null>(null);
  const [submitResult, setSubmitResult] = useState<SubmitResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const editorContainerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<MonacoEditorApi.IStandaloneCodeEditor | null>(null);

  const { trackEditorChange, requestFullscreen } = useIntegritySignals({
    sessionId,
    enabled: true,
  });

  const runTests = async () => {
    setRunning(true);
    setError(null);

    try {
      const response = await fetch(`/api/session/${sessionId}/run`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code, language }),
      });
      const payload = (await response.json()) as RunResponse | { error?: string };

      if (!response.ok || !("tests" in payload)) {
        throw new Error((payload as { error?: string }).error ?? "Run failed");
      }

      setRunResult(payload);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Run failed";
      setError(message);
    } finally {
      setRunning(false);
    }
  };

  const submit = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/session/${sessionId}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code, language }),
      });
      const payload = (await response.json()) as SubmitResponse | { error?: string };

      if (!response.ok || !("submitted" in payload)) {
        throw new Error((payload as { error?: string }).error ?? "Submit failed");
      }

      setSubmitResult(payload);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Submit failed";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-lg border border-zinc-200 p-5">
        <h2 className="text-xl font-semibold">{problemStatement.title}</h2>
        <p className="mt-2 text-zinc-600">{problemStatement.description}</p>
      </section>

      <section className="rounded-lg border border-zinc-200 p-5">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <label className="text-sm">
            Language
            <select
              className="ml-2 rounded border border-zinc-300 px-2 py-1"
              value={language}
              onChange={(event) => setLanguage(event.target.value as Language)}
            >
              <option value="typescript">TypeScript</option>
              <option value="javascript">JavaScript</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => {
              if (editorContainerRef.current) {
                void requestFullscreen(editorContainerRef.current);
              }
            }}
            className="rounded border border-zinc-300 px-3 py-1 text-sm"
          >
            Fullscreen
          </button>
          <button
            type="button"
            onClick={runTests}
            disabled={running}
            className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {running ? "Running..." : "Run Tests"}
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="rounded bg-emerald-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {submitting ? "Submitting..." : "Submit"}
          </button>
        </div>

        <div ref={editorContainerRef} className="overflow-hidden rounded border border-zinc-300">
          <MonacoEditor
            height="420px"
            language={language}
            value={code}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              wordWrap: "on",
            }}
            onChange={(value) => {
              setCode(value ?? "");
            }}
            onMount={(editor) => {
              editorRef.current = editor;
              editor.onDidChangeModelContent((event) => {
                let insertedChars = 0;
                let deletedChars = 0;

                for (const change of event.changes) {
                  insertedChars += change.text.length;
                  deletedChars += change.rangeLength;
                }

                trackEditorChange({
                  deltaSize: insertedChars - deletedChars,
                  insertedChars,
                  deletedChars,
                });
              });
            }}
          />
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 p-5">
        <h3 className="text-lg font-semibold">Run Results</h3>
        {runResult ? (
          <ul className="mt-3 space-y-2">
            {runResult.tests.map((test) => (
              <li key={test.name} className="rounded border border-zinc-200 p-3 text-sm">
                <p className={test.passed ? "text-emerald-700" : "text-red-700"}>
                  {test.passed ? "PASS" : "FAIL"}: {test.name}
                </p>
                <p className="text-zinc-600">{test.message}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-zinc-500">No test run yet.</p>
        )}

        {submitResult ? (
          <p className="mt-4 rounded bg-emerald-50 p-3 text-sm text-emerald-700">
            Submitted. Review page: {submitResult.reviewUrl}
          </p>
        ) : null}

        {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
      </section>
    </div>
  );
}
