import Link from "next/link";
import { getModuleTextColor, sanitizeModuleColor } from "@/lib/module-badge";
import { prisma } from "@/lib/prisma";

export default async function Home() {
  const essays = await prisma.essay.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="min-h-screen bg-zinc-100/60 p-6 md:p-10">
      <section className="mx-auto w-full max-w-4xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm md:p-8">
        <div className="mb-8 flex flex-col gap-4 border-b border-zinc-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
              AI Essay Editor
            </h1>
            <p className="mt-2 text-sm text-zinc-600">
              View your essays and continue editing paragraph by paragraph.
            </p>
          </div>
          <Link
            href="/essays/new"
            className="inline-flex items-center justify-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            New Essay
          </Link>
        </div>

        {essays.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-10 text-center">
            <p className="text-zinc-700">No essays yet.</p>
            <p className="mt-1 text-sm text-zinc-500">
              Click &quot;New Essay&quot; to create your first one.
            </p>
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {essays.map((essay) => (
              <li key={essay.id}>
                <div className="flex h-full flex-col rounded-xl border border-zinc-200 bg-zinc-50/40 p-5">
                  <Link
                    href={`/essays/${essay.id}`}
                    className="block rounded-md hover:bg-zinc-50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="line-clamp-2 text-base font-semibold text-zinc-900">
                        {essay.name}
                      </p>
                      <span
                        className="rounded-full px-2.5 py-1 text-xs font-medium"
                        style={{
                          backgroundColor: sanitizeModuleColor(essay.moduleColor),
                          color: getModuleTextColor(essay.moduleColor),
                        }}
                      >
                        {essay.moduleName}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-zinc-600">
                      {essay.question}
                    </p>
                    <p className="mt-3 text-xs uppercase tracking-wide text-zinc-500">
                      Created {essay.createdAt.toLocaleDateString()}
                    </p>
                  </Link>
                  <div className="mt-4 flex items-center gap-2">
                    <Link
                      href={`/essays/${essay.id}`}
                      className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
                    >
                      Open
                    </Link>
                    <Link
                      href={`/essays/${essay.id}/full`}
                      className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
                    >
                      Full Essay
                    </Link>
                    <Link
                      href={`/essays/${essay.id}/delete`}
                      className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                    >
                      Delete
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
