"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { formatEuro } from "@/lib/money";

type DiscoveredProduct = {
  name: string;
  brand: string;
  description: string;
  currentPrice: number;
  currency: string;
  searchQuery: string;
  confidence: number;
  rating?: number;
  reviewCount?: number;
  reasons: string[];
};

type DiscoveryResponse = {
  products: DiscoveredProduct[];
  error?: string;
};

export default function DiscoverPage() {
  const [query, setQuery] = useState("");
  const [budget, setBudget] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<DiscoveredProduct[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function discover(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const url = new URL("/api/discover", window.location.origin);
      url.searchParams.set("q", query);
      if (budget) url.searchParams.set("budget", budget);

      const res = await fetch(url.toString());
      const data: DiscoveryResponse = await res.json();

      if (data.error) {
        setError(data.error);
      } else {
        setResults(data.products);
      }
    } catch (err) {
      setError("Failed to discover products. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function renderStars(rating?: number) {
    if (!rating) return null;
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5;
    const empty = 5 - full - (half ? 1 : 0);

    return (
      <div className="flex items-center gap-0.5">
        {[...Array(full)].map((_, i) => (
          <span key={i} className="text-yellow-500">★</span>
        ))}
        {half && <span className="text-yellow-500">★</span>}
        {[...Array(empty)].map((_, i) => (
          <span key={i} className="text-gray-300">★</span>
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 py-10">
      <header className="space-y-2">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-[var(--ink)]">
          Discover Products
        </h1>
        <p className="text-[var(--muted)]">
          Ask AI to find the best products at the lowest prices. Then track them to get price alerts.
        </p>
      </header>

      <form onSubmit={discover} className="space-y-4">
        <div className="flex gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g., gaming laptop under €800"
            className="flex-1 rounded-full border border-[var(--line)] px-5 py-3 text-[var(--ink)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            disabled={loading}
          />
          <input
            type="number"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="Max price (€)"
            className="w-40 rounded-full border border-[var(--line)] px-5 py-3 text-[var(--ink)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !query}
            className="rounded-full bg-[var(--ink)] px-6 py-3 font-medium text-white transition hover:bg-[var(--accent)] disabled:opacity-50"
          >
            {loading ? "Searching..." : "Discover"}
          </button>
        </div>
      </form>

      {error && (
        <div className="rounded-2xl border border-[var(--avoid)]/40 bg-[var(--avoid-soft)] px-5 py-4 text-sm text-[var(--ink-soft)]">
          {error}
        </div>
      )}

      {results && results.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[var(--line)] px-5 py-12 text-center">
          <p className="text-[var(--muted)]">No products found. Try a different search.</p>
        </div>
      )}

      {results && results.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[var(--muted)]">
              Found {results.length} products
            </p>
          </div>

          <ul className="space-y-4">
            {results.map((product, index) => (
              <li
                key={index}
                className="rounded-2xl border border-[var(--line)] bg-white/70 p-6 backdrop-blur"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
                      {product.brand}
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-[var(--ink)]">
                      {product.name}
                    </h3>
                    <p className="mt-2 text-sm text-[var(--muted)]">
                      {product.description}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                      <span className="font-semibold text-[var(--ink)] tabular-nums">
                        {formatEuro(product.currentPrice)}
                      </span>
                      {product.rating && (
                        <span className="flex items-center gap-1">
                          {renderStars(product.rating)}
                          <span className="text-[var(--muted)]">
                            ({product.reviewCount || 0} reviews)
                          </span>
                        </span>
                      )}
                      <span className="text-[var(--muted)]">
                        {product.confidence}% match
                      </span>
                    </div>

                    <ul className="mt-3 space-y-1 text-sm text-[var(--muted)]">
                      {product.reasons.map((reason, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-[var(--accent)]">•</span>
                          {reason}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Link
                    href={`/analysis?url=${encodeURIComponent(
                      `https://www.amazon.com/s?k=${encodeURIComponent(product.searchQuery)}`
                    )}`}
                    className="rounded-full border border-[var(--line)] bg-white px-5 py-2.5 font-medium text-[var(--ink)] transition hover:border-[var(--accent)] hover:bg-[var(--accent)] hover:text-white"
                  >
                    Track Price
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-2xl border border-[var(--line)] bg-white/70 p-6 backdrop-blur">
        <h3 className="font-semibold text-[var(--ink)]">💡 Tips</h3>
        <ul className="mt-3 space-y-2 text-sm text-[var(--muted)]">
          <li>• Be specific: "gaming laptop with RTX 4060" is better than "laptop"</li>
          <li>• Include a budget to filter by price</li>
          <li>• Click "Track Price" to add products to your alerts</li>
          <li>• Products found here will be tracked for price drops</li>
        </ul>
      </div>
    </div>
  );
}
