import Link from "next/link";

import { LogoutButton } from "@/components/logout-button";
import { listSessionsForReview } from "@/features/review/list-sessions";

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

export default async function ReviewSessionsPage() {
  const sessions = await listSessionsForReview();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <section className="flex items-center justify-between rounded-lg border border-zinc-200 p-5">
        <div>
          <h1 className="text-2xl font-semibold">All Sessions</h1>
          <p className="text-sm text-zinc-600">
            Open any session to view full timeline, flags, metrics, and code diffs.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/start"
            className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800"
          >
            Start Page
          </Link>
          <LogoutButton />
        </div>
      </section>

      <section className="overflow-x-auto rounded-lg border border-zinc-200">
        <table className="min-w-full divide-y divide-zinc-200 text-sm">
          <thead className="bg-zinc-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-zinc-700">Session</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-700">Candidate</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-700">Status</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-700">Created</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-700">Events</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-700">Flags</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-700">Open</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 bg-white">
            {sessions.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                  No sessions yet.
                </td>
              </tr>
            ) : (
              sessions.map((session) => (
                <tr key={session.id}>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-700">{session.id}</td>
                  <td className="px-4 py-3 text-zinc-700">
                    {session.candidateName ?? "-"}
                    {session.candidateEmail ? (
                      <span className="block text-xs text-zinc-500">{session.candidateEmail}</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-zinc-700">{session.status}</td>
                  <td className="px-4 py-3 text-zinc-700">{formatTimestamp(session.createdAtISO)}</td>
                  <td className="px-4 py-3 text-zinc-700">{session.eventCount}</td>
                  <td className="px-4 py-3 text-zinc-700">{session.flagCount}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/review/${session.id}`}
                      className="rounded bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white"
                    >
                      Open Review
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
