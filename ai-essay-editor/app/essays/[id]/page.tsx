import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

type EssayDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EssayDetailPage({ params }: EssayDetailPageProps) {
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

  return (
    <main className="min-h-screen bg-zinc-50 p-6 md:p-10">
      <section className="mx-auto w-full max-w-3xl rounded-xl border border-zinc-200 bg-white p-6 shadow-sm md:p-8">
        <Link href="/" className="text-sm text-zinc-600 hover:text-zinc-900">
          Back to Home
        </Link>
        <h1 className="mt-3 text-3xl font-semibold text-zinc-900">{essay.title}</h1>

        {essay.paragraphs.length === 0 ? (
          <p className="mt-6 text-zinc-600">No paragraphs added yet.</p>
        ) : (
          <ul className="mt-6 space-y-4">
            {essay.paragraphs.map((paragraph) => (
              <li key={paragraph.id} className="rounded-lg border border-zinc-200 p-4">
                <p className="text-sm font-medium text-zinc-500">
                  Paragraph {paragraph.order}
                </p>
                <p className="mt-2 text-zinc-800">{paragraph.originalText}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
