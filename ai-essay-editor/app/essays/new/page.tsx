import Link from "next/link";

export default function NewEssayPage() {
  return (
    <main className="min-h-screen bg-zinc-50 p-6 md:p-10">
      <section className="mx-auto w-full max-w-2xl rounded-xl border border-zinc-200 bg-white p-6 shadow-sm md:p-8">
        <h1 className="text-2xl font-semibold text-zinc-900">New Essay</h1>
        <p className="mt-2 text-zinc-600">
          Essay creation form will go here in the next step.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100"
        >
          Back to Home
        </Link>
      </section>
    </main>
  );
}
