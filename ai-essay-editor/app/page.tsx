import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function Home() {
  const essays = await prisma.essay.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="min-h-screen bg-zinc-50 p-6 md:p-10">
      <section className="mx-auto w-full max-w-3xl rounded-xl border border-zinc-200 bg-white p-6 shadow-sm md:p-8">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-zinc-900">AI Essay Editor</h1>
            <p className="mt-2 text-sm text-zinc-600">
              View your essays and continue editing paragraph by paragraph.
            </p>
          </div>
          <Link
            href="/essays/new"
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            New Essay
          </Link>
        </div>

        {essays.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center">
            <p className="text-zinc-700">No essays yet.</p>
            <p className="mt-1 text-sm text-zinc-500">
              Click &quot;New Essay&quot; to create your first one.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {essays.map((essay) => (
              <li key={essay.id}>
                <Link
                  href={`/essays/${essay.id}`}
                  className="block rounded-lg border border-zinc-200 bg-white p-4 hover:border-zinc-300 hover:bg-zinc-50"
                >
                  <p className="font-medium text-zinc-900">{essay.title}</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    Created {essay.createdAt.toLocaleDateString()}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
