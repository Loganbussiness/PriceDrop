import type { Recommendation } from "@/lib/types";

const COPY: Record<
  Recommendation,
  { emoji: string; label: string; tone: string; bg: string }
> = {
  BUY_NOW: {
    emoji: "🟢",
    label: "BUY NOW",
    tone: "text-[var(--buy)]",
    bg: "bg-[var(--buy-soft)]",
  },
  WAIT: {
    emoji: "🟡",
    label: "WAIT",
    tone: "text-[var(--wait)]",
    bg: "bg-[var(--wait-soft)]",
  },
  AVOID: {
    emoji: "🔴",
    label: "AVOID",
    tone: "text-[var(--avoid)]",
    bg: "bg-[var(--avoid-soft)]",
  },
};

export function RecommendationBadge({
  recommendation,
  large = false,
}: {
  recommendation: Recommendation;
  large?: boolean;
}) {
  const c = COPY[recommendation];
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 font-semibold tracking-wide ${c.bg} ${c.tone} ${
        large ? "text-lg sm:text-xl" : "text-sm"
      }`}
    >
      <span aria-hidden>{c.emoji}</span>
      <span>{c.label}</span>
    </div>
  );
}
