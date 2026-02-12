"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type CreateSessionResponse = {
  sessionId: string;
  nextUrl: string;
};

export function StartSessionForm() {
  const router = useRouter();
  const [candidateName, setCandidateName] = useState("");
  const [candidateEmail, setCandidateEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          candidateName: candidateName || undefined,
          candidateEmail: candidateEmail || undefined,
        }),
      });

      const payload = (await response.json()) as CreateSessionResponse | { error?: string };
      if (!response.ok || !("nextUrl" in payload)) {
        throw new Error((payload as { error?: string }).error ?? "Failed to create session");
      }

      router.push(payload.nextUrl);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Failed to create session";
      setError(message);
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 rounded-lg border border-zinc-200 p-5">
      <label className="flex flex-col gap-2 text-sm">
        Candidate Name (optional)
        <input
          className="rounded border border-zinc-300 px-3 py-2"
          value={candidateName}
          onChange={(event) => setCandidateName(event.target.value)}
          placeholder="Jane Doe"
          maxLength={120}
        />
      </label>
      <label className="flex flex-col gap-2 text-sm">
        Candidate Email (optional)
        <input
          type="email"
          className="rounded border border-zinc-300 px-3 py-2"
          value={candidateEmail}
          onChange={(event) => setCandidateEmail(event.target.value)}
          placeholder="jane@example.com"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Starting..." : "Create Session"}
      </button>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </form>
  );
}
