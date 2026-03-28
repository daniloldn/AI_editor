import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

type NewEssayPageProps = {
  searchParams: Promise<{ error?: string }>;
};

async function createEssay(formData: FormData) {
  "use server";

  const titleValue = formData.get("title");
  const title = typeof titleValue === "string" ? titleValue.trim() : "";

  if (!title) {
    redirect("/essays/new?error=missing-title");
  }

  const essay = await prisma.essay.create({
    data: { title },
  });

  redirect(`/essays/${essay.id}`);
}

export default async function NewEssayPage({ searchParams }: NewEssayPageProps) {
  const { error } = await searchParams;
  const showTitleError = error === "missing-title";

  return (
    <main className="min-h-screen bg-zinc-50 p-6 md:p-10">
      <section className="mx-auto w-full max-w-2xl rounded-xl border border-zinc-200 bg-white p-6 shadow-sm md:p-8">
        <h1 className="text-2xl font-semibold text-zinc-900">New Essay</h1>
        <p className="mt-2 text-zinc-600">Add a title to create a new essay.</p>

        <form action={createEssay} className="mt-6 space-y-3">
          <label htmlFor="title" className="block text-sm font-medium text-zinc-700">
            Essay Title
          </label>
          <input
            id="title"
            name="title"
            type="text"
            placeholder="My Essay Title"
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 outline-none ring-zinc-400 focus:ring-2"
          />

          {showTitleError && (
            <p className="text-sm text-red-600">Please enter an essay title.</p>
          )}

          <button
            type="submit"
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            Create Essay
          </button>
        </form>

        <Link
          href="/"
          className="mt-6 inline-block rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100"
        >
          Back to Home
        </Link>
      </section>
    </main>
  );
}
