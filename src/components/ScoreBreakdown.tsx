import type { ScoreBreakdown as Score } from "@/lib/types";

export function ScoreBreakdown({ score }: { score: Score }) {
  const rows: { label: string; value: number }[] = [
    { label: "Price", value: score.price },
    { label: "Price history", value: score.history },
    { label: "Alternatives", value: score.alternatives },
    { label: "Reviews", value: score.reviews },
  ];

  return (
    <div>
      <div className="mb-4 flex items-end gap-3">
        <p className="font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight text-[var(--ink)]">
          {score.overall}
          <span className="text-xl text-[var(--muted)]">/100</span>
        </p>
        <p className="pb-1 text-sm text-[var(--muted)]">Purchase score</p>
      </div>
      <ul className="space-y-3">
        {rows.map((row) => (
          <li key={row.label}>
            <div className="mb-1 flex justify-between text-sm">
              <span className="text-[var(--ink-soft)]">{row.label}</span>
              <span className="font-medium text-[var(--ink)]">{row.value}/100</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--line)]">
              <div
                className="h-full rounded-full bg-[var(--accent)] transition-all"
                style={{ width: `${row.value}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm leading-relaxed text-[var(--muted)]">
        The biggest driver is how close the current price is to the historical
        low — not a mysterious AI number.
      </p>
    </div>
  );
}
