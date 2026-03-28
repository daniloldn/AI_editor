import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import SubmitButton from "@/app/components/submit-button";
import {
  DEFAULT_MODULE_COLOR,
  getModuleTextColor,
  sanitizeModuleColor,
} from "@/lib/module-badge";
import { prisma } from "@/lib/prisma";

type EssayDetailsPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ details?: string }>;
};

async function saveEssayDetails(formData: FormData) {
  "use server";

  const essayIdValue = formData.get("essayId");
  const nameValue = formData.get("name");
  const questionValue = formData.get("question");
  const moduleNameValue = formData.get("moduleName");
  const moduleColorValue = formData.get("moduleColor");
  const essayId = Number(essayIdValue);
  const name = typeof nameValue === "string" ? nameValue.trim() : "";
  const question = typeof questionValue === "string" ? questionValue.trim() : "";
  const moduleName =
    typeof moduleNameValue === "string" ? moduleNameValue.trim() : "";
  const moduleColor =
    typeof moduleColorValue === "string"
      ? sanitizeModuleColor(moduleColorValue)
      : DEFAULT_MODULE_COLOR;

  if (!Number.isInteger(essayId) || essayId <= 0) {
    redirect("/");
  }

  if (!name || !question || !moduleName) {
    redirect(`/essays/${essayId}/details?details=missing-fields`);
  }

  try {
    await prisma.essay.update({
      where: { id: essayId },
      data: { name, question, moduleName, moduleColor },
    });
  } catch {
    redirect(`/essays/${essayId}/details?details=failed`);
  }

  redirect(`/essays/${essayId}/details?details=saved`);
}

export default async function EssayDetailsPage({
  params,
  searchParams,
}: EssayDetailsPageProps) {
  const { id } = await params;
  const { details } = await searchParams;
  const essayId = Number(id);
  const detailsMessage =
    details === "saved"
      ? "Essay details saved."
      : details === "missing-fields"
        ? "Please enter essay name, essay question, and module name."
        : details === "failed"
          ? "Could not save essay details right now."
          : null;

  if (!Number.isInteger(essayId) || essayId <= 0) {
    notFound();
  }

  let essay:
    | {
        id: number;
        name: string;
        question: string;
        moduleName: string;
        moduleColor: string;
      }
    | null = null;
  let loadFailed = false;

  try {
    essay = await prisma.essay.findUnique({
      where: { id: essayId },
      select: {
        id: true,
        name: true,
        question: true,
        moduleName: true,
        moduleColor: true,
      },
    });
  } catch {
    loadFailed = true;
  }

  if (loadFailed) {
    return (
      <main className="min-h-screen bg-surface p-6 md:p-10">
        <section className="mx-auto w-full max-w-3xl rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm md:p-8">
          <Link
            href={`/essays/${essayId}`}
            className="text-sm text-zinc-600 hover:text-zinc-900"
          >
            Back to Essay Workspace
          </Link>
          <p className="mt-3 text-sm text-red-700">
            Could not load essay details right now. Please refresh and try again.
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
      <section className="mx-auto w-full max-w-3xl rounded-2xl border border-accent bg-white p-6 shadow-sm md:p-8">
        <Link
          href={`/essays/${essay.id}`}
          className="text-sm text-zinc-600 hover:text-zinc-900"
        >
          Back to Essay Workspace
        </Link>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight text-secondary">
            Essay Details
          </h1>
          <span
            className="rounded-full px-3 py-1 text-xs font-medium ring-1 ring-black/10"
            style={{
              backgroundColor: sanitizeModuleColor(essay.moduleColor),
              color: getModuleTextColor(essay.moduleColor),
            }}
          >
            {essay.moduleName}
          </span>
        </div>

        <form
          action={saveEssayDetails}
          className="mt-6 space-y-4 rounded-xl border border-accent bg-surface p-5"
        >
          <input type="hidden" name="essayId" value={essay.id} />
          <label htmlFor="name" className="block text-sm font-medium text-zinc-700">
            Essay Name
          </label>
          <input
            id="name"
            name="name"
            defaultValue={essay.name}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none ring-zinc-400 focus:ring-2"
          />
          <label htmlFor="question" className="block text-sm font-medium text-zinc-700">
            Essay Question
          </label>
          <textarea
            id="question"
            name="question"
            rows={5}
            defaultValue={essay.question}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none ring-zinc-400 focus:ring-2"
          />
          <label
            htmlFor="moduleName"
            className="block text-sm font-medium text-zinc-700"
          >
            Module Name
          </label>
          <input
            id="moduleName"
            name="moduleName"
            defaultValue={essay.moduleName}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none ring-zinc-400 focus:ring-2"
          />
          <label
            htmlFor="moduleColor"
            className="block text-sm font-medium text-zinc-700"
          >
            Module Color
          </label>
          <input
            id="moduleColor"
            name="moduleColor"
            type="color"
            defaultValue={sanitizeModuleColor(essay.moduleColor)}
            className="h-10 w-20 cursor-pointer rounded-md border border-zinc-300 bg-white p-1"
          />

          {detailsMessage && (
            <p
              role="status"
              aria-live="polite"
              className={`text-sm ${
                details === "saved" ? "text-green-700" : "text-red-600"
              }`}
            >
              {detailsMessage}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <SubmitButton
              idleLabel="Save Details"
              pendingLabel="Saving..."
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-strong disabled:cursor-not-allowed disabled:opacity-70"
            />
            <Link
              href={`/essays/${essay.id}/delete`}
              className="rounded-md border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
            >
              Delete Essay
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}
