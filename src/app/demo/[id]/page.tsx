import { AnalysisView } from "@/components/AnalysisView";
import { CATALOG } from "@/lib/catalog";
import type { ProductAnalysis } from "@/lib/types";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function DemoPage({ params }: PageProps) {
  const { id } = await params;
  const product = CATALOG.find(p => p.id === id);
  
  if (!product) {
    return (
      <div className="mx-auto max-w-3xl py-16">
        <h1 className="mb-4 font-[family-name:var(--font-display)] text-3xl font-semibold">
          Demo Product Not Found
        </h1>
        <a href="/" className="text-[var(--ink)] underline">
          ← Back to home
        </a>
      </div>
    );
  }
  
  // Create a mock analysis from the catalog data
  const analysis: ProductAnalysis = {
    id: product.id,
    name: product.name,
    brand: product.brand,
    imageHint: product.imageHint,
    currency: "EUR",
    currentPrice: product.currentPrice,
    advertisedWas: product.advertisedWas,
    advertisedDiscountPct: product.advertisedDiscountPct,
    avg30: 0,
    avg90: 0,
    lowest: 0,
    highest: 0,
    recommendation: "BUY_NOW",
    headline: "Demo Product - Database connection required for full analysis",
    explanation: "This is a demo product showing the PriceDrop interface. Full price analysis requires database connectivity.",
    savingsVsTypical: 0,
    realSale: {
      isUnusual: false,
      label: "Demo data",
      detail: "This is demo data from the catalog."
    },
    whyNot: product.whyNot,
    score: {
      overall: 85,
      price: 80,
      history: 75,
      alternatives: 78,
      reviews: 89,
    },
    history: product.history,
    stores: product.stores,
    alternatives: product.alternatives,
    sourceUrl: product.stores[0]?.url || "",
    dataSource: "seeded-history",
    priceBehavior: "Demo data - no live price tracking",
  };
  
  return (
    <div className="mx-auto max-w-3xl py-6">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <a
          href="/"
          className="text-sm text-[var(--muted)] transition hover:text-[var(--ink)]"
        >
          ← Back to home
        </a>
        <div className="w-full max-w-md">
          <p className="text-sm text-[var(--muted)]">
            Demo Mode: {product.name}
          </p>
        </div>
      </div>
      <AnalysisView
        analysis={analysis}
        signedIn={false}
        existingThreshold={undefined}
      />
    </div>
  );
}