"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { upsertAlert } from "@/app/actions/auth";
import { formatEuro } from "@/lib/money";

export function PriceAlertForm({
  productId,
  productName,
  productBrand,
  suggested,
  signedIn,
  existingThreshold,
}: {
  productId: string;
  productName: string;
  productBrand: string;
  suggested: number;
  signedIn: boolean;
  existingThreshold?: number;
}) {
  const [threshold, setThreshold] = useState(
    String(existingThreshold ?? suggested),
  );
  const [saved, setSaved] = useState<number | null>(existingThreshold ?? null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!signedIn) return;
    setPending(true);
    setError(null);
    const form = new FormData();
    form.set("productId", productId);
    form.set("productName", productName);
    form.set("productBrand", productBrand);
    form.set("threshold", threshold);
    const result = await upsertAlert(form);
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setSaved(Number(threshold));
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-[var(--line)] bg-white/70 p-5 backdrop-blur"
    >
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-[var(--ink)]">
        <span aria-hidden>🔔</span>
        <span>Alert me below</span>
      </div>
      {signedIn ? (
        <p className="mb-4 text-sm text-[var(--muted)]">
          Saved to your account for {productName} — works on any device you
          sign in from.
        </p>
      ) : (
        <p className="mb-4 text-sm text-[var(--muted)]">
          <Link href="/signup" className="font-medium text-[var(--ink)] underline">
            Create an account
          </Link>{" "}
          to track this across devices. Alerts are no longer stored only in this
          browser.
        </p>
      )}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]">
            €
          </span>
          <input
            type="number"
            min={1}
            step={1}
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            disabled={!signedIn}
            className="min-h-12 w-full rounded-xl border border-[var(--line)] bg-white pl-8 pr-4 outline-none ring-[var(--accent)] focus:ring-2 disabled:opacity-50"
          />
        </div>
        <button
          type="submit"
          disabled={!signedIn || pending}
          className="min-h-12 rounded-xl bg-[var(--accent)] px-5 font-semibold text-[var(--ink)] transition hover:brightness-95 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Track price"}
        </button>
      </div>
      {error ? (
        <p className="mt-3 text-sm text-[var(--avoid)]" role="alert">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p className="mt-3 text-sm text-[var(--buy)]" role="status">
          Alert set at {formatEuro(saved)}.
        </p>
      ) : null}
    </form>
  );
}
