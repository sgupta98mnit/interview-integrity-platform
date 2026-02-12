import { StartSessionForm } from "./start-session-form";

export default function StartPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center gap-6 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
        Start Interview Session
      </h1>
      <p className="text-zinc-600">
        Candidate name and email are optional for MVP and used only for review context.
      </p>
      <StartSessionForm />
    </main>
  );
}
