import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { AnalyzeForm } from "@/components/AnalyzeForm";
import { PriceAlertForm } from "@/components/PriceAlertForm";
import { PriceHistoryChart } from "@/components/PriceHistoryChart";
import { analyzeStoredProduct } from "@/lib/analyze";
import { formatEuro } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function HistoryPage({ params }: PageProps) {
  const { id } = await params;
  const analysis = await analyzeStoredProduct(id);
  if (!analysis) notFound();
  const session = await auth();
  const existing = session?.user?.id
    ? await prisma.alert.findUnique({
        where: {
          userId_productId: { userId: session.user.id, productId: analysis.id },
        },
      })
    : null;

  return (
    <div className="mx-auto max-w-3xl space-y-8 py-6 pb-20">
      <Link
        href={
          analysis.sourceUrl
            ? `/analysis?url=${encodeURIComponent(analysis.sourceUrl)}`
            : "/"
        }
        className="text-sm text-[var(--muted)] hover:text-[var(--ink)]"
      >
        ← Back to analysis
      </Link>

      <header className="space-y-2">
        <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted)]">
          Price history
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight">
          {analysis.name}
        </h1>
        <p className="text-3xl font-semibold">{formatEuro(analysis.currentPrice)}</p>
      </header>

      <dl className="grid gap-3 text-base">
        <div className="flex justify-between">
          <dt className="text-[var(--muted)]">30-day average</dt>
          <dd className="font-medium">{formatEuro(analysis.avg30)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-[var(--muted)]">90-day average</dt>
          <dd className="font-medium">{formatEuro(analysis.avg90)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-[var(--muted)]">Lowest</dt>
          <dd className="font-medium">{formatEuro(analysis.lowest)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-[var(--muted)]">Highest</dt>
          <dd className="font-medium">{formatEuro(analysis.highest)}</dd>
        </div>
      </dl>

      <PriceHistoryChart
        history={analysis.history}
        currentPrice={analysis.currentPrice}
      />

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
          Price behavior
        </h2>
        <p className="text-[var(--ink-soft)]">{analysis.priceBehavior}</p>
        {analysis.lastMajorDropDays != null ? (
          <p className="text-sm text-[var(--muted)]">
            Last major drop: {analysis.lastMajorDropDays} days ago
          </p>
        ) : null}
      </section>

      <PriceAlertForm
        productId={analysis.id}
        productName={analysis.name}
        productBrand={analysis.brand}
        suggested={analysis.lowest}
        signedIn={Boolean(session?.user)}
        existingThreshold={existing?.threshold}
      />

      <div className="pt-4">
        <p className="mb-3 text-sm text-[var(--muted)]">Analyze another product</p>
        <AnalyzeForm />
      </div>
    </div>
  );
}
