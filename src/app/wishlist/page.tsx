import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { formatEuro } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function WishlistPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const alerts = await prisma.alert.findMany({
    where: { userId: session.user.id },
    include: { product: { include: { snapshots: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-3xl py-10 pb-20">
      <h1 className="font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight">
        Wishlist
      </h1>
      <p className="mt-2 text-[var(--muted)]">
        Products you asked PriceDrop to watch.
      </p>

      {alerts.length === 0 ? (
        <p className="mt-10 text-[var(--ink-soft)]">
          Nothing tracked yet. Analyze a product and set an alert.
        </p>
      ) : (
        <ul className="mt-8 space-y-3">
          {alerts.map((alert) => {
            const snaps = alert.product.snapshots
              .slice()
              .sort(
                (a, b) =>
                  new Date(a.date).getTime() - new Date(b.date).getTime(),
              );
            const last = snaps[snaps.length - 1];
            const current = last?.price;
            const status =
              current == null
                ? { label: "Waiting for a price", tone: "text-[var(--muted)]" }
                : current <= alert.threshold
                  ? { label: "Good price", tone: "text-[var(--buy)]" }
                  : { label: "Waiting", tone: "text-[var(--wait)]" };

            return (
              <li key={alert.id}>
                <Link
                  href={`/history/${alert.productId}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--line)] bg-white/60 px-5 py-4 hover:border-[var(--accent-deep)]"
                >
                  <div>
                    <p className="font-semibold text-[var(--ink)]">
                      {alert.product.name}
                    </p>
                    <p className={`text-sm ${status.tone}`}>{status.label}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-semibold tabular-nums">
                      {current != null ? formatEuro(current) : "—"}
                    </p>
                    <p className="text-[var(--muted)]">
                      Alert below {formatEuro(alert.threshold)}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
