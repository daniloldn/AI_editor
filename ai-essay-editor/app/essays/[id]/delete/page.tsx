import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import SubmitButton from "@/app/components/submit-button";
import { prisma } from "@/lib/prisma";

type DeleteEssayPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

async function deleteEssay(formData: FormData) {
  "use server";

  const essayIdValue = formData.get("essayId");
  const essayId = Number(essayIdValue);

  if (!Number.isInteger(essayId) || essayId <= 0) {
    redirect("/");
  }

  try {
    await prisma.essay.delete({
      where: { id: essayId },
    });
  } catch {
    redirect(`/essays/${essayId}/delete?error=delete-failed`);
  }

  redirect("/");
}

export default async function DeleteEssayPage({
  params,
  searchParams,
}: DeleteEssayPageProps) {
  const { id } = await params;
  const { error } = await searchParams;
  const essayId = Number(id);
  const showDeleteError = error === "delete-failed";

  if (!Number.isInteger(essayId) || essayId <= 0) {
    notFound();
  }

  let essay: { id: number; name: string } | null = null;
  let loadFailed = false;
  try {
    essay = await prisma.essay.findUnique({
      where: { id: essayId },
      select: { id: true, name: true },
    });
  } catch {
    loadFailed = true;
  }

  if (loadFailed) {
    return (
      <main className="min-h-screen bg-surface p-6 md:p-10">
        <section className="mx-auto w-full max-w-2xl rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm md:p-8">
          <Link href="/" className="text-sm text-zinc-600 hover:text-zinc-900">
            Back to Home
          </Link>
          <p className="mt-3 text-sm text-red-700">
            Could not load delete confirmation right now. Please refresh and try
            again.
          </p>
        </section>
      </main>
    );
  }

  if (!essay) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-surface p-6 md:p-10">
      <section className="mx-auto w-full max-w-2xl rounded-2xl border border-accent bg-white p-6 shadow-sm md:p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-secondary">
          Delete Essay
        </h1>
        <p className="mt-3 text-sm text-zinc-700">
          Are you sure you want to delete <span className="font-medium">&quot;{essay.name}&quot;</span>?
        </p>
        <p className="mt-1 text-sm text-zinc-600">
          This also removes all related paragraphs and cannot be undone.
        </p>
        {showDeleteError && (
          <p className="mt-3 text-sm text-red-600" role="status" aria-live="polite">
            Could not delete the essay right now. Please try again.
          </p>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <form action={deleteEssay}>
            <input type="hidden" name="essayId" value={essay.id} />
            <SubmitButton
              idleLabel="Yes, Delete Essay"
              pendingLabel="Deleting..."
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
            />
          </form>
          <Link
            href={`/essays/${essay.id}/details`}
            className="rounded-md border border-accent px-4 py-2 text-sm font-medium text-secondary hover:bg-surface-strong"
          >
            Cancel
          </Link>
        </div>
      </section>
    </main>
  );
}
