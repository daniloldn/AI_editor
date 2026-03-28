import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

type EssayDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

function createPlaceholderPolish(originalText: string) {
  return `Polished placeholder (OpenAI not connected yet):\n\n${originalText}`;
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
  const polishedText = createPlaceholderPolish(originalText);

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

export default async function EssayDetailPage({
  params,
  searchParams,
}: EssayDetailPageProps) {
  const { id } = await params;
  const { error } = await searchParams;
  const essayId = Number(id);
  const showParagraphError = error === "missing-paragraph";

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
    <main className="min-h-screen bg-zinc-50 p-6 md:p-10">
      <section className="mx-auto w-full max-w-3xl rounded-xl border border-zinc-200 bg-white p-6 shadow-sm md:p-8">
        <Link href="/" className="text-sm text-zinc-600 hover:text-zinc-900">
          Back to Home
        </Link>
        <h1 className="mt-3 text-3xl font-semibold text-zinc-900">{essay.title}</h1>

        <form action={createParagraph} className="mt-6 space-y-3 rounded-lg border border-zinc-200 p-4">
          <input type="hidden" name="essayId" value={essay.id} />
          <label
            htmlFor="paragraph"
            className="block text-sm font-medium text-zinc-700"
          >
            New Paragraph
          </label>
          <textarea
            id="paragraph"
            name="paragraph"
            rows={6}
            placeholder="Write your paragraph here..."
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 outline-none ring-zinc-400 focus:ring-2"
          />
          {showParagraphError && (
            <p className="text-sm text-red-600">Please enter a paragraph.</p>
          )}
          <button
            type="submit"
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            Polish Paragraph
          </button>
        </form>

        {essay.paragraphs.length === 0 ? (
          <p className="mt-6 text-zinc-600">No polished paragraphs yet.</p>
        ) : (
          <ul className="mt-6 space-y-4">
            {essay.paragraphs.map((paragraph) => (
              <li key={paragraph.id} className="rounded-lg border border-zinc-200 p-4">
                <p className="text-sm font-medium text-zinc-500">
                  Paragraph {paragraph.order}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-zinc-800">
                  {paragraph.polishedText}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
