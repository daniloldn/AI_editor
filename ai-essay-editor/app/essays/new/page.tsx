import Link from "next/link";
import { redirect } from "next/navigation";
import {
  DEFAULT_MODULE_COLOR,
  sanitizeModuleColor,
} from "@/lib/module-badge";
import { prisma } from "@/lib/prisma";
import SubmitButton from "@/app/components/submit-button";

type NewEssayPageProps = {
  searchParams: Promise<{ error?: string }>;
};

async function createEssay(formData: FormData) {
  "use server";

  const nameValue = formData.get("name");
  const questionValue = formData.get("question");
  const moduleNameValue = formData.get("moduleName");
  const moduleColorValue = formData.get("moduleColor");
  const name = typeof nameValue === "string" ? nameValue.trim() : "";
  const question =
    typeof questionValue === "string" ? questionValue.trim() : "";
  const moduleName =
    typeof moduleNameValue === "string" ? moduleNameValue.trim() : "";
  const moduleColor =
    typeof moduleColorValue === "string"
      ? sanitizeModuleColor(moduleColorValue)
      : DEFAULT_MODULE_COLOR;

  if (!name || !question || !moduleName) {
    redirect("/essays/new?error=missing-fields");
  }

  let essayId: number;
  try {
    const essay = await prisma.essay.create({
      data: { name, question, moduleName, moduleColor },
    });
    essayId = essay.id;
  } catch {
    redirect("/essays/new?error=create-failed");
  }

  redirect(`/essays/${essayId}`);
}

export default async function NewEssayPage({ searchParams }: NewEssayPageProps) {
  const { error } = await searchParams;
  const showFieldsError = error === "missing-fields";
  const showCreateError = error === "create-failed";

  return (
    <main className="min-h-screen bg-surface p-6 md:p-10">
      <section className="mx-auto w-full max-w-2xl rounded-xl border border-accent bg-white p-6 shadow-sm md:p-8">
        <h1 className="text-2xl font-semibold text-secondary">New Essay</h1>
        <p className="mt-2 text-zinc-600">
          Add a short name and full essay question to create a new draft.
        </p>

        <form action={createEssay} className="mt-6 space-y-4">
          <label htmlFor="name" className="block text-sm font-medium text-zinc-700">
            Essay Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            placeholder="Short draft name"
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 outline-none ring-zinc-400 focus:ring-2"
          />
          <label
            htmlFor="question"
            className="block text-sm font-medium text-zinc-700"
          >
            Essay Question
          </label>
          <textarea
            id="question"
            name="question"
            rows={4}
            placeholder="Paste the full assignment question..."
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 outline-none ring-zinc-400 focus:ring-2"
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
            type="text"
            placeholder="Biochemistry 301"
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 outline-none ring-zinc-400 focus:ring-2"
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
            defaultValue={DEFAULT_MODULE_COLOR}
            className="h-10 w-20 cursor-pointer rounded-md border border-zinc-300 bg-white p-1"
          />

          {showFieldsError && (
            <p className="text-sm text-red-600" role="status" aria-live="polite">
              Please enter essay name, essay question, and module name.
            </p>
          )}
          {showCreateError && (
            <p className="text-sm text-red-600" role="status" aria-live="polite">
              Could not create the essay right now. Please try again.
            </p>
          )}

          <SubmitButton
            idleLabel="Create Essay"
            pendingLabel="Creating..."
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-strong disabled:cursor-not-allowed disabled:opacity-70"
          />
        </form>

        <Link
          href="/"
          className="mt-6 inline-block rounded-md border border-accent px-4 py-2 text-sm font-medium text-secondary hover:bg-surface-strong"
        >
          Back to Home
        </Link>
      </section>
    </main>
  );
}
