"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { LogoutButton } from "@/components/logout-button";
import type { ReviewResponse } from "@/features/review/summary";

function formatTimestamp(tsISO: string): string {
  const parsed = new Date(tsISO);
  if (Number.isNaN(parsed.getTime())) {
    return tsISO;
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(parsed);
}

export function ReviewPageClient({ review }: { review: ReviewResponse }) {
  const [eventFilter, setEventFilter] = useState("ALL");

  const filteredEvents = useMemo(() => {
    if (eventFilter === "ALL") {
      return review.events;
    }

    return review.events.filter((event) => event.type === eventFilter);
  }, [eventFilter, review.events]);

  const eventTypes = useMemo(() => {
    return [...new Set(review.events.map((event) => event.type))].sort();
  }, [review.events]);

  const exportAudit = () => {
    const blob = new Blob([JSON.stringify(review, null, 2)], {
      type: "application/json",
    });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = `session-${review.session.id}-audit.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(href);
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <section className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900">
        Internal-only review page for MVP. Do not use as sole evidence for misconduct.
      </section>

      <section className="flex items-center justify-between gap-4 rounded-lg border border-zinc-200 p-5">
        <div>
          <h1 className="text-2xl font-semibold">Review Session {review.session.id}</h1>
          <p className="text-sm text-zinc-600">
            Generated at {formatTimestamp(review.generatedAtISO)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/review"
            className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800"
          >
            All Sessions
          </Link>
          <button
            type="button"
            onClick={exportAudit}
            className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
          >
            Export JSON
          </button>
          <LogoutButton />
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 p-5">
        <h2 className="text-lg font-semibold">Metrics</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          {Object.entries(review.metrics).map(([key, value]) => (
            <div key={key} className="rounded border border-zinc-200 p-3">
              <p className="text-xs uppercase tracking-wide text-zinc-500">{key}</p>
              <p className="text-lg font-semibold">{String(value)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 p-5">
        <h2 className="text-lg font-semibold">Flags</h2>
        {review.flags.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">No flags generated.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {review.flags.map((flag, index) => (
              <li key={`${flag.code}-${flag.tsISO}-${index}`} className="rounded border border-zinc-200 p-3">
                <p className="text-sm font-semibold">
                  {flag.code} · {flag.severity}
                </p>
                <p className="text-xs text-zinc-600">{formatTimestamp(flag.tsISO)}</p>
                <pre className="mt-2 overflow-x-auto rounded bg-zinc-50 p-2 text-xs">
                  {JSON.stringify(flag.details, null, 2)}
                </pre>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-zinc-200 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Timeline</h2>
          <label className="text-sm">
            Filter
            <select
              value={eventFilter}
              onChange={(event) => setEventFilter(event.target.value)}
              className="ml-2 rounded border border-zinc-300 px-2 py-1"
            >
              <option value="ALL">ALL</option>
              {eventTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
        </div>
        <ul className="mt-3 space-y-2" data-testid="timeline-list">
          {filteredEvents.map((event) => (
            <li
              key={event.id}
              data-testid="timeline-event"
              data-event-type={event.type}
              className="rounded border border-zinc-200 p-3 text-sm"
            >
              <p className="font-medium">{event.type}</p>
              <p className="text-xs text-zinc-500">{formatTimestamp(event.tsISO)}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border border-zinc-200 p-5">
        <h2 className="text-lg font-semibold">Snapshots</h2>
        <div className="mt-3 space-y-3">
          {review.snapshots.map((snapshot) => (
            <div key={snapshot.id} className="rounded border border-zinc-200 p-3">
              <p className="text-sm font-medium">
                {snapshot.kind} · {snapshot.language} · {formatTimestamp(snapshot.tsISO)}
              </p>
              <pre className="mt-2 overflow-x-auto rounded bg-zinc-50 p-3 text-xs">{snapshot.code}</pre>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 p-5">
        <h2 className="text-lg font-semibold">Diffs</h2>
        <div className="mt-3 space-y-4">
          {review.diffs.map((diff) => (
            <div key={`${diff.fromSnapshotId}-${diff.toSnapshotId}`} className="rounded border border-zinc-200 p-3">
              <p className="text-sm font-medium">
                {diff.fromKind} ({diff.fromSnapshotId}) → {diff.toKind} ({diff.toSnapshotId})
              </p>
              <pre className="mt-2 overflow-x-auto rounded bg-zinc-50 p-3 text-xs">
                {diff.changes
                  .map((change) => {
                    if (change.type === "add") {
                      return `+ ${change.line}`;
                    }
                    if (change.type === "remove") {
                      return `- ${change.line}`;
                    }
                    return `  ${change.line}`;
                  })
                  .join("\n")}
              </pre>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
