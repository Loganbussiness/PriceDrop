import { fetchListing } from "./fetch-listing";
import { appendSnapshot, getStoredProduct, snapshotsToPoints } from "./history-store";
import { sendPriceDropEmail } from "./email";
import { prisma } from "./prisma";

/**
 * Background price watcher.
 *
 * - Finds every ACTIVE alert, grouped by product (oldest-checked first)
 * - Fetches a fresh price for products not checked within MIN_CHECK_INTERVAL (24h)
 * - Appends a snapshot when the price actually moved
 * - Triggers alerts when price <= threshold OR when the drop since the last
 *   snapshot meets dropPercent — respecting each alert's cooldown
 */

export const MIN_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // don't re-check a product more often than every 24h
export const MAX_PRODUCTS_PER_RUN = 12; // keep Vercel Hobby (10s) execution budget in mind
export const FETCH_GAP_MS = 400; // per-host gap for cron runs (cron itself is infrequent, so politeness is cheaper here)

export type WatchRunResult = {
  alertsTotal: number;
  productsChecked: number;
  productsSkippedRecent: number;
  productsUnfetchable: number;
  snapshotsAdded: number;
  alertsTriggered: number;
  emailsSent: number;
  errors: number;
};

export async function runPriceWatch(): Promise<WatchRunResult> {
  const result: WatchRunResult = {
    alertsTotal: 0,
    productsChecked: 0,
    productsSkippedRecent: 0,
    productsUnfetchable: 0,
    snapshotsAdded: 0,
    alertsTriggered: 0,
    emailsSent: 0,
    errors: 0,
  };

  const alerts = await prisma.alert.findMany({
    where: { active: true },
    include: { product: true, user: true },
    orderBy: { lastNotifiedAt: "asc" },
  });

  result.alertsTotal = alerts.length;
  if (alerts.length === 0) return result;

  // Group alerts by product, preserving order (oldest-checked first)
  const byProduct = new Map<string, typeof alerts>();
  for (const alert of alerts) {
    const list = byProduct.get(alert.productId);
    if (list) list.push(alert);
    else byProduct.set(alert.productId, [alert]);
  }

  // Determine which products are due for a check, oldest-checked first
  const candidates: { productId: string; sourceUrl: string | null }[] = [];
  for (const [productId, productAlerts] of byProduct) {
    const product = productAlerts[0].product;
    if (!product.sourceUrl) {
      result.productsUnfetchable += 1;
      continue;
    }
    const stored = await getStoredProduct(productId);
    const lastSnapshot = stored?.snapshots[stored.snapshots.length - 1];
    if (lastSnapshot && Date.now() - lastSnapshot.date.getTime() < MIN_CHECK_INTERVAL_MS) {
      result.productsSkippedRecent += 1;
      continue;
    }
    candidates.push({ productId, sourceUrl: product.sourceUrl });
    if (candidates.length >= MAX_PRODUCTS_PER_RUN) break;
  }

  for (const candidate of candidates) {
    try {
      const listing = await fetchListing(candidate.sourceUrl!, {
        gapMs: FETCH_GAP_MS,
      });

      if (!listing?.price) {
        result.productsUnfetchable += 1;
        continue;
      }

      result.productsChecked += 1;

      // Previous price (before this run) for drop-% evaluation
      const storedBefore = await getStoredProduct(candidate.productId);
      const previousPrice = storedBefore?.snapshots[storedBefore.snapshots.length - 1]?.price;

      // Append a snapshot only when the price actually moved
      if (previousPrice == null || Math.abs(previousPrice - listing.price) > 0.001) {
        const product = byProduct.get(candidate.productId)![0].product;
        await appendSnapshot({
          id: candidate.productId,
          name: product.name,
          brand: product.brand,
          price: listing.price,
          sourceUrl: candidate.sourceUrl ?? undefined,
          source: "watcher",
        });
        result.snapshotsAdded += 1;
      }

      // Evaluate every alert on this product
      const productAlerts = byProduct.get(candidate.productId)!;
      for (const alert of productAlerts) {
        const triggeredByThreshold = listing.price <= alert.threshold;
        const triggeredByDrop =
          alert.dropPercent != null &&
          previousPrice != null &&
          previousPrice > 0 &&
          (previousPrice - listing.price) / previousPrice >= alert.dropPercent / 100;

        if (!triggeredByThreshold && !triggeredByDrop) continue;

        // Cooldown check
        const cooldownMs = (alert.cooldownHours ?? 12) * 60 * 60 * 1000;
        const lastNotified = alert.lastNotifiedAt?.getTime() ?? 0;
        if (Date.now() - lastNotified < cooldownMs) continue;

        const emailResult = await sendPriceDropEmail(alert.user.email, {
          productName: alert.product.name,
          productBrand: alert.product.brand,
          price: listing.price,
          threshold: alert.threshold,
          url: alert.product.sourceUrl,
        });

        await prisma.alert.update({
          where: { id: alert.id },
          data: { lastNotifiedAt: new Date() },
        });

        result.alertsTriggered += 1;
        if (emailResult.sent) result.emailsSent += 1;
      }
    } catch (error) {
      console.error(`[watcher] error checking product ${candidate.productId}:`, error);
      result.errors += 1;
    }
  }

  console.log("[watcher] run complete:", JSON.stringify(result));
  return result;
}

/** Re-exported for convenience in tests / scripts */
export { snapshotsToPoints };
