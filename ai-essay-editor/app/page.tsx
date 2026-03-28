import Link from "next/link";
import { getModuleTextColor, sanitizeModuleColor } from "@/lib/module-badge";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function Home() {
  let essays: Awaited<ReturnType<typeof prisma.essay.findMany>> = [];
  let loadFailed = false;

  try {
    essays = await prisma.essay.findMany({
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    console.error("Failed to load essays on home page:", error);
    loadFailed = true;
  }

  return (
    <main className="min-h-screen bg-surface p-6 md:p-10">
      <section className="mx-auto w-full max-w-4xl rounded-2xl border border-accent bg-white p-6 shadow-sm md:p-8">
        <div className="mb-8 flex flex-col gap-4 border-b border-accent pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-secondary">
              AI Essay Editor
            </h1>
            <p className="mt-2 text-sm text-zinc-600">
              View your essays and continue editing paragraph by paragraph.
            </p>
          </div>
          <Link
            href="/essays/new"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-strong"
          >
            New Essay
          </Link>
        </div>

        {loadFailed ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6">
            <p className="text-sm text-red-700">
              Could not load essays right now. Please refresh and try again.
            </p>
          </div>
        ) : essays.length === 0 ? (
          <div className="rounded-xl border border-dashed border-accent bg-surface p-10 text-center">
            <p className="text-zinc-700">No essays yet.</p>
            <p className="mt-1 text-sm text-zinc-500">
              Click &quot;New Essay&quot; to create your first one.
            </p>
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {essays.map((essay) => (
              <li key={essay.id}>
                <div className="flex h-full flex-col rounded-xl border border-accent bg-surface p-5">
                  <Link
                    href={`/essays/${essay.id}`}
                    className="block rounded-md hover:bg-surface-strong"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <p className="line-clamp-2 text-base font-semibold text-secondary">
                        {essay.name}
                      </p>
                      {essay.moduleName.trim() && (
                        <span
                          className="rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-black/10"
                          style={{
                            backgroundColor: sanitizeModuleColor(essay.moduleColor),
                            color: getModuleTextColor(essay.moduleColor),
                          }}
                        >
                          {essay.moduleName}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-zinc-600">
                      {essay.question}
                    </p>
                    <p className="mt-3 text-xs uppercase tracking-wide text-zinc-500">
                      Created {essay.createdAt.toLocaleDateString()}
                    </p>
                  </Link>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Link
                      href={`/essays/${essay.id}`}
                      className="rounded-md border border-accent px-3 py-1.5 text-xs font-medium text-secondary hover:bg-surface-strong"
                    >
                      Open
                    </Link>
                    <Link
                      href={`/essays/${essay.id}/full`}
                      className="rounded-md border border-accent px-3 py-1.5 text-xs font-medium text-secondary hover:bg-surface-strong"
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
