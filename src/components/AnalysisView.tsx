import Link from "next/link";
import { formatEuro } from "@/lib/money";
import type { ProductAnalysis } from "@/lib/types";
import { PriceAlertForm } from "./PriceAlertForm";
import { PriceHistoryChart } from "./PriceHistoryChart";
import { RecommendationBadge } from "./RecommendationBadge";
import { ScoreBreakdown } from "./ScoreBreakdown";

export function AnalysisView({
  analysis,
  signedIn,
  existingThreshold,
}: {
  analysis: ProductAnalysis;
  signedIn: boolean;
  existingThreshold?: number;
}) {
  if (analysis.dataSource === "unresolved") {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-8 pb-20">
        <header className="space-y-4">
          <h1 className="font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight">
            {analysis.name}
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-[var(--ink-soft)]">
            {analysis.explanation}
          </p>
        </header>
        <ol className="space-y-3">
          {analysis.whyNot.map((reason, i) => (
            <li key={reason} className="flex gap-3 text-[var(--ink-soft)]">
              <span className="font-semibold text-[var(--avoid)]">{i + 1}.</span>
              <span>{reason}</span>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  const bestStore = [...analysis.stores].sort((a, b) => a.price - b.price)[0];
  const savingsAtBest =
    bestStore && bestStore.price < analysis.currentPrice
      ? analysis.currentPrice - bestStore.price
      : 0;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-10 pb-20">
      <header className="space-y-5">
        <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted)]">
          {analysis.brand}
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight text-[var(--ink)] sm:text-5xl">
          {analysis.name}
        </h1>
        <div className="flex flex-wrap items-end gap-4">
          <p className="font-[family-name:var(--font-display)] text-5xl font-semibold text-[var(--ink)]">
            {formatEuro(analysis.currentPrice)}
          </p>
          {analysis.advertisedWas ? (
            <p className="pb-1 text-lg text-[var(--muted)] line-through">
              {formatEuro(analysis.advertisedWas)}
            </p>
          ) : null}
        </div>
        <RecommendationBadge recommendation={analysis.recommendation} large />
        <p className="max-w-2xl text-lg leading-relaxed text-[var(--ink-soft)]">
          {analysis.headline}
        </p>
        <p className="text-xs text-[var(--muted)]">
          Data: {analysis.dataSource.replace("+", " + ")}
          {analysis.id !== "unresolved" ? (
            <>
              {" · "}
              <Link
                href={`/history/${analysis.id}`}
                className="underline decoration-[var(--line)] underline-offset-4 hover:text-[var(--ink)]"
              >
                Full price history
              </Link>
            </>
          ) : null}
        </p>
      </header>

      <section className="grid gap-8 border-t border-[var(--line)] pt-8 sm:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
            Why?
          </h2>
          <dl className="grid gap-3 text-base text-[var(--ink)]">
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--muted)]">Current price</dt>
              <dd className="font-medium">{formatEuro(analysis.currentPrice)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--muted)]">30-day average</dt>
              <dd className="font-medium">{formatEuro(analysis.avg30)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--muted)]">90-day average</dt>
              <dd className="font-medium">{formatEuro(analysis.avg90)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--muted)]">Lowest recorded</dt>
              <dd className="font-medium">{formatEuro(analysis.lowest)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--muted)]">Highest recorded</dt>
              <dd className="font-medium">{formatEuro(analysis.highest)}</dd>
            </div>
          </dl>
          <p className="text-base leading-relaxed text-[var(--ink-soft)]">
            {analysis.explanation}
          </p>
          {analysis.savingsVsTypical > 0 ? (
            <p className="text-base font-medium text-[var(--buy)]">
              Your savings vs typical price: ~{formatEuro(analysis.savingsVsTypical)}
            </p>
          ) : analysis.potentialWaitSavings ? (
            <p className="text-base font-medium text-[var(--wait)]">
              Potential savings by waiting: ~{formatEuro(analysis.potentialWaitSavings)}
            </p>
          ) : null}
        </div>
        <ScoreBreakdown score={analysis.score} />
      </section>

      <section className="space-y-4 border-t border-[var(--line)] pt-8">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
          Real sale check
        </h2>
        <div
          className={`rounded-2xl border px-5 py-4 ${
            analysis.realSale.isUnusual
              ? "border-[var(--buy)]/30 bg-[var(--buy-soft)]"
              : "border-[var(--wait)]/40 bg-[var(--wait-soft)]"
          }`}
        >
          <p className="font-semibold text-[var(--ink)]">
            {analysis.realSale.isUnusual ? "✓" : "⚠️"} {analysis.realSale.label}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--ink-soft)]">
            {analysis.realSale.detail}
          </p>
        </div>
      </section>

      {analysis.history.length > 0 ? (
        <section className="space-y-4 border-t border-[var(--line)] pt-8">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
            Price history
          </h2>
          <PriceHistoryChart
            history={analysis.history}
            currentPrice={analysis.currentPrice}
          />
          <p className="text-sm leading-relaxed text-[var(--ink-soft)]">
            {analysis.priceBehavior}
            {analysis.lastMajorDropDays != null
              ? ` Last major drop: ${analysis.lastMajorDropDays} day${analysis.lastMajorDropDays === 1 ? "" : "s"} ago.`
              : ""}
          </p>
        </section>
      ) : null}

      <section className="space-y-4 border-t border-[var(--line)] pt-8">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
          Best price right now
        </h2>
        <ul className="divide-y divide-[var(--line)] overflow-hidden rounded-2xl border border-[var(--line)] bg-white/60">
          {analysis.stores
            .slice()
            .sort((a, b) => a.price - b.price)
            .map((store) => (
              <li key={store.store} className="text-sm">
                {store.url ? (
                  <a
                    href={store.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-4 px-5 py-3 text-[var(--ink)] transition hover:bg-white/80"
                  >
                    <span>{store.store}</span>
                    <span className="font-semibold tabular-nums">
                      {formatEuro(store.price)}
                    </span>
                  </a>
                ) : (
                  <div className="flex items-center justify-between gap-4 px-5 py-3">
                    <span className="text-[var(--ink)]">{store.store}</span>
                    <span className="font-semibold tabular-nums">
                      {formatEuro(store.price)}
                    </span>
                  </div>
                )}
              </li>
            ))}
        </ul>
        {savingsAtBest > 0 && bestStore ? (
          <p className="text-sm text-[var(--buy)]">
            Best verified price: {formatEuro(bestStore.price)}. Save{" "}
            {formatEuro(savingsAtBest)} by buying from {bestStore.store}.
          </p>
        ) : null}
      </section>

      {analysis.alternatives.length > 0 ? (
        <section className="space-y-4 border-t border-[var(--line)] pt-8">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
            Is there something better for the same money?
          </h2>
          <ul className="space-y-3">
            {analysis.alternatives.map((alt) => (
              <li
                key={alt.name}
                className="rounded-2xl border border-[var(--line)] bg-white/60 px-5 py-4"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-semibold text-[var(--ink)]">{alt.name}</p>
                  <p className="font-semibold tabular-nums">
                    {formatEuro(alt.price)}
                  </p>
                </div>
                <p className="mt-1 text-sm text-[var(--muted)]">{alt.note}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-4 border-t border-[var(--line)] pt-8">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
          Why shouldn&apos;t I buy this?
        </h2>
        <ol className="space-y-3">
          {analysis.whyNot.map((reason, i) => (
            <li key={reason} className="flex gap-3 text-[var(--ink-soft)]">
              <span className="font-semibold text-[var(--avoid)]">{i + 1}.</span>
              <span>{reason}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="grid gap-4 border-t border-[var(--line)] pt-8 sm:grid-cols-2">
        {bestStore?.url ? (
          <a
            href={bestStore.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-14 items-center justify-center rounded-xl bg-[var(--ink)] px-5 text-center font-semibold text-white transition hover:bg-[var(--ink-soft)]"
          >
            Find at {bestStore.store} · {formatEuro(bestStore.price)}
          </a>
        ) : null}
        <div className="sm:col-span-2">
          <PriceAlertForm
            productId={analysis.id}
            productName={analysis.name}
            productBrand={analysis.brand}
            suggested={analysis.lowest}
            signedIn={signedIn}
            existingThreshold={existingThreshold}
          />
        </div>
      </section>

      <p className="text-center text-xs text-[var(--muted)]">
        {analysis.dataSource === "seeded-history"
          ? "History is seeded demo data until a live price can be read from the page."
            : analysis.dataSource === "live+history"
              ? "Current price was read from the page and stored in shared history."
              : analysis.dataSource === "tracked"
                ? "Showing stored snapshots from the shared PriceDrop database."
                : "No reliable live price. Retailer access is the hard part — this MVP records what it can."}
      </p>
    </div>
  );
}
