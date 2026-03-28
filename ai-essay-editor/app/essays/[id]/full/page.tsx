import Link from "next/link";
import { notFound } from "next/navigation";
import CopyParagraphButton from "../copy-paragraph-button";
import { getModuleTextColor, sanitizeModuleColor } from "@/lib/module-badge";
import { parsePolishResult } from "@/lib/polish-result";
import { prisma } from "@/lib/prisma";

type FullEssayPageProps = {
  params: Promise<{ id: string }>;
};

export default async function FullEssayPage({ params }: FullEssayPageProps) {
  const { id } = await params;
  const essayId = Number(id);

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

  const polishedParagraphs = essay.paragraphs
    .map((paragraph) => parsePolishResult(paragraph.polishedText).polishedParagraph)
    .filter((paragraph) => paragraph.length > 0);

  const fullEssayText = polishedParagraphs.join("\n\n");
  const hasFullEssay = fullEssayText.length > 0;

  return (
    <main className="min-h-screen bg-zinc-100/60 p-6 md:p-10">
      <section className="mx-auto w-full max-w-4xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Link href="/" className="text-zinc-600 hover:text-zinc-900">
            Home
          </Link>
          <span className="text-zinc-400">/</span>
          <Link href={`/essays/${essay.id}`} className="text-zinc-600 hover:text-zinc-900">
            Essay Detail
          </Link>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
              {essay.name}
            </h1>
            {essay.moduleName.trim() && (
              <span
                className="rounded-full px-3 py-1 text-xs font-medium"
                style={{
                  backgroundColor: sanitizeModuleColor(essay.moduleColor),
                  color: getModuleTextColor(essay.moduleColor),
                }}
              >
                {essay.moduleName}
              </span>
            )}
          </div>
          {hasFullEssay && (
            <CopyParagraphButton text={fullEssayText} idleLabel="Copy Full Essay" />
          )}
        </div>

        <p className="mt-3 whitespace-pre-wrap rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
          {essay.question}
        </p>

        {hasFullEssay ? (
          <article className="mt-6 whitespace-pre-wrap rounded-lg border border-zinc-200 bg-zinc-50/40 p-5 text-sm leading-7 text-zinc-800">
            {fullEssayText}
          </article>
        ) : (
          <div className="mt-6 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-8">
            <p className="text-zinc-700">No polished paragraphs yet.</p>
            <p className="mt-1 text-sm text-zinc-600">
              Add and polish paragraphs from the essay detail page, then come back
              to view the full essay.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
