import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import CopyParagraphButton from "./copy-paragraph-button";
import {
  OpenAIKeyMissingError,
  polishParagraphWithOpenAI,
  PromptInterpolationError,
} from "@/lib/openai";
import { prisma } from "@/lib/prisma";

type EssayDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; context?: string }>;
};

function parsePolishResult(storedText: string) {
  const normalized = storedText.trim();
  const polishedMatch = normalized.match(
    /<polished>\s*([\s\S]*?)\s*<\/polished>/i,
  );
  const explanationMatch = normalized.match(
    /<explanation>\s*([\s\S]*?)\s*<\/explanation>/i,
  );

  if (polishedMatch) {
    return {
      polishedParagraph: polishedMatch[1].trim(),
      explanation: explanationMatch ? explanationMatch[1].trim() : "",
    };
  }

  return {
    polishedParagraph: normalized
      .replace(/<\/?polished>/gi, "")
      .replace(/<\/?explanation>/gi, "")
      .trim(),
    explanation: "",
  };
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

  const lastParagraph = await prisma.paragraph.findFirst({
    where: { essayId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const nextOrder = lastParagraph ? lastParagraph.order + 1 : 1;
  const essayForPrompt = await prisma.essay.findUnique({
    where: { id: essayId },
    select: {
      title: true,
      contextNotes: true,
      paragraphs: {
        orderBy: { order: "asc" },
        select: { polishedText: true },
      },
    },
  });

  if (!essayForPrompt) {
    redirect("/");
  }

  const previousParagraphsContext = essayForPrompt.paragraphs
    .map((paragraph) => parsePolishResult(paragraph.polishedText).polishedParagraph)
    .filter((text) => text.length > 0)
    .join("\n\n");
  const savedEssayContext = essayForPrompt.contextNotes.trim();

  const context = [savedEssayContext, previousParagraphsContext]
    .filter((part) => part.length > 0)
    .join("\n\n");

  let polishedText: string;

  try {
    polishedText = await polishParagraphWithOpenAI({
      question: essayForPrompt.title,
      polish_paragraph: originalText,
      context,
    });
  } catch (error) {
    if (error instanceof OpenAIKeyMissingError) {
      redirect(`/essays/${essayId}?error=missing-openai-key`);
    }
    if (error instanceof PromptInterpolationError) {
      redirect(`/essays/${essayId}?error=invalid-prompt-variables`);
    }

    redirect(`/essays/${essayId}?error=polish-failed`);
  }

  await prisma.paragraph.create({
    data: {
      essayId,
      originalText,
      polishedText,
      order: nextOrder,
    },
  });

  redirect(`/essays/${essayId}`);
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

  await prisma.essay.update({
    where: { id: essayId },
    data: { contextNotes },
  });

  redirect(`/essays/${essayId}?context=saved`);
}

export default async function EssayDetailPage({
  params,
  searchParams,
}: EssayDetailPageProps) {
  const { id } = await params;
  const { error, context } = await searchParams;
  const essayId = Number(id);
  const errorMessage =
    error === "missing-paragraph"
      ? "Please enter a paragraph."
      : error === "missing-openai-key"
        ? "OpenAI API key is missing. Add OPENAI_API_KEY to your .env file."
        : error === "invalid-prompt-variables"
          ? "Prompt variables are missing or invalid. Check prompt placeholders."
        : error === "polish-failed"
          ? "Could not polish the paragraph right now. Please try again."
          : null;
  const contextMessage =
    context === "saved" ? "Context notes saved." : null;

  if (!Number.isInteger(essayId) || essayId <= 0) {
    notFound();
  }

  const essay = await prisma.essay.findUnique({
    where: { id: essayId },
    include: {
      paragraphs: {
        orderBy: { order: "asc" },
      },
    },
  });

  if (!essay) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-zinc-100/60 p-6 md:p-10">
      <section className="mx-auto w-full max-w-4xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm md:p-8">
        <Link href="/" className="text-sm text-zinc-600 hover:text-zinc-900">
          Back to Home
        </Link>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
            {essay.title}
          </h1>
          <Link
            href={`/essays/${essay.id}/delete`}
            className="inline-flex rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            Delete Essay
          </Link>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.15fr]">
          <div className="space-y-6">
            <form
              action={createParagraph}
              className="space-y-4 rounded-xl border border-zinc-200 bg-zinc-50/60 p-5"
            >
              <input type="hidden" name="essayId" value={essay.id} />
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-700">
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
                <p className="text-sm text-red-600">{errorMessage}</p>
              )}
              <button
                type="submit"
                className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
              >
                Polish Paragraph
              </button>
            </form>

            <form
              action={saveEssayContext}
              className="space-y-4 rounded-xl border border-zinc-200 bg-zinc-50/60 p-5"
            >
              <input type="hidden" name="essayId" value={essay.id} />
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-700">
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
                <p className="text-sm text-green-700">{contextMessage}</p>
              )}
              <button
                type="submit"
                className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100"
              >
                Save Context
              </button>
            </form>
          </div>

          <section className="rounded-xl border border-zinc-200 bg-white p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-700">
              Paragraph History
            </h2>
            {essay.paragraphs.length === 0 ? (
              <p className="mt-4 text-sm text-zinc-600">No polished paragraphs yet.</p>
            ) : (
              <ul className="mt-4 space-y-4">
                {essay.paragraphs.map((paragraph) => {
                  const parsed = parsePolishResult(paragraph.polishedText);

                  return (
                    <li
                      key={paragraph.id}
                      className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                          Paragraph {paragraph.order}
                        </p>
                        <CopyParagraphButton text={parsed.polishedParagraph} />
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
