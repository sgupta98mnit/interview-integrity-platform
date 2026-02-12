export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center gap-6 px-6 py-20">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
        Interview Integrity Platform
      </p>
      <h1 className="text-4xl font-semibold tracking-tight text-zinc-900">
        Coding interview workspace with integrity signal capture
      </h1>
      <p className="max-w-2xl text-lg text-zinc-600">
        MVP scaffolding is complete. Candidate and review flows are added in the
        following PR steps.
      </p>
      <div className="flex gap-3">
        <a
          href="/start"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
        >
          Start Session
        </a>
      </div>
    </main>
  );
}
