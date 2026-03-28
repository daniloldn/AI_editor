import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import SubmitButton from "@/app/components/submit-button";
import ConfirmSubmitButton from "./confirm-submit-button";
import CopyParagraphButton from "./copy-paragraph-button";
import {
  getModuleTextColor,
  sanitizeModuleColor,
} from "@/lib/module-badge";
import {
  normalizePolishResultForStorage,
  parsePolishResult,
} from "@/lib/polish-result";
import {
  CitationIntegrityError,
  OpenAIKeyMissingError,
  polishParagraphWithOpenAI,
  PromptInterpolationError,
} from "@/lib/openai";
import { prisma } from "@/lib/prisma";

type EssayDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    error?: string;
    context?: string;
    references?: string;
  }>;
};

async function applyParagraphOrder(
  tx: Prisma.TransactionClient,
  orderedParagraphIds: number[],
) {
  for (let i = 0; i < orderedParagraphIds.length; i += 1) {
    await tx.paragraph.update({
      where: { id: orderedParagraphIds[i] },
      data: { order: -(i + 1) },
    });
  }

  for (let i = 0; i < orderedParagraphIds.length; i += 1) {
    await tx.paragraph.update({
      where: { id: orderedParagraphIds[i] },
      data: { order: i + 1 },
    });
  }
}

async function createParagraph(formData: FormData) {
  "use server";

  const essayIdValue = formData.get("essayId");
  const paragraphValue = formData.get("paragraph");

  const essayId = Number(essayIdValue);
  const originalText =
    typeof paragraphValue === "string" ? paragraphValue.trim() : "";

  if (!Number.isInteger(essayId) || essayId <= 0) {
    redirect("/");
  }

  if (!originalText) {
    redirect(`/essays/${essayId}?error=missing-paragraph`);
  }

  let essayForPrompt:
    | {
        name: string;
        question: string;
        contextNotes: string;
        references: string;
        paragraphs: { polishedText: string }[];
      }
    | null = null;
  try {
    essayForPrompt = await prisma.essay.findUnique({
      where: { id: essayId },
      select: {
        name: true,
        question: true,
        contextNotes: true,
        references: true,
        paragraphs: {
          orderBy: { order: "asc" },
          select: { polishedText: true },
        },
      },
    });
  } catch {
    redirect(`/essays/${essayId}?error=db-read-failed`);
  }

  if (!essayForPrompt) {
    redirect("/");
  }

  if (!essayForPrompt.question.trim()) {
    redirect(`/essays/${essayId}?error=missing-question`);
  }

  const previousParagraphsContext = essayForPrompt.paragraphs
    .map((paragraph) => parsePolishResult(paragraph.polishedText).polishedParagraph)
    .filter((text) => text.length > 0)
    .join("\n\n");
  const savedEssayContext = essayForPrompt.contextNotes.trim();
  const savedReferences = essayForPrompt.references.trim();

  const context = [savedEssayContext, previousParagraphsContext]
    .filter((part) => part.length > 0)
    .join("\n\n");

  let polishedText: string;

  try {
    const aiResponseText = await polishParagraphWithOpenAI({
      question: essayForPrompt.question,
      polish_paragraph: originalText,
      context,
      references: savedReferences,
    });
    polishedText = normalizePolishResultForStorage(aiResponseText);

    if (!polishedText) {
      redirect(`/essays/${essayId}?error=polish-failed`);
    }
  } catch (error) {
    if (error instanceof OpenAIKeyMissingError) {
      redirect(`/essays/${essayId}?error=missing-openai-key`);
    }
    if (error instanceof CitationIntegrityError) {
      redirect(`/essays/${essayId}?error=citation-integrity`);
    }
    if (error instanceof PromptInterpolationError) {
      redirect(`/essays/${essayId}?error=invalid-prompt-variables`);
    }

    redirect(`/essays/${essayId}?error=polish-failed`);
  }

  // Retry once if two requests race to claim the same order value.
  let paragraphSaved = false;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await prisma.$transaction(async (tx) => {
        const lastParagraph = await tx.paragraph.findFirst({
          where: { essayId },
          orderBy: { order: "desc" },
          select: { order: true },
        });
        const nextOrder = lastParagraph ? lastParagraph.order + 1 : 1;

        await tx.paragraph.create({
          data: {
            essayId,
            originalText,
            polishedText,
            order: nextOrder,
          },
        });
      });
      paragraphSaved = true;
      break;
    } catch (error) {
      const isUniqueOrderConflict =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002";

      if (isUniqueOrderConflict && attempt === 0) {
        continue;
      }

      console.error("Failed to save paragraph:", error);
      redirect(
        isUniqueOrderConflict
          ? `/essays/${essayId}?error=order-conflict`
          : `/essays/${essayId}?error=db-save-failed`,
      );
    }
  }

  if (paragraphSaved) {
    redirect(`/essays/${essayId}`);
  }

  redirect(`/essays/${essayId}?error=order-conflict`);
}

async function saveEssayContext(formData: FormData) {
  "use server";

  const essayIdValue = formData.get("essayId");
  const contextNotesValue = formData.get("contextNotes");
  const essayId = Number(essayIdValue);
  const contextNotes =
    typeof contextNotesValue === "string" ? contextNotesValue.trim() : "";

  if (!Number.isInteger(essayId) || essayId <= 0) {
    redirect("/");
  }

  try {
    await prisma.essay.update({
      where: { id: essayId },
      data: { contextNotes },
    });
  } catch {
    redirect(`/essays/${essayId}?context=failed`);
  }

  redirect(`/essays/${essayId}?context=saved`);
}

async function saveEssayReferences(formData: FormData) {
  "use server";

  const essayIdValue = formData.get("essayId");
  const referencesValue = formData.get("references");
  const essayId = Number(essayIdValue);
  const references =
    typeof referencesValue === "string" ? referencesValue.trim() : "";

  if (!Number.isInteger(essayId) || essayId <= 0) {
    redirect("/");
  }

  try {
    await prisma.essay.update({
      where: { id: essayId },
      data: { references },
    });
  } catch {
    redirect(`/essays/${essayId}?references=failed`);
  }

  redirect(`/essays/${essayId}?references=saved`);
}

async function deleteParagraph(formData: FormData) {
  "use server";

  const essayIdValue = formData.get("essayId");
  const paragraphIdValue = formData.get("paragraphId");
  const essayId = Number(essayIdValue);
  const paragraphId = Number(paragraphIdValue);

  if (!Number.isInteger(essayId) || essayId <= 0) {
    redirect("/");
  }

  if (!Number.isInteger(paragraphId) || paragraphId <= 0) {
    redirect(`/essays/${essayId}`);
  }

  try {
    await prisma.$transaction(async (tx) => {
      const paragraphs = await tx.paragraph.findMany({
        where: { essayId },
        orderBy: { order: "asc" },
        select: { id: true },
      });
      const existingIds = paragraphs.map((paragraph) => paragraph.id);

      if (!existingIds.includes(paragraphId)) {
        throw new Error("Paragraph not found for delete.");
      }

      await tx.paragraph.delete({
        where: { id: paragraphId },
      });

      const remainingIds = existingIds.filter((id) => id !== paragraphId);
      await applyParagraphOrder(tx, remainingIds);
    });
  } catch (error) {
    console.error("Failed to delete paragraph:", error);
    redirect(`/essays/${essayId}?error=paragraph-delete-failed`);
  }

  redirect(`/essays/${essayId}`);
}

async function moveParagraph(formData: FormData) {
  "use server";

  const essayIdValue = formData.get("essayId");
  const paragraphIdValue = formData.get("paragraphId");
  const directionValue = formData.get("direction");
  const essayId = Number(essayIdValue);
  const paragraphId = Number(paragraphIdValue);
  const direction =
    directionValue === "up" || directionValue === "down" ? directionValue : "";

  if (!Number.isInteger(essayId) || essayId <= 0) {
    redirect("/");
  }

  if (!Number.isInteger(paragraphId) || paragraphId <= 0 || !direction) {
    redirect(`/essays/${essayId}`);
  }

  try {
    await prisma.$transaction(async (tx) => {
      const paragraphs = await tx.paragraph.findMany({
        where: { essayId },
        orderBy: { order: "asc" },
        select: { id: true },
      });
      const orderedIds = paragraphs.map((paragraph) => paragraph.id);
      const currentIndex = orderedIds.findIndex((id) => id === paragraphId);

      if (currentIndex === -1) {
        throw new Error("Paragraph not found for reorder.");
      }

      const targetIndex =
        direction === "up" ? currentIndex - 1 : currentIndex + 1;

      if (targetIndex < 0 || targetIndex >= orderedIds.length) {
        return;
      }

      [orderedIds[currentIndex], orderedIds[targetIndex]] = [
        orderedIds[targetIndex],
        orderedIds[currentIndex],
      ];

      await applyParagraphOrder(tx, orderedIds);
    });
  } catch (error) {
    console.error("Failed to reorder paragraph:", error);
    redirect(`/essays/${essayId}?error=paragraph-reorder-failed`);
  }

  redirect(`/essays/${essayId}`);
}

export default async function EssayDetailPage({
  params,
  searchParams,
}: EssayDetailPageProps) {
  const { id } = await params;
  const { error, context, references } = await searchParams;
  const essayId = Number(id);
  const errorMessage =
    error === "missing-paragraph"
      ? "Please enter a paragraph."
      : error === "missing-question"
        ? "Essay question is required before polishing."
      : error === "db-read-failed"
        ? "Could not read essay data right now. Please refresh and try again."
      : error === "db-save-failed"
        ? "Could not save the paragraph right now. Please try again."
      : error === "order-conflict"
        ? "Another paragraph was saved at the same time. Please submit again."
      : error === "paragraph-delete-failed"
        ? "Could not delete the paragraph right now. Please try again."
      : error === "paragraph-reorder-failed"
        ? "Could not reorder paragraphs right now. Please try again."
      : error === "citation-integrity"
        ? "Citation markers changed during polishing. Try again with clearer references."
      : error === "missing-openai-key"
        ? "OpenAI API key is missing. Add OPENAI_API_KEY to your .env file."
        : error === "invalid-prompt-variables"
          ? "Prompt variables are missing or invalid. Check prompt placeholders."
        : error === "polish-failed"
          ? "Could not polish the paragraph right now. Please try again."
          : null;
  const contextMessage =
    context === "saved"
      ? "Context notes saved."
      : context === "failed"
        ? "Could not save context notes right now."
        : null;
  const referencesMessage =
    references === "saved"
      ? "References saved."
      : references === "failed"
        ? "Could not save references right now."
        : null;

  if (!Number.isInteger(essayId) || essayId <= 0) {
    notFound();
  }

  let essay:
    | (Awaited<ReturnType<typeof prisma.essay.findUnique>> & {
        paragraphs: {
          id: number;
          order: number;
          originalText: string;
          polishedText: string;
          createdAt: Date;
          essayId: number;
        }[];
      })
    | null = null;
  let loadFailed = false;

  try {
    essay = await prisma.essay.findUnique({
      where: { id: essayId },
      include: {
        paragraphs: {
          orderBy: { order: "asc" },
        },
      },
    });
  } catch {
    loadFailed = true;
  }

  if (loadFailed) {
    return (
      <main className="min-h-screen bg-surface p-6 md:p-10">
        <section className="mx-auto w-full max-w-4xl rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm md:p-8">
          <Link href="/" className="text-sm text-zinc-600 hover:text-zinc-900">
            Back to Home
          </Link>
          <p className="mt-3 text-sm text-red-700">
            Could not load this essay right now. Please refresh and try again.
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
      <section className="mx-auto w-full max-w-4xl rounded-2xl border border-accent bg-white p-6 shadow-sm md:p-8">
        <Link href="/" className="text-sm text-zinc-600 hover:text-zinc-900">
          Back to Home
        </Link>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight text-secondary">
              {essay.name}
            </h1>
            {essay.moduleName.trim() && (
              <span
                className="rounded-full px-3 py-1 text-xs font-medium ring-1 ring-black/10"
                style={{
                  backgroundColor: sanitizeModuleColor(essay.moduleColor),
                  color: getModuleTextColor(essay.moduleColor),
                }}
              >
                {essay.moduleName}
              </span>
            )}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href={`/essays/${essay.id}/details`}
            className="inline-flex rounded-md border border-accent px-3 py-2 text-sm font-medium text-secondary hover:bg-surface-strong"
          >
            Essay Details
          </Link>
          <Link
            href={`/essays/${essay.id}/full`}
            className="inline-flex rounded-md border border-accent px-3 py-2 text-sm font-medium text-secondary hover:bg-surface-strong"
          >
            View Full Essay
          </Link>
        </div>
        <p className="mt-3 whitespace-pre-wrap rounded-lg border border-accent bg-surface p-3 text-sm text-zinc-700">
          {essay.question}
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.15fr]">
          <div className="space-y-6">
            <form
              action={createParagraph}
              className="space-y-4 rounded-xl border border-accent bg-surface p-5"
            >
              <input type="hidden" name="essayId" value={essay.id} />
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-secondary">
                  Add New Paragraph
                </h2>
                <p className="mt-1 text-sm text-zinc-600">
                  Write a paragraph and let the editor polish it.
                </p>
              </div>
              <textarea
                id="paragraph"
                name="paragraph"
                rows={8}
                placeholder="Write your paragraph here..."
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none ring-zinc-400 focus:ring-2"
              />
              {errorMessage && (
                <p className="text-sm text-red-600" role="status" aria-live="polite">
                  {errorMessage}
                </p>
              )}
              <SubmitButton
                idleLabel="Polish Paragraph"
                pendingLabel="Polishing..."
                className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-strong disabled:cursor-not-allowed disabled:opacity-70"
              />
            </form>

            <form
              action={saveEssayContext}
              className="space-y-4 rounded-xl border border-accent bg-surface p-5"
            >
              <input type="hidden" name="essayId" value={essay.id} />
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-secondary">
                  Context Notes
                </h2>
                <p className="mt-1 text-sm text-zinc-600">
                  Add optional notes to guide polishing for this essay.
                </p>
              </div>
              <textarea
                id="contextNotes"
                name="contextNotes"
                rows={5}
                defaultValue={essay.contextNotes}
                placeholder="Optional context for this essay..."
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none ring-zinc-400 focus:ring-2"
              />
              {contextMessage && (
                <p
                  role="status"
                  aria-live="polite"
                  className={`text-sm ${
                    context === "saved" ? "text-green-700" : "text-red-600"
                  }`}
                >
                  {contextMessage}
                </p>
              )}
              <SubmitButton
                idleLabel="Save Context"
                pendingLabel="Saving..."
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-strong disabled:cursor-not-allowed disabled:opacity-70"
              />
            </form>

            <form
              action={saveEssayReferences}
              className="space-y-4 rounded-xl border border-accent bg-surface p-5"
            >
              <input type="hidden" name="essayId" value={essay.id} />
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-secondary">
                  References
                </h2>
                <p className="mt-1 text-sm text-zinc-600">
                  Add reference list entries used by this essay.
                </p>
              </div>
              <textarea
                id="references"
                name="references"
                rows={6}
                defaultValue={essay.references}
                placeholder="Add references here, one per line..."
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none ring-zinc-400 focus:ring-2"
              />
              {referencesMessage && (
                <p
                  role="status"
                  aria-live="polite"
                  className={`text-sm ${
                    references === "saved" ? "text-green-700" : "text-red-600"
                  }`}
                >
                  {referencesMessage}
                </p>
              )}
              <SubmitButton
                idleLabel="Save References"
                pendingLabel="Saving..."
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-strong disabled:cursor-not-allowed disabled:opacity-70"
              />
            </form>
          </div>

          <section className="rounded-xl border border-accent bg-white p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-secondary">
              Paragraph History
            </h2>
            {essay.paragraphs.length === 0 ? (
              <p className="mt-4 text-sm text-zinc-600">No polished paragraphs yet.</p>
            ) : (
              <ul className="mt-4 space-y-4">
                {essay.paragraphs.map((paragraph, index) => {
                  const parsed = parsePolishResult(paragraph.polishedText);
                  const isFirst = index === 0;
                  const isLast = index === essay.paragraphs.length - 1;

                  return (
                    <li
                      key={paragraph.id}
                      className="rounded-lg border border-accent bg-surface p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                          Paragraph {paragraph.order}
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <form action={moveParagraph}>
                            <input type="hidden" name="essayId" value={essay.id} />
                            <input
                              type="hidden"
                              name="paragraphId"
                              value={paragraph.id}
                            />
                            <input type="hidden" name="direction" value="up" />
                            <button
                              type="submit"
                              disabled={isFirst}
                              className="rounded-md border border-accent px-2.5 py-1 text-xs font-medium text-secondary hover:bg-surface-strong disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Move Up
                            </button>
                          </form>
                          <form action={moveParagraph}>
                            <input type="hidden" name="essayId" value={essay.id} />
                            <input
                              type="hidden"
                              name="paragraphId"
                              value={paragraph.id}
                            />
                            <input type="hidden" name="direction" value="down" />
                            <button
                              type="submit"
                              disabled={isLast}
                              className="rounded-md border border-accent px-2.5 py-1 text-xs font-medium text-secondary hover:bg-surface-strong disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Move Down
                            </button>
                          </form>
                          <CopyParagraphButton text={parsed.polishedParagraph} />
                          <form action={deleteParagraph}>
                            <input type="hidden" name="essayId" value={essay.id} />
                            <input
                              type="hidden"
                              name="paragraphId"
                              value={paragraph.id}
                            />
                            <ConfirmSubmitButton
                              label="Delete"
                              confirmMessage="Delete this paragraph? This cannot be undone."
                              className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                            />
                          </form>
                        </div>
                      </div>

                      <div className="mt-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
                          Polished Paragraph
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-zinc-800">
                          {parsed.polishedParagraph}
                        </p>
                      </div>

                      {parsed.explanation && (
                        <div className="mt-4 border-t border-zinc-200 pt-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
                            Explanation of Changes
                          </p>
                          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-zinc-700">
                            {parsed.explanation}
                          </p>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
