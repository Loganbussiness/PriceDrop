import { CATALOG, type CatalogProduct, matchCatalog } from "./catalog";
import { fetchListing } from "./fetch-listing";
import {
  appendSnapshot,
  getStoredProduct,
  listStoredProducts,
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

// Historical data accumulation
async function accumulateHistoricalData(productId: string, price: number, source: string) {
  try {
    await appendSnapshot({
      id: productId,
      name: "Unknown", // Will be updated by the main analysis
      brand: "Unknown",
      price,
      sourceUrl: "",
      source,
    });
  } catch (error) {
    console.error("Failed to accumulate historical data:", error);
  }
}

// Cross-retailer search system
type RetailerSearchResult = {
  retailer: string;
  url: string;
  averagePrice: number;
  priceRange: {
    min: number;
    max: number;
  };
  resultCount: number;
};

type CompetitorResult = {
  name: string;
  price: number;
  retailer: string;
  url: string | undefined;
  delta: number;
  isFromSearch: boolean;
  priceRange?: {
    min: number;
    max: number;
  };
};

async function searchRetailersForProduct(productName: string, brand: string): Promise<RetailerSearchResult[]> {
  const retailerSearchTemplates = [
    {
      name: 'Amazon',
      searchUrl: (name: string) => `https://www.amazon.com/s?k=${encodeURIComponent(name)}`,
      priceSelector: '.a-price .a-offscreen',
      productSelector: '.s-result-item',
    },
    {
      name: 'Amazon DE',
      searchUrl: (name: string) => `https://www.amazon.de/s?k=${encodeURIComponent(name)}`,
      priceSelector: '.a-price .a-offscreen',
      productSelector: '.s-result-item',
    },
    {
      name: 'eBay',
      searchUrl: (name: string) => `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(name)}`,
      priceSelector: '.s-item__price',
      productSelector: '.s-item',
    },
    {
      name: 'Walmart',
      searchUrl: (name: string) => `https://www.walmart.com/search/?query=${encodeURIComponent(name)}`,
      priceSelector: '.price-main',
      productSelector: '.search-result-gridview-item',
    },
    {
      name: 'Best Buy',
      searchUrl: (name: string) => `https://www.bestbuy.com/site/searchpage.jsp?st=${encodeURIComponent(name)}`,
      priceSelector: '.price-regular',
      productSelector: '.sku-item',
    },
  ];

  const results = [];

  for (const retailer of retailerSearchTemplates) {
    try {
      const searchUrl = retailer.searchUrl(productName);
      console.log(`Searching ${retailer.name}:`, searchUrl);
      
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });
      
      if (response.ok) {
        const html = await response.text();
        
        // Extract prices from search results
        const priceMatches = html.match(/€?\$?[\d.,]+/g);
        if (priceMatches && priceMatches.length > 0) {
          const prices = priceMatches
            .map(p => parseFloat(p.replace(/[€$\s,]/g, '').replace(',', '.')))
            .filter(p => !isNaN(p) && p > 0 && p < 10000);
          
          if (prices.length > 0) {
            const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
            results.push({
              retailer: retailer.name,
              url: searchUrl,
              averagePrice: avgPrice,
              priceRange: {
                min: Math.min(...prices),
                max: Math.max(...prices),
              },
              resultCount: prices.length,
            } as RetailerSearchResult);
          }
        }
      }
    } catch (error) {
      console.error(`Failed to search ${retailer.name}:`, error);
    }
  }

  return results;
}

// Retailer comparison (enhanced with cross-retailer search)
async function findCompetitorProducts(productName: string, brand: string, currentPrice: number, currentUrl: string): Promise<CompetitorResult[]> {
  try {
    // First, search across multiple retailers
    const retailerResults = await searchRetailersForProduct(productName, brand);
    
    // Convert retailer search results to competitor format
    const retailerCompetitors: CompetitorResult[] = retailerResults.map(result => ({
      name: `${productName} at ${result.retailer}`,
      price: result.averagePrice,
      retailer: result.retailer,
      url: result.url,
      delta: result.averagePrice - currentPrice,
      isFromSearch: true,
      priceRange: result.priceRange,
    }));

    // Also search database for existing similar products
    const allProducts = await listStoredProducts();
    
    const similarProducts = allProducts.filter(product => {
      const productLower = product.name.toLowerCase();
      const searchTerm = productName.toLowerCase();
      
      const brandMatch = product.brand.toLowerCase() === brand.toLowerCase();
      const nameSimilarity = productLower.includes(searchTerm.split(' ')[0]) || 
                            searchTerm.includes(productLower.split(' ')[0]);
      
      const isCurrentProduct = product.sourceUrl === currentUrl;
      
      return brandMatch && nameSimilarity && !isCurrentProduct;
    });
    
    const databaseCompetitors: CompetitorResult[] = similarProducts
      .map(product => {
        if (product.snapshots.length > 0) {
          const latestSnapshot = product.snapshots[product.snapshots.length - 1];
          return {
            name: product.name,
            price: latestSnapshot.price,
            retailer: product.brand,
            url: product.sourceUrl,
            delta: latestSnapshot.price - currentPrice,
            isFromSearch: false,
          };
        }
        return null;
      })
      .filter((comp): comp is NonNullable<typeof comp> => comp !== null);

    // Combine both sources and prioritize retailer search results
    const allCompetitors = [...retailerCompetitors, ...databaseCompetitors];
    
    // Sort by price difference and return top 5
    return allCompetitors
      .sort((a, b) => Math.abs(a.delta) - Math.abs(b.delta))
      .slice(0, 5);
  } catch (error) {
    console.error("Failed to find competitor products:", error);
    return [];
  }
}

// Variant detection
function detectVariants(title: string, html: string) {
  const variants: string[] = [];
  
  // Common variant patterns in product titles
  const variantPatterns = [
    /(?:\(|\[)\s*(\d+(?:\.\d+)?)\s*(?:inch|'|mm|cm)\s*(?:\)|\])/gi, // Sizes
    /(?:\(|\[)\s*(black|white|red|blue|green|yellow|orange|purple|pink|brown|gray|grey|silver|gold)\s*(?:\)|\])/gi, // Colors
    /(?:\(|\[)\s*(small|medium|large|xl|xxl|xxxl|s|m|l)\s*(?:\)|\])/gi, // Sizes
    /(?:\(|\[)\s*(32gb|64gb|128gb|256gb|512gb|1tb|2tb)\s*(?:\)|\])/gi, // Storage
    /(?:\(|\[)\s*(4gb|8gb|16gb|32gb)\s*(?:\)|\])/gi, // RAM
  ];
  
  // Check title for variants
  for (const pattern of variantPatterns) {
    const matches = title.match(pattern);
    if (matches) {
      variants.push(...matches.map(m => m.replace(/[()\[\]]/g, '').trim()));
    }
  }
  
  // Check HTML for variant selectors
  const htmlVariantPatterns = [
    /<[^>]*(?:variant|option|color|size)[^>]*>/gi,
    /<select[^>]*name="[^"]*(?:variant|option|color|size)[^"]*"[^>]*>/gi,
  ];
  
  for (const pattern of htmlVariantPatterns) {
    if (html.match(pattern)) {
      variants.push("Multiple variants available on page");
      break;
    }
  }
  
  return {
    hasVariants: variants.length > 0,
    detectedVariants: [...new Set(variants)], // Remove duplicates
  };
}

// Shipping and tax estimation
function estimateTotalPrice(basePrice: number, currency: string, retailer: string, url: string) {
  // Basic retailer-specific shipping estimates
  const retailerShippingRates: Record<string, number> = {
    'amazon': 0, // Amazon often has free shipping
    'amazon.de': 0,
    'amazon.com': 0,
    'ebay': 5, // eBay often has shipping costs
    'walmart': 0,
    'target': 0,
    'bestbuy': 0,
  };
  
  // Detect retailer from URL or brand
  const urlLower = url.toLowerCase();
  const retailerLower = retailer.toLowerCase();
  
  let estimatedShipping = 0;
  
  // Check for known retailers
  for (const [knownRetailer, rate] of Object.entries(retailerShippingRates)) {
    if (urlLower.includes(knownRetailer) || retailerLower.includes(knownRetailer)) {
      estimatedShipping = rate;
      break;
    }
  }
  
  // Default shipping for unknown retailers
  if (estimatedShipping === 0 && basePrice < 50) {
    estimatedShipping = 5; // Assume shipping cost for cheaper items
  }
  
  // Tax estimation (simplified - would need geolocation in production)
  const taxRates: Record<string, number> = {
    'EUR': 0.19, // EU average VAT
    'USD': 0.08, // US average sales tax
    'GBP': 0.20, // UK VAT
  };
  
  const taxRate = taxRates[currency] || 0.1; // Default 10%
  const estimatedTax = basePrice * taxRate;
  
  const total = basePrice + estimatedShipping + estimatedTax;
  
  return {
    basePrice,
    estimatedShipping,
    estimatedTax,
    total,
    taxRate,
    currency,
  };
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
  let productHtml = "";
  try {
    listing = await fetchListing(url);
    livePrice = listing?.price;
    console.log("Listing fetched:", { listing, livePrice });
    
    // Try to get HTML for variant detection (fetch the page content)
    try {
      const response = await fetch(url);
      if (response.ok) {
        productHtml = await response.text();
      }
    } catch (htmlError) {
      console.error("Failed to fetch HTML for variant detection:", htmlError);
    }
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

      const analysisData = {
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
          "Checking other retailers for price comparison...",
          "Variants, shipping, and tax may not be reflected in the scraped price.",
        ],
      sourceUrl: url,
      dataSource: "live+history" as const,
    };
    
    const analysis = assemble(analysisData);
    
    // Detect variants and update analysis
    const variantInfo = detectVariants(name, productHtml);
    if (variantInfo.hasVariants) {
      const variantMessage = `This product appears to have variants: ${variantInfo.detectedVariants.join(', ')}. Prices may vary by variant.`;
      // Add variant info to whyNot
      analysis.whyNot.push(variantMessage);
    }
    
    // Estimate shipping and tax
    const shippingTaxInfo = estimateTotalPrice(livePrice, analysis.currency || 'EUR', brand, url);
    if (shippingTaxInfo.estimatedShipping > 0 || shippingTaxInfo.estimatedTax > 0) {
      const shippingTaxMessage = `Estimated total including shipping (€${shippingTaxInfo.estimatedShipping.toFixed(2)}) and tax (€${shippingTaxInfo.estimatedTax.toFixed(2)}): €${shippingTaxInfo.total.toFixed(2)}`;
      analysis.whyNot.push(shippingTaxMessage);
    }
    
    // Find competitor products for comparison (always search retailers)
    const competitors = await findCompetitorProducts(name, brand, livePrice, url);
    
    // Update the analysis with competitor information
    const alternatives = competitors.map(comp => ({
      name: comp.name,
      price: comp.price,
      note: comp.isFromSearch && comp.priceRange
        ? `Found at ${comp.retailer} (price range: €${comp.priceRange.min.toFixed(2)}-€${comp.priceRange.max.toFixed(2)})`
        : comp.isFromSearch
        ? `Found at ${comp.retailer}`
        : `Available at ${comp.retailer}`,
      delta: comp.delta,
      priceRange: comp.priceRange || undefined,
    }));
    
    // Update whyNot message to reflect cross-retailer search
    const updatedWhyNot = [
      history.length < 4
        ? "We have very little history on this listing, so the recommendation is conservative."
        : `Lowest recorded so far is €${Math.min(...history.map((h) => h.price))}.`,
      competitors.length > 0 
        ? `Found this product at ${competitors.length} other retailer(s): ${competitors.map(c => c.retailer).join(', ')}.`
        : "Checking other retailers for price comparison...",
      "Variants, shipping, and tax may not be reflected in the scraped price.",
    ];
    
    // Return updated analysis with competitor info
    return {
      ...analysis,
      alternatives,
      whyNot: updatedWhyNot
    };
    
    return analysis;
    
    // Accumulate historical data for future analysis (non-blocking)
    if (livePrice) {
      accumulateHistoricalData(id, livePrice, "live-page").catch(err => 
        console.error("Historical data accumulation failed:", err)
      );
    }
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
    
    const fallbackAnalysis = {
      id,
      name,
      brand,
      imageHint: name,
      currency: "EUR" as const,
      currentPrice: livePrice || 0,
      advertisedWas: listing?.wasPrice,
      advertisedDiscountPct: listing?.wasPrice && livePrice 
        ? Math.round(((listing.wasPrice - livePrice) / listing.wasPrice) * 100)
        : undefined,
      avg30: 0,
      avg90: 0,
      lowest: 0,
      highest: 0,
      recommendation: "WAIT" as const,
      headline: livePrice ? "Current price found" : "Unable to fetch price from this retailer",
      explanation: livePrice 
        ? "Price found but historical data requires multiple visits." 
        : "This retailer doesn't expose prices in a format we can read automatically. Try a different product link or use our demo links.",
      savingsVsTypical: 0,
      realSale: {
        isUnusual: false,
        label: "Limited data",
        detail: livePrice ? "First time seeing this price" : "No price data available"
      },
      whyNot: [
        "No historical price data available.",
        "This retailer may block automated price checking.",
        "Try Amazon or other retailers with better price visibility."
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
      dataSource: "basic-fallback" as const,
      priceBehavior: "No historical data available.",
    };
    
    // Estimate shipping and tax for fallback
    const shippingTaxInfo = estimateTotalPrice(livePrice || 0, 'EUR', brand, url);
    if (shippingTaxInfo.estimatedShipping > 0 || shippingTaxInfo.estimatedTax > 0) {
      fallbackAnalysis.whyNot.push(`Estimated total including shipping (€${shippingTaxInfo.estimatedShipping.toFixed(2)}) and tax (€${shippingTaxInfo.estimatedTax.toFixed(2)}): €${shippingTaxInfo.total.toFixed(2)}`);
    }
    
    return fallbackAnalysis;
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
