export type LiveListing = {
  title: string;
  brand?: string;
  price?: number;
  wasPrice?: number;
  currency?: string;
};

export type FetchOptions = {
  /** Minimum gap between requests to the same host (default 1500ms) */
  gapMs?: number;
  /** Number of retry attempts on transient failures (default 2) */
  retries?: number;
};

function decode(html: string) {
  return html
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/");
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

export function parsePrice(raw: unknown): number | undefined {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw !== "string") return undefined;

  // Handle various price formats: $99.99, €99,99, 1.299,99 (EU), 1,299.99 (US)
  const cleaned = raw.replace(/[^\d.,]/g, "");
  if (!cleaned) return undefined;

  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");

  let normalized: string;
  if (lastComma > -1 && lastDot > -1) {
    // Both separators: whichever comes last is the decimal separator
    if (lastComma > lastDot) {
      // European style: 1.299,99 → 1299.99
      normalized = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      // US style: 1,299.99 → 1299.99
      normalized = cleaned.replace(/,/g, "");
    }
  } else if (lastComma > -1) {
    // Only comma — treat as decimal if exactly 2 digits follow, else thousands
    const after = cleaned.slice(lastComma + 1);
    if (/^\d{2}$/.test(after)) {
      normalized = cleaned.replace(",", ".");
    } else {
      normalized = cleaned.replace(/,/g, "");
    }
  } else {
    normalized = cleaned;
  }

  const n = Number.parseFloat(normalized);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function isBlockedPage(html: string): boolean {
  const lower = html.toLowerCase();
  const blockSignatures = [
    "enter the characters you see below", // amazon captcha
    "to discuss automated access to amazon data",
    "sorry, we just need to make sure you're not a robot",
    "please verify you are a human",
    "captcha",
    "are you a human?",
    "access denied",
    "request blocked",
  ];
  // Only treat as blocked if the page is small (block pages are tiny)
  return html.length < 60000 && blockSignatures.some((s) => lower.includes(s));
}

/** Amazon-specific extraction — handles the several price layouts Amazon uses. */
function extractAmazon(html: string): { price?: number; wasPrice?: number } {
  // Strategy 1: classic price block spans
  const blockIds = [
    "priceblock_ourprice",
    "priceblock_dealprice",
    "priceblock_saleprice",
    "price_inside_buybox",
    "corePrice_desktop",
  ];
  for (const id of blockIds) {
    const re = new RegExp(
      `id=["']${id}["'][^>]*>[^\\d€$]*([€$]?\\s?\\d[\\d.,]*)`,
      "i",
    );
    const m = html.match(re);
    if (m) {
      const price = parsePrice(m[1]);
      if (price) return { price };
    }
  }

  // Strategy 2: a-price-whole / a-price-fraction component pair
  const pairRe =
    /<span[^>]*class="[^"]*a-price-whole[^"]*"[^>]*>\s*([\d.,]+)\s*<\/span>\s*(?:<span[^>]*class="[^"]*a-price-symbol[^"]*"[^>]*>[^<]*<\/span>\s*)?<span[^>]*class="[^"]*a-price-fraction[^"]*"[^>]*>\s*(\d+)\s*<\/span>/i;
  const pair = html.match(pairRe);
  if (pair) {
    const whole = parseFloat(pair[1].replace(/[^\d]/g, ""));
    const frac = pair[2];
    if (Number.isFinite(whole)) {
      return { price: Number.parseFloat(`${whole}.${frac}`) };
    }
  }

  // Strategy 3: embedded JSON payloads (buybox / pricing JSON)
  const jsonRe =
    /"price"\s*:\s*\{?\s*"(?:amount|raw|displayAmount)"?\s*:\s*"?(\d+(?:[.,]\d{1,2})?)"?/i;
  const jsonMatch = html.match(jsonRe);
  if (jsonMatch) {
    const price = parsePrice(jsonMatch[1]);
    if (price) return { price };
  }

  // Strategy 4: "Currently" / "Was" labels near prices
  const wasRe =
    /(?:was|list price|RRP)\s*[:\s]*[€$]?\s?(\d[\d.,]*)/i;
  const wasMatch = html.match(wasRe);
  const wasPrice = wasMatch ? parsePrice(wasMatch[1]) : undefined;

  return { wasPrice };
}

function extractPriceFromHtml(html: string): number | undefined {
  const patterns = [
    /<span[^>]*class="[^"]*price[^"]*"[^>]*>([\d.,]+)/gi,
    /<div[^>]*class="[^"]*price[^"]*"[^>]*>([\d.,]+)/gi,
    /price["\s]*:\s*["']?([\d.,]+)/gi,
    /€\s*([\d.,]+)/gi,
    /\$\s*([\d.,]+)/gi,
    /([\d.,]+)\s*€/gi,
    /([\d.,]+)\s*\$/gi,
  ];

  for (const pattern of patterns) {
    const matches = html.match(pattern);
    if (matches) {
      for (const match of matches) {
        const priceMatch = match.match(/([\d.,]+)/);
        if (priceMatch) {
          const price = parsePrice(priceMatch[1]);
          if (price && price > 0 && price < 100000) {
            return price;
          }
        }
      }
    }
  }

  return undefined;
}

function walkOffers(node: unknown): { price?: number; was?: number } {
  if (!node || typeof node !== "object") return {};
  const obj = node as Record<string, unknown>;
  const price =
    parsePrice(obj.price) ??
    parsePrice(obj.lowPrice) ??
    parsePrice(
      (obj.priceSpecification as Record<string, unknown> | undefined)?.price,
    );
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
const DEFAULT_HOST_GAP_MS = 1500;

const DEFAULT_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchHtml(
  url: string,
  opts: Required<Pick<FetchOptions, "gapMs" | "retries">>,
): Promise<string | null> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    console.error("Invalid URL:", url);
    return null;
  }

  // Per-host politeness gap
  const last = hostLastFetch.get(parsed.hostname) ?? 0;
  const wait = opts.gapMs - (Date.now() - last);
  if (wait > 0) await sleep(wait);
  hostLastFetch.set(parsed.hostname, Date.now());

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  try {
    for (let attempt = 0; attempt <= opts.retries; attempt++) {
      console.log(`Fetching (${attempt + 1}/${opts.retries + 1}):`, url);
      const res = await fetch(parsed.toString(), {
        signal: controller.signal,
        redirect: "follow",
        headers: {
          "user-agent": DEFAULT_UA,
          accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "accept-language": "en-US,en;q=0.9,de;q=0.8",
          "accept-encoding": "gzip, deflate, br",
        },
      });

      if (res.status === 503 && attempt < opts.retries) {
        // 503 is often bot protection — back off and retry once
        const backoff = 2000 * (attempt + 1);
        console.warn(`503 from ${parsed.hostname}, retrying in ${backoff}ms`);
        await sleep(backoff);
        continue;
      }

      if (!res.ok) {
        console.error("HTTP error:", res.status, res.statusText);
        return null;
      }

      const html = await res.text();
      console.log("HTML length:", html.length);

      if (isBlockedPage(html)) {
        console.warn(`⚠️ Bot-block page detected for ${parsed.hostname}`);
        return null;
      }

      return html;
    }
    return null;
  } catch (error) {
    console.error("Fetch error:", error);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchListing(
  url: string,
  options?: FetchOptions,
): Promise<LiveListing | null> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    console.error("Invalid URL:", url);
    return null;
  }
  if (!/^https?:$/.test(parsed.protocol)) {
    console.error("Invalid protocol:", parsed.protocol);
    return null;
  }

  const cacheKey = parsed.toString();
  const cached = listingCache.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_MS) {
    return cached.value;
  }

  const gapMs = options?.gapMs ?? DEFAULT_HOST_GAP_MS;
  const retries = options?.retries ?? 2;

  const html = await fetchHtml(url, { gapMs, retries });

  const store = (value: LiveListing | null) => {
    listingCache.set(cacheKey, { at: Date.now(), value });
    return value;
  };

  if (html == null) {
    return store(null);
  }

  const ld = fromJsonLd(html);
  console.log("JSON-LD result:", ld);

  const title =
    ld.title ||
    meta(html, "og:title") ||
    meta(html, "twitter:title") ||
    html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim();

  // Price extraction: JSON-LD → meta tags → retailer-specific → generic regex
  let price = ld.price;
  if (!price) {
    price = parsePrice(
      meta(html, "og:price:amount") ?? meta(html, "product:price:amount"),
    );
  }
  if (!price) {
    price = parsePrice(meta(html, "price"));
  }
  if (!price && parsed.hostname.includes("amazon.")) {
    const amazon = extractAmazon(html);
    price = amazon.price;
    if (!price) {
      // Amazon's generic page markup can still yield a price
      price = extractPriceFromHtml(html);
    }
  }
  if (!price) {
    price = extractPriceFromHtml(html);
  }

  const wasPrice =
    ld.wasPrice ??
    parsePrice(
      meta(html, "og:price:standard_amount") ?? meta(html, "price:original"),
    );
  const currency =
    meta(html, "og:price:currency") ||
    meta(html, "price:currency") ||
    (price != null ? inferCurrency(html) : undefined);

  console.log("Extracted data:", { title, price, wasPrice, currency });

  // Accept products with just a title or just a price
  if (!title && !price) {
    console.log("No title or price found");
    return store(null);
  }

  return store({
    title: title ? decode(title) : "Unknown product",
    brand: ld.brand,
    price,
    wasPrice,
    currency,
  });
}

function inferCurrency(html: string): string | undefined {
  const m = html.match(/(€|&euro;)/i);
  if (m) return "EUR";
  if (/£|&pound;/i.test(html)) return "GBP";
  if (/\$|&dollar;/i.test(html)) return "USD";
  return undefined;
}
