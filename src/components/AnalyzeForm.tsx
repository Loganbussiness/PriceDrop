"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type AnalyzeFormProps = {
  initialUrl?: string;
  compact?: boolean;
};

export function AnalyzeForm({ initialUrl = "", compact = false }: AnalyzeFormProps) {
  const router = useRouter();
  const [url, setUrl] = useState(initialUrl);
  const [pending, setPending] = useState(false);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;
    setPending(true);
    router.push(`/analysis?url=${encodeURIComponent(trimmed)}`);
  }

  return (
    <form onSubmit={onSubmit} className="w-full">
      <label
        htmlFor="product-url"
        className={compact ? "sr-only" : "mb-3 block text-sm text-[var(--muted)]"}
      >
        Paste a product link
      </label>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
        <input
          id="product-url"
          name="url"
          type="url"
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="amazon.com/.../Sony WH-1000XM6"
          className="min-h-14 flex-1 rounded-xl border border-[var(--line)] bg-white/80 px-4 text-base text-[var(--ink)] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] outline-none ring-[var(--accent)] transition placeholder:text-[var(--muted)] focus:ring-2"
        />
        <button
          type="submit"
          disabled={pending}
          className="min-h-14 rounded-xl bg-[var(--ink)] px-7 text-base font-semibold text-white transition hover:bg-[var(--ink-soft)] disabled:opacity-60"
        >
          {pending ? "Analyzing…" : "Analyze"}
        </button>
      </div>
    </form>
  );
}
