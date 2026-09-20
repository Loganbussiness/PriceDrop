import Link from "next/link";
import { auth } from "@/auth";
import { AnalyzeForm } from "@/components/AnalyzeForm";
import { formatEuro } from "@/lib/analyze";
import { listStoredProducts } from "@/lib/history-store";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await auth();
  let tracked: any[] = [];
  let alerts: any[] = [];
  
  try {
    tracked = (await listStoredProducts()).slice(0, 6);
    if (session?.user?.id) {
      alerts = await prisma.alert.findMany({
        where: { userId: session.user.id },
        include: { product: { include: { snapshots: true } } },
        take: 6,
        orderBy: { createdAt: "desc" },
      });
    }
  } catch (error) {
    console.error("Database connection error:", error);
    // Continue with empty arrays - page will still load
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-7rem)] w-full max-w-3xl flex-col justify-center pb-16 pt-6">
      <section className="space-y-8">
        <div className="space-y-4">
          <p className="font-[family-name:var(--font-display)] text-5xl font-semibold tracking-tight text-[var(--ink)] sm:text-6xl">
            PriceDrop
          </p>
          <h1 className="max-w-xl text-2xl leading-snug text-[var(--ink-soft)] sm:text-3xl">
            What are you thinking about buying?
          </h1>
          <p className="max-w-lg text-base leading-relaxed text-[var(--muted)]">
            Paste a product link. We&apos;ll check the price against history and
            tell you whether to buy now, wait, or avoid.
          </p>
        </div>

        <AnalyzeForm />

        <div className="space-y-3 pt-2">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--muted)]">
            Try a demo link
          </p>
          <ul className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <li>
              <Link
                href="/demo/sony-wh-1000xm6"
                className="inline-flex rounded-full border border-[var(--line)] bg-white/60 px-4 py-2 text-sm text-[var(--ink-soft)] transition hover:border-[var(--accent-deep)] hover:text-[var(--ink)]"
              >
                Sony WH-1000XM6 (good price)
              </Link>
            </li>
            <li>
              <Link
                href="/demo/airpods-pro-2"
                className="inline-flex rounded-full border border-[var(--line)] bg-white/60 px-4 py-2 text-sm text-[var(--ink-soft)] transition hover:border-[var(--accent-deep)] hover:text-[var(--ink)]"
              >
                AirPods Pro (maybe wait)
              </Link>
            </li>
            <li>
              <Link
                href="/demo/fake-sale-headphones"
                className="inline-flex rounded-full border border-[var(--line)] bg-white/60 px-4 py-2 text-sm text-[var(--ink-soft)] transition hover:border-[var(--accent-deep)] hover:text-[var(--ink)]"
              >
                Ad headphones (fake sale)
              </Link>
            </li>
          </ul>
        </div>

        {alerts.length > 0 ? (
          <div className="space-y-3 border-t border-[var(--line)] pt-8">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--muted)]">
              Your watchlist
            </p>
            <ul className="space-y-2">
              {alerts.map((alert) => {
                const last = alert.product.snapshots.sort(
                  (a: any, b: any) =>
                    new Date(a.date).getTime() - new Date(b.date).getTime(),
                )[alert.product.snapshots.length - 1];
                return (
                  <li key={alert.id}>
                    <Link
                      href={`/history/${alert.productId}`}
                      className="flex items-center justify-between rounded-xl border border-[var(--line)] bg-white/50 px-4 py-3 text-sm hover:border-[var(--accent-deep)]"
                    >
                      <span className="font-medium text-[var(--ink)]">
                        {alert.product.name}
                      </span>
                      <span className="tabular-nums text-[var(--muted)]">
                        {last ? formatEuro(last.price) : "—"}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        {tracked.length > 0 ? (
          <div className="space-y-3 border-t border-[var(--line)] pt-8">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--muted)]">
              Recently analyzed
            </p>
            <ul className="space-y-2">
              {tracked.map((product: any) => {
                const last = product.snapshots[product.snapshots.length - 1];
                return (
                  <li key={product.id}>
                    <Link
                      href={`/history/${product.id}`}
                      className="flex items-center justify-between rounded-xl border border-[var(--line)] bg-white/50 px-4 py-3 text-sm hover:border-[var(--accent-deep)]"
                    >
                      <span className="font-medium text-[var(--ink)]">
                        {product.name}
                      </span>
                      <span className="tabular-nums text-[var(--muted)]">
                        {last ? formatEuro(last.price) : "—"}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </section>
    </div>
  );
}
