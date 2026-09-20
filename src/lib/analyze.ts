import { CATALOG, type CatalogProduct, matchCatalog } from "./catalog";
import { fetchListing } from "./fetch-listing";
import {
  appendSnapshot,
  getStoredProduct,
  seedHistory,
  snapshotsToPoints,
} from "./history-store";
import {
  average,
  decideRecommendation,
  dropCount,
  extremes,
  lastMajorDrop,
  realSaleFrom,
  scoreFrom,
} from "./recommend";
import type { ProductAnalysis } from "./types";

export { DEMO_LINKS } from "./catalog";
export { formatEuro } from "./money";

export function productIdFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const asin = u.pathname.match(/\/dp\/([A-Z0-9]{10})/i);
    if (asin) return `asin-${asin[1].toUpperCase()}`;
    const key = `${u.hostname}${u.pathname}`.toLowerCase();
    let h = 0;
    for (let i = 0; i < key.length; i++) {
      h = (h * 31 + key.charCodeAt(i)) >>> 0;
    }
    return `url-${h.toString(16)}`;
  } catch {
    return "url-unknown";
  }
}

function isLikelyProductPage(url: string): boolean {
  try {
    return /\/(dp|gp\/product)\//i.test(new URL(url).pathname);
  } catch {
    return false;
  }
}

function priceBehavior(history: ProductAnalysis["history"]): string {
  if (history.length < 3) {
    return "Not enough samples yet. Each analysis adds a snapshot so the curve fills in over time.";
  }
  const drops = dropCount(history);
  if (drops >= 2) {
    return "This product typically falls in price every few months.";
  }
  return "Prices have been relatively stable across the samples we have.";
}

function assemble(input: {
  id: string;
  name: string;
  brand: string;
  imageHint: string;
  currentPrice: number;
  advertisedWas?: number;
  advertisedDiscountPct?: number;
  history: ProductAnalysis["history"];
  stores: ProductAnalysis["stores"];
  alternatives: ProductAnalysis["alternatives"];
  whyNot: string[];
  sourceUrl: string;
  dataSource: ProductAnalysis["dataSource"];
}): ProductAnalysis {
  const { lowest, highest } = extremes(input.history);
  const avg30 = average(input.history, 30);
  const avg90 = average(input.history, 90);
  const drop = lastMajorDrop(input.history);
  const decision = decideRecommendation({
    current: input.currentPrice,
    avg90,
    lowest,
    advertisedDiscountPct: input.advertisedDiscountPct,
    sampleCount: input.history.length,
  });
  const score = scoreFrom({
    current: input.currentPrice,
    avg90,
    lowest,
    recommendation: decision.recommendation,
  });
  const sale = realSaleFrom({
    current: input.currentPrice,
    avg90,
    advertisedWas: input.advertisedWas,
  });

  return {
    ...input,
    currency: "EUR",
    avg30,
    avg90,
    lowest,
    highest,
    ...decision,
    realSale: sale,
    score,
    lastMajorDropDays: drop?.daysAgo,
    priceBehavior: priceBehavior(input.history),
  };
}

function withSourceUrl(product: CatalogProduct, sourceUrl: string) {
  const stores = product.stores.map((store) => {
    if (store.store.toLowerCase().includes("amazon") && isLikelyProductPage(sourceUrl)) {
      return { ...store, url: sourceUrl };
    }
    return store;
  });
  return { ...product, stores };
}

async function fromCatalog(
  product: CatalogProduct,
  sourceUrl: string,
  dataSource: ProductAnalysis["dataSource"],
  currentOverride?: number,
): Promise<ProductAnalysis> {
  const stored = await getStoredProduct(product.id);
  const history = stored ? snapshotsToPoints(stored) : product.history;
  const currentPrice =
    currentOverride ?? history[history.length - 1]?.price ?? product.currentPrice;
  const mapped = withSourceUrl(product, sourceUrl);

  return assemble({
    id: product.id,
    name: product.name,
    brand: product.brand,
    imageHint: product.imageHint,
    currentPrice,
    advertisedWas: product.advertisedWas,
    advertisedDiscountPct: product.advertisedDiscountPct,
    history,
    stores: mapped.stores,
    alternatives: product.alternatives,
    whyNot: product.whyNot,
    sourceUrl,
    dataSource,
  });
}

async function analyzeCatalog(
  product: CatalogProduct,
  sourceUrl: string,
  livePrice?: number,
): Promise<ProductAnalysis> {
  await seedHistory({
    id: product.id,
    name: product.name,
    brand: product.brand,
    history: product.history,
    sourceUrl,
  });

  if (livePrice) {
    await appendSnapshot({
      id: product.id,
      name: product.name,
      brand: product.brand,
      price: livePrice,
      sourceUrl,
      source: "live-page",
    });
  }

  return fromCatalog(
    product,
    sourceUrl,
    livePrice ? "live+history" : "seeded-history",
    livePrice,
  );
}

export async function analyzeProductUrl(rawUrl: string): Promise<ProductAnalysis> {
  const url = rawUrl.trim();
  const catalog = matchCatalog(url);
  
  // If it's a catalog match, use catalog data
  if (catalog) {
    const listing = await fetchListing(url);
    const livePrice = listing?.price;
    return analyzeCatalog(catalog, url || catalog.stores[1]?.url || url, livePrice);
  }

  // For arbitrary URLs, try to fetch listing data
  let listing;
  let livePrice;
  try {
    listing = await fetchListing(url);
    livePrice = listing?.price;
  } catch (error) {
    console.error("Failed to fetch listing:", error);
  }

  // If we have live price and listing data, try to use database
  if (livePrice && listing) {
    try {
      const id = productIdFromUrl(url);
      const stored = await getStoredProduct(id);
      const name = listing.title;
      const brand = listing.brand || new URL(url).hostname.replace(/^www\./, "");
      const product = await appendSnapshot({
        id,
        name,
        brand,
        price: livePrice,
        sourceUrl: url,
        source: "live-page",
      });
      const history = snapshotsToPoints(product);
      const discount =
        listing.wasPrice && listing.wasPrice > livePrice
          ? Math.round(((listing.wasPrice - livePrice) / listing.wasPrice) * 100)
          : undefined;

      return assemble({
        id,
        name,
        brand,
        imageHint: name,
        currentPrice: livePrice,
        advertisedWas: listing.wasPrice,
        advertisedDiscountPct: discount,
        history,
        stores: [{ store: brand, price: livePrice, inStock: true, url }],
        alternatives: [],
        whyNot: [
          history.length < 4
            ? "We have very little history on this listing, so the recommendation is conservative."
            : `Lowest recorded so far is €${Math.min(...history.map((h) => h.price))}.`,
          "Other retailers are not verified for this URL yet.",
          "Variants, shipping, and tax may not be reflected in the scraped price.",
        ],
      sourceUrl: url,
      dataSource: "live+history",
    });
    } catch (dbError) {
      console.error("Database operation failed, using fallback:", dbError);
      // Fall through to fallback analysis
    }
  }

  // Fallback: Basic analysis without database
  try {
    const id = productIdFromUrl(url);
    const name = listing?.title || new URL(url).hostname.replace(/^www\./, "");
    const brand = listing?.brand || new URL(url).hostname.replace(/^www\./, "");
    
    return {
      id,
      name,
      brand,
      imageHint: name,
      currency: "EUR",
      currentPrice: livePrice || 0,
      advertisedWas: listing?.wasPrice,
      advertisedDiscountPct: listing?.wasPrice && livePrice 
        ? Math.round(((listing.wasPrice - livePrice) / listing.wasPrice) * 100)
        : undefined,
      avg30: 0,
      avg90: 0,
      lowest: 0,
      highest: 0,
      recommendation: "WAIT",
      headline: livePrice ? "Current price found" : "Unable to fetch price",
      explanation: "Basic analysis available. Full price history requires database connectivity.",
      savingsVsTypical: 0,
      realSale: {
        isUnusual: false,
        label: "Limited data",
        detail: "No historical data available for this product."
      },
      whyNot: [
        "No historical price data available.",
        "Database connection required for full analysis.",
        "Recommendation is conservative due to limited information."
      ],
      score: {
        overall: 50,
        price: 50,
        history: 50,
        alternatives: 50,
        reviews: 50,
      },
      history: [],
      stores: livePrice ? [{ store: brand, price: livePrice, inStock: true, url }] : [],
      alternatives: [],
      sourceUrl: url,
      dataSource: "basic-fallback",
      priceBehavior: "No historical data available.",
    };
  } catch (fallbackError) {
    console.error("Fallback analysis failed:", fallbackError);
    throw new Error("Unable to analyze this product URL");
  }

  // Final fallback
  return {
    id: "unresolved",
    name: "Couldn't read this product",
    brand: "PriceDrop",
    imageHint: "",
    currency: "EUR",
    currentPrice: 0,
    avg30: 0,
    avg90: 0,
    lowest: 0,
    highest: 0,
    recommendation: "WAIT",
    headline: "This page didn't expose a usable price.",
    explanation:
      "Paste a demo link, or a product URL that includes schema.org Product markup. Many storefronts hide prices from automated requests.",
    savingsVsTypical: 0,
    realSale: {
      isUnusual: false,
      label: "No data",
      detail: "Unable to determine sale status."
    },
    whyNot: [
      "No price data found on this page.",
      "Database connection may be required for full analysis.",
      "Try a different product URL or use demo links."
    ],
    score: {
      overall: 0,
      price: 0,
      history: 0,
      alternatives: 0,
      reviews: 0,
    },
    history: [],
    stores: [],
    alternatives: [],
    sourceUrl: url,
    dataSource: "unresolved",
    priceBehavior: "No data available.",
  };
}

export async function analyzeStoredProduct(id: string): Promise<ProductAnalysis | null> {
  const catalog = CATALOG.find((p) => p.id === id);
  const stored = await getStoredProduct(id);
  if (catalog) {
    await seedHistory({
      id: catalog.id,
      name: catalog.name,
      brand: catalog.brand,
      history: catalog.history,
      sourceUrl: stored?.sourceUrl,
    });
    return fromCatalog(
      catalog,
      stored?.sourceUrl || catalog.stores[0]?.url || "",
      stored ? "tracked" : "seeded-history",
    );
  }
  if (!stored) return null;
  const history = snapshotsToPoints(stored);
  if (history.length === 0) return null;
  const current = history[history.length - 1].price;
  return assemble({
    id: stored.id,
    name: stored.name,
    brand: stored.brand,
    imageHint: stored.name,
    currentPrice: current,
    history,
    stores: stored.sourceUrl
      ? [{ store: stored.brand, price: current, inStock: true, url: stored.sourceUrl }]
      : [],
    alternatives: [],
    whyNot: [],
    sourceUrl: stored.sourceUrl || "",
    dataSource: "tracked",
  });
}
