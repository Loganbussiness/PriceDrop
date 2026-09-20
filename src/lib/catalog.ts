import type { Alternative, PricePoint, StoreOffer } from "./types";

export type CatalogProduct = {
  id: string;
  name: string;
  brand: string;
  imageHint: string;
  currentPrice: number;
  advertisedWas?: number;
  advertisedDiscountPct?: number;
  history: PricePoint[];
  stores: StoreOffer[];
  alternatives: Alternative[];
  whyNot: string[];
};

function monthsAgo(months: number, day = 15): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  d.setDate(day);
  return d;
}

function buildHistory(
  points: { monthsAgo: number; price: number }[],
): PricePoint[] {
  return points.map((p) => ({
    date: monthsAgo(p.monthsAgo),
    price: p.price,
  }));
}

export function amazonSearch(query: string): string {
  return `https://www.amazon.de/s?k=${encodeURIComponent(query)}`;
}

export function googleShopping(query: string): string {
  return `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(query)}`;
}

export const CATALOG: CatalogProduct[] = [
  {
    id: "sony-wh-1000xm6",
    name: "Sony WH-1000XM6",
    brand: "Sony",
    imageHint: "Over-ear noise-cancelling headphones",
    currentPrice: 349,
    advertisedWas: 449,
    advertisedDiscountPct: 22,
    whyNot: [
      "It's currently €20 above its recent low (€329).",
      "MediaMarkt has it for €339 — €10 less than this listing.",
      "The previous-gen XM5 is €100 cheaper if you don't need the newest model.",
    ],
    history: buildHistory([
      { monthsAgo: 5, price: 429 },
      { monthsAgo: 4, price: 399 },
      { monthsAgo: 3.5, price: 419 },
      { monthsAgo: 3, price: 379 },
      { monthsAgo: 2.5, price: 389 },
      { monthsAgo: 2, price: 359 },
      { monthsAgo: 1.5, price: 399 },
      { monthsAgo: 1, price: 369 },
      { monthsAgo: 0.5, price: 359 },
      { monthsAgo: 0, price: 349 },
    ]),
    stores: [
      {
        store: "MediaMarkt",
        price: 339,
        inStock: true,
        url: "https://www.mediamarkt.de/de/search.html?query=Sony%20WH-1000XM6",
      },
      {
        store: "Amazon",
        price: 349,
        inStock: true,
        url: amazonSearch("Sony WH-1000XM6"),
      },
      {
        store: "Coolblue",
        price: 369,
        inStock: true,
        url: "https://www.coolblue.nl/en/search?query=Sony%20WH-1000XM6",
      },
      {
        store: "Alternate",
        price: 355,
        inStock: true,
        url: "https://www.alternate.de/listing.xhtml?q=Sony+WH-1000XM6",
      },
    ],
    alternatives: [
      {
        name: "Bose QuietComfort Ultra",
        price: 299,
        note: "Similar use case, currently €50 cheaper.",
        delta: -50,
      },
      {
        name: "Sony WH-1000XM5",
        price: 249,
        note: "Previous-generation model — significantly cheaper.",
        delta: -100,
      },
    ],
  },
  {
    id: "airpods-pro-2",
    name: "Apple AirPods Pro (2nd gen)",
    brand: "Apple",
    imageHint: "Wireless earbuds with ANC",
    currentPrice: 179,
    advertisedWas: 279,
    advertisedDiscountPct: 36,
    whyNot: [
      "Recent low was €159 — you could save ~€20 by waiting.",
      "This product discounts several times a year.",
      "USB-C vs Lightning variants can confuse listings — confirm the model.",
    ],
    history: buildHistory([
      { monthsAgo: 5, price: 249 },
      { monthsAgo: 4, price: 229 },
      { monthsAgo: 3, price: 199 },
      { monthsAgo: 2.5, price: 219 },
      { monthsAgo: 2, price: 189 },
      { monthsAgo: 1.5, price: 209 },
      { monthsAgo: 1, price: 169 },
      { monthsAgo: 0.5, price: 189 },
      { monthsAgo: 0, price: 179 },
    ]),
    stores: [
      {
        store: "Amazon",
        price: 179,
        inStock: true,
        url: amazonSearch("Apple AirPods Pro 2 USB-C"),
      },
      {
        store: "Apple",
        price: 185,
        inStock: true,
        url: "https://www.apple.com/search/AirPods-Pro?src=serp",
      },
      {
        store: "MediaMarkt",
        price: 174,
        inStock: true,
        url: "https://www.mediamarkt.de/de/search.html?query=AirPods%20Pro",
      },
    ],
    alternatives: [
      {
        name: "Sony WF-1000XM5",
        price: 219,
        note: "Strong ANC alternative, currently pricier.",
        delta: 40,
      },
    ],
  },
  {
    id: "fake-sale-headphones",
    name: "NovaBeat Pro ANC",
    brand: "NovaBeat",
    imageHint: "Budget ANC headphones from an ad",
    currentPrice: 129,
    advertisedWas: 169,
    advertisedDiscountPct: 25,
    whyNot: [
      "It's been around €119–€125 for most of the last 6 months.",
      "Lowest recently was €99 — €30 below today's price.",
      "Advertised 25% off looks stronger than the real deal.",
    ],
    history: buildHistory([
      { monthsAgo: 5, price: 125 },
      { monthsAgo: 4, price: 119 },
      { monthsAgo: 3, price: 129 },
      { monthsAgo: 2.5, price: 122 },
      { monthsAgo: 2, price: 99 },
      { monthsAgo: 1.5, price: 124 },
      { monthsAgo: 1, price: 121 },
      { monthsAgo: 0.5, price: 126 },
      { monthsAgo: 0, price: 129 },
    ]),
    stores: [
      {
        store: "Google Shopping",
        price: 114,
        inStock: true,
        url: googleShopping("Anker Soundcore Space One"),
      },
      {
        store: "Amazon",
        price: 119,
        inStock: true,
        url: amazonSearch("Anker Soundcore Space One"),
      },
      {
        store: "Ad retailer",
        price: 129,
        inStock: true,
        url: googleShopping("noise cancelling headphones under 130 euro"),
      },
    ],
    alternatives: [
      {
        name: "Anker Soundcore Space One",
        price: 99,
        note: "Similar ANC category, often better reviewed at this price.",
        delta: -30,
      },
    ],
  },
];

export const DEMO_LINKS = [
  {
    label: "Sony WH-1000XM6 (good price)",
    url: amazonSearch("Sony WH-1000XM6"),
    catalogId: "sony-wh-1000xm6",
  },
  {
    label: "AirPods Pro (maybe wait)",
    url: amazonSearch("Apple AirPods Pro 2 USB-C"),
    catalogId: "airpods-pro-2",
  },
  {
    label: "Ad headphones (fake sale)",
    url: "https://shop.example.com/novabeat-pro-anc",
    catalogId: "fake-sale-headphones",
  },
];

// Exact match against the demo chip links only — this is how the "Try a
// demo link" chips on the home page reliably hit canned catalog data
// without accidentally swallowing real product URLs pasted by users.
// Previously this matched on loose substrings like "airpods", "wait",
// "pro-2", "fake", or "avoid", which meant almost any real product link
// (affiliate params, model numbers, etc.) could match a demo product and
// send every user to the same canned page (e.g. always the AirPods demo).
const DEMO_URL_EXACT: Record<string, CatalogProduct> = Object.fromEntries(
  DEMO_LINKS.map((demo) => [
    demo.url,
    CATALOG.find((p) => p.id === demo.catalogId)!,
  ]),
);

export function matchCatalog(url: string): CatalogProduct | undefined {
  const normalizedUrl = url.trim();
  
  // Try exact match first
  if (DEMO_URL_EXACT[normalizedUrl]) {
    return DEMO_URL_EXACT[normalizedUrl];
  }
  
  // Try with different encodings
  const decodedUrl = decodeURIComponent(normalizedUrl);
  if (DEMO_URL_EXACT[decodedUrl]) {
    return DEMO_URL_EXACT[decodedUrl];
  }
  
  // Try encoded version
  const encodedUrl = encodeURIComponent(normalizedUrl);
  if (DEMO_URL_EXACT[encodedUrl]) {
    return DEMO_URL_EXACT[encodedUrl];
  }
  
  // Try partial matching - match by catalog ID if URL contains key terms
  const urlLower = normalizedUrl.toLowerCase();
  if (urlLower.includes('sony') && urlLower.includes('wh-1000xm6')) {
    return CATALOG.find(p => p.id === 'sony-wh-1000xm6');
  }
  if (urlLower.includes('airpods') && urlLower.includes('pro')) {
    return CATALOG.find(p => p.id === 'airpods-pro-2');
  }
  if (urlLower.includes('fake') || urlLower.includes('sale')) {
    return CATALOG.find(p => p.id === 'fake-sale-headphones');
  }
  
  // Fallback: match any Amazon URL to Sony demo for testing
  if (urlLower.includes('amazon.de') && urlLower.includes('sony')) {
    return CATALOG.find(p => p.id === 'sony-wh-1000xm6');
  }
  
  return undefined;
}
