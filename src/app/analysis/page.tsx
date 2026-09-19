import Link from "next/link";
import { auth } from "@/auth";
import { AnalysisView } from "@/components/AnalysisView";
import { AnalyzeForm } from "@/components/AnalyzeForm";
import { analyzeProductUrl } from "@/lib/analyze";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ url?: string }>;
};

export default async function AnalysisPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const url = params.url?.trim();

  if (!url) {
    return (
      <div className="mx-auto max-w-3xl py-16">
        <h1 className="mb-4 font-[family-name:var(--font-display)] text-3xl font-semibold">
          Paste a product link to analyze
        </h1>
        <AnalyzeForm />
      </div>
    );
  }

  let analysis;
  let session;
  let existing = null;
  
  try {
    analysis = await analyzeProductUrl(url);
    session = await auth();
    if (session?.user?.id && analysis.id !== "unresolved") {
      existing = await prisma.alert.findUnique({
        where: {
          userId_productId: {
            userId: session.user.id,
            productId: analysis.id,
          },
        },
      });
    }
  } catch (error) {
    console.error("Analysis error:", error);
    return (
      <div className="mx-auto max-w-3xl py-16">
        <h1 className="mb-4 font-[family-name:var(--font-display)] text-3xl font-semibold">
          Analysis Failed
        </h1>
        <p className="text-[var(--muted)] mb-4">
          There was an error analyzing this product. Please try again later.
        </p>
        <Link
          href="/"
          className="inline-flex rounded-full border border-[var(--line)] bg-white/60 px-4 py-2 text-sm text-[var(--ink-soft)] transition hover:border-[var(--accent-deep)] hover:text-[var(--ink)]"
        >
          ← Back to home
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl py-6">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/"
          className="text-sm text-[var(--muted)] transition hover:text-[var(--ink)]"
        >
          ← Analyze another product
        </Link>
        <div className="w-full max-w-md">
          <AnalyzeForm initialUrl={url} compact />
        </div>
      </div>
      <AnalysisView
        analysis={analysis}
        signedIn={Boolean(session?.user)}
        existingThreshold={existing?.threshold}
      />
    </div>
  );
}
