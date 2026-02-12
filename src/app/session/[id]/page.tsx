import { CodingWorkspace } from "./coding-workspace";

export default async function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-4 px-6 py-16">
      <h1 className="text-3xl font-semibold">Session {id}</h1>
      <CodingWorkspace sessionId={id} />
    </main>
  );
}
