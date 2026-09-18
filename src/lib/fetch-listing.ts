export type LiveListing = {
  title: string;
  brand?: string;
  price?: number;
  wasPrice?: number;
  currency?: string;
};

function decode(html: string) {
  return html
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function meta(html: string, key: string): string | undefined {
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']+)["']`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${key}["']`,
      "i",
    ),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return decode(m[1]).trim();
  }
  return undefined;
}

function parsePrice(raw: unknown): number | undefined {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw !== "string") return undefined;
  const cleaned = raw.replace(/[^\d.,]/g, "").replace(",", ".");
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function walkOffers(node: unknown): { price?: number; was?: number } {
  if (!node || typeof node !== "object") return {};
  const obj = node as Record<string, unknown>;
  const price =
    parsePrice(obj.price) ??
    parsePrice(obj.lowPrice) ??
    parsePrice((obj.priceSpecification as Record<string, unknown> | undefined)?.price);
  const was = parsePrice(obj.highPrice);
  if (Array.isArray(obj.offers)) {
    for (const offer of obj.offers) {
      const nested = walkOffers(offer);
      if (nested.price) return nested;
    }
  }
  if (obj.offers && typeof obj.offers === "object" && !Array.isArray(obj.offers)) {
    const nested = walkOffers(obj.offers);
    if (nested.price) return nested;
  }
  return { price, was };
}

function fromJsonLd(html: string): Partial<LiveListing> {
  const blocks = [
    ...html.matchAll(
      /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    ),
  ];
  for (const block of blocks) {
    try {
      const data = JSON.parse(block[1]) as unknown;
      const nodes = Array.isArray(data) ? data : [data];
      for (const node of nodes) {
        if (!node || typeof node !== "object") continue;
        const obj = node as Record<string, unknown>;
        const graph = obj["@graph"];
        const candidates = Array.isArray(graph) ? graph : [obj];
        for (const candidate of candidates) {
          if (!candidate || typeof candidate !== "object") continue;
          const item = candidate as Record<string, unknown>;
          const type = String(item["@type"] ?? "");
          if (!/product/i.test(type)) continue;
          const offers = walkOffers(item);
          const brand =
            typeof item.brand === "string"
              ? item.brand
              : typeof item.brand === "object" && item.brand
                ? String((item.brand as { name?: string }).name ?? "")
                : undefined;
          return {
            title: typeof item.name === "string" ? item.name : undefined,
            brand: brand || undefined,
            price: offers.price,
            wasPrice: offers.was,
          };
        }
      }
    } catch {
      /* ignore malformed JSON-LD */
    }
  }
  return {};
}

const listingCache = new Map<string, { at: number; value: LiveListing | null }>();
const CACHE_MS = 10 * 60 * 1000;
const hostLastFetch = new Map<string, number>();
const HOST_GAP_MS = 1500;

export async function fetchListing(url: string): Promise<LiveListing | null> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (!/^https?:$/.test(parsed.protocol)) return null;

  const cacheKey = parsed.toString();
  const cached = listingCache.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_MS) {
    return cached.value;
  }

  const last = hostLastFetch.get(parsed.hostname) ?? 0;
  const wait = HOST_GAP_MS - (Date.now() - last);
  if (wait > 0) {
    await new Promise((r) => setTimeout(r, wait));
  }
  hostLastFetch.set(parsed.hostname, Date.now());

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(parsed.toString(), {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; PriceDropMVP/0.1; +https://localhost:3000)",
        accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) return null;
    const html = await res.text();
    const ld = fromJsonLd(html);
    const title =
      ld.title ||
      meta(html, "og:title") ||
      html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim();
    const price =
      ld.price ??
      parsePrice(meta(html, "og:price:amount") ?? meta(html, "product:price:amount"));
    const wasPrice = ld.wasPrice ?? parsePrice(meta(html, "og:price:standard_amount"));
    const currency = meta(html, "og:price:currency") || ld.currency;
    if (!title && !price) {
      listingCache.set(cacheKey, { at: Date.now(), value: null });
      return null;
    }
    const value: LiveListing = {
      title: title ? decode(title) : "Unknown product",
      brand: ld.brand,
      price,
      wasPrice,
      currency,
    };
    listingCache.set(cacheKey, { at: Date.now(), value });
    return value;
  } catch {
    listingCache.set(cacheKey, { at: Date.now(), value: null });
    return null;
  } finally {
    clearTimeout(timer);
  }
}
