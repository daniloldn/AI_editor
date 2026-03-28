import Link from "next/link";
import { notFound } from "next/navigation";
import CopyParagraphButton from "../copy-paragraph-button";
import { getModuleTextColor, sanitizeModuleColor } from "@/lib/module-badge";
import { parsePolishResult } from "@/lib/polish-result";
import { prisma } from "@/lib/prisma";

type ViewMode = "polished" | "original" | "compare";

type FullEssayPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string }>;
};

type DiffPiece = {
  text: string;
  status: "common" | "removed" | "added";
};

function splitWords(text: string) {
  return text.trim().split(/\s+/).filter((word) => word.length > 0);
}

function buildDiffPieces(original: string, polished: string) {
  const a = splitWords(original);
  const b = splitWords(polished);
  const dp: number[][] = Array.from({ length: a.length + 1 }, () =>
    Array.from({ length: b.length + 1 }, () => 0),
  );

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const operations: DiffPiece[] = [];
  let i = a.length;
  let j = b.length;

  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      operations.push({ text: a[i - 1], status: "common" });
      i -= 1;
      j -= 1;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      operations.push({ text: a[i - 1], status: "removed" });
      i -= 1;
    } else {
      operations.push({ text: b[j - 1], status: "added" });
      j -= 1;
    }
  }

  while (i > 0) {
    operations.push({ text: a[i - 1], status: "removed" });
    i -= 1;
  }

  while (j > 0) {
    operations.push({ text: b[j - 1], status: "added" });
    j -= 1;
  }

  operations.reverse();

  return {
    originalPieces: operations.filter(
      (piece) => piece.status === "common" || piece.status === "removed",
    ),
    polishedPieces: operations.filter(
      (piece) => piece.status === "common" || piece.status === "added",
    ),
  };
}

function viewFromQuery(value: string | undefined): ViewMode {
  if (value === "original" || value === "compare" || value === "polished") {
    return value;
  }
  return "polished";
}

export default async function FullEssayPage({
  params,
  searchParams,
}: FullEssayPageProps) {
  const { id } = await params;
  const { view } = await searchParams;
  const selectedView = viewFromQuery(view);
  const essayId = Number(id);

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
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Link href="/" className="text-zinc-600 hover:text-zinc-900">
              Home
            </Link>
          </div>
          <p className="mt-3 text-sm text-red-700">
            Could not load this full essay view right now. Please refresh and try
            again.
          </p>
        </section>
      </main>
    );
  }

  if (!essay) {
    notFound();
  }

  const polishedParagraphs = essay.paragraphs
    .map((paragraph) => parsePolishResult(paragraph.polishedText).polishedParagraph)
    .filter((paragraph) => paragraph.length > 0);
  const originalParagraphs = essay.paragraphs
    .map((paragraph) => paragraph.originalText.trim())
    .filter((paragraph) => paragraph.length > 0);

  const polishedFullEssayText = polishedParagraphs.join("\n\n");
  const originalFullEssayText = originalParagraphs.join("\n\n");
  const hasPolishedEssay = polishedFullEssayText.length > 0;
  const hasOriginalEssay = originalFullEssayText.length > 0;
  const referencesText = essay.references;
  const hasReferences = referencesText.trim().length > 0;

  const polishedCopyTextWithReferences =
    hasReferences && hasPolishedEssay
      ? `${polishedFullEssayText}\n\nReferences\n${referencesText}`
      : polishedFullEssayText;

  const copyText = selectedView === "original"
    ? originalFullEssayText
    : polishedCopyTextWithReferences;
  const copyLabel =
    selectedView === "original" ? "Copy Original Essay" : "Copy Full Essay";

  return (
    <main className="min-h-screen bg-surface p-6 md:p-10">
      <section className="mx-auto w-full max-w-4xl rounded-2xl border border-accent bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Link href="/" className="text-zinc-600 hover:text-zinc-900">
            Home
          </Link>
          <span className="text-zinc-400">/</span>
          <Link href={`/essays/${essay.id}`} className="text-zinc-600 hover:text-zinc-900">
            Essay Detail
          </Link>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
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
          {(selectedView === "original" ? hasOriginalEssay : hasPolishedEssay) && (
            <CopyParagraphButton text={copyText} idleLabel={copyLabel} />
          )}
        </div>

        <p className="mt-3 whitespace-pre-wrap rounded-lg border border-accent bg-surface p-3 text-sm text-zinc-700">
          {essay.question}
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href={`/essays/${essay.id}/full?view=polished`}
            className={`rounded-md border px-3 py-1.5 text-sm font-medium ${
              selectedView === "polished"
                ? "border-primary bg-primary text-white"
                : "border-accent text-secondary hover:bg-surface-strong"
            }`}
          >
            Polished View
          </Link>
          <Link
            href={`/essays/${essay.id}/full?view=original`}
            className={`rounded-md border px-3 py-1.5 text-sm font-medium ${
              selectedView === "original"
                ? "border-primary bg-primary text-white"
                : "border-accent text-secondary hover:bg-surface-strong"
            }`}
          >
            Original View
          </Link>
          <Link
            href={`/essays/${essay.id}/full?view=compare`}
            className={`rounded-md border px-3 py-1.5 text-sm font-medium ${
              selectedView === "compare"
                ? "border-primary bg-primary text-white"
                : "border-accent text-secondary hover:bg-surface-strong"
            }`}
          >
            Compare View
          </Link>
        </div>

        {selectedView === "polished" && hasPolishedEssay && (
          <article className="mt-6 whitespace-pre-wrap rounded-lg border border-accent bg-surface p-5 text-sm leading-7 text-zinc-800">
            {polishedFullEssayText}
          </article>
        )}

        {selectedView === "original" && hasOriginalEssay && (
          <article className="mt-6 whitespace-pre-wrap rounded-lg border border-accent bg-surface p-5 text-sm leading-7 text-zinc-800">
            {originalFullEssayText}
          </article>
        )}

        {selectedView === "compare" && hasPolishedEssay && (
          <div className="mt-6 space-y-4">
            {essay.paragraphs.map((paragraph) => {
              const parsed = parsePolishResult(paragraph.polishedText);
              const polished = parsed.polishedParagraph;
              const explanation = parsed.explanation.trim();
              const original = paragraph.originalText.trim();
              const { originalPieces, polishedPieces } = buildDiffPieces(
                original,
                polished,
              );

              return (
                <section
                  key={paragraph.id}
                  className="rounded-lg border border-accent bg-white"
                >
                  <div className="border-b border-accent px-4 py-2 text-xs font-semibold uppercase tracking-wide text-secondary">
                    Paragraph {paragraph.order}
                  </div>
                  <div className="grid gap-0 md:grid-cols-2">
                    <div className="border-b border-accent p-4 md:border-b-0 md:border-r">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">
                        Original
                      </p>
                      <p className="text-sm leading-7 text-zinc-800">
                        {originalPieces.length > 0 ? (
                          originalPieces.map((piece, index) => (
                            <span
                              key={`o-${paragraph.id}-${index}`}
                              title={
                                piece.status === "removed" && explanation
                                  ? explanation
                                  : undefined
                              }
                              className={
                                piece.status === "removed"
                                  ? "rounded bg-red-100 text-red-800 line-through"
                                  : ""
                              }
                            >
                              {(index > 0 ? " " : "") + piece.text}
                            </span>
                          ))
                        ) : (
                          <span className="text-zinc-400">(empty)</span>
                        )}
                      </p>
                    </div>
                    <div className="p-4">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">
                        Polished
                      </p>
                      <p className="text-sm leading-7 text-zinc-800">
                        {polishedPieces.length > 0 ? (
                          polishedPieces.map((piece, index) => (
                            <span
                              key={`p-${paragraph.id}-${index}`}
                              title={
                                piece.status === "added" && explanation
                                  ? explanation
                                  : undefined
                              }
                              className={
                                piece.status === "added"
                                  ? "rounded bg-green-100 text-green-800"
                                  : ""
                              }
                            >
                              {(index > 0 ? " " : "") + piece.text}
                            </span>
                          ))
                        ) : (
                          <span className="text-zinc-400">(empty)</span>
                        )}
                      </p>
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {((selectedView === "polished" && !hasPolishedEssay) ||
          (selectedView === "compare" && !hasPolishedEssay) ||
          (selectedView === "original" && !hasOriginalEssay)) && (
          <div className="mt-6 rounded-lg border border-dashed border-accent bg-surface p-8">
            <p className="text-zinc-700">No polished paragraphs yet.</p>
            <p className="mt-1 text-sm text-zinc-600">
              Add and polish paragraphs from the essay detail page, then come back
              to view the full essay.
            </p>
          </div>
        )}

        {hasReferences && (
          <section className="mt-6 rounded-lg border border-accent bg-surface p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-secondary">
              References
            </h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-zinc-800">
              {referencesText}
            </p>
          </section>
        )}
      </section>
    </main>
  );
}
