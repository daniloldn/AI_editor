import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

type DeleteEssayPageProps = {
  params: Promise<{ id: string }>;
};

async function deleteEssay(formData: FormData) {
  "use server";

  const essayIdValue = formData.get("essayId");
  const essayId = Number(essayIdValue);

  if (!Number.isInteger(essayId) || essayId <= 0) {
    redirect("/");
  }

  await prisma.essay.delete({
    where: { id: essayId },
  });

  redirect("/");
}

export default async function DeleteEssayPage({ params }: DeleteEssayPageProps) {
  const { id } = await params;
  const essayId = Number(id);

  if (!Number.isInteger(essayId) || essayId <= 0) {
    notFound();
  }

  const essay = await prisma.essay.findUnique({
    where: { id: essayId },
    select: { id: true, title: true },
  });

  if (!essay) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-zinc-100/60 p-6 md:p-10">
      <section className="mx-auto w-full max-w-2xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm md:p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Delete Essay
        </h1>
        <p className="mt-3 text-sm text-zinc-700">
          Are you sure you want to delete <span className="font-medium">&quot;{essay.title}&quot;</span>?
        </p>
        <p className="mt-1 text-sm text-zinc-600">
          This also removes all related paragraphs and cannot be undone.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <form action={deleteEssay}>
            <input type="hidden" name="essayId" value={essay.id} />
            <button
              type="submit"
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Yes, Delete Essay
            </button>
          </form>
          <Link
            href={`/essays/${essay.id}`}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100"
          >
            Cancel
          </Link>
        </div>
      </section>
    </main>
  );
}
