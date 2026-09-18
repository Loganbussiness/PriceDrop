import type {
  PricePoint,
  Recommendation,
  ScoreBreakdown,
} from "./types";

export function average(points: PricePoint[], days: number): number {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const subset = points.filter((p) => p.date.getTime() >= cutoff);
  const use = subset.length > 0 ? subset : points;
  const sum = use.reduce((acc, p) => acc + p.price, 0);
  return Math.round(sum / Math.max(use.length, 1));
}

export function extremes(points: PricePoint[]): { lowest: number; highest: number } {
  const prices = points.map((p) => p.price);
  return {
    lowest: Math.min(...prices),
    highest: Math.max(...prices),
  };
}

export function lastMajorDrop(points: PricePoint[]): {
  daysAgo: number;
  from: number;
  to: number;
} | null {
  if (points.length < 2) return null;
  const sorted = [...points].sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  );
  for (let i = sorted.length - 1; i >= 1; i--) {
    const prev = sorted[i - 1].price;
    const next = sorted[i].price;
    if (prev > 0 && (prev - next) / prev >= 0.08) {
      const daysAgo = Math.max(
        0,
        Math.round(
          (Date.now() - sorted[i].date.getTime()) /
            (24 * 60 * 60 * 1000),
        ),
      );
      return { daysAgo, from: prev, to: next };
    }
  }
  return null;
}

export function dropCount(points: PricePoint[]): number {
  const sorted = [...points].sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  );
  let n = 0;
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1].price;
    const next = sorted[i].price;
    if (prev > 0 && (prev - next) / prev >= 0.08) n += 1;
  }
  return n;
}

export function decideRecommendation(input: {
  current: number;
  avg90: number;
  lowest: number;
  advertisedDiscountPct?: number;
  sampleCount: number;
}): {
  recommendation: Recommendation;
  headline: string;
  explanation: string;
  savingsVsTypical: number;
  potentialWaitSavings?: number;
} {
  const { current, avg90, lowest, advertisedDiscountPct, sampleCount } = input;
  const savingsVsTypical = Math.round(avg90 - current);
  const gapToLow = Math.round(current - lowest);
  const pctBelowAvg = avg90 > 0 ? ((avg90 - current) / avg90) * 100 : 0;

  if (sampleCount < 3) {
    return {
      recommendation: "WAIT",
      headline: "We just started tracking this product.",
      explanation:
        "There's not enough price history yet to call this a good deal. Set an alert and we'll learn the typical price over time.",
      savingsVsTypical,
      potentialWaitSavings: gapToLow || undefined,
    };
  }

  if (pctBelowAvg >= 8 && gapToLow <= Math.max(15, avg90 * 0.06)) {
    return {
      recommendation: "BUY_NOW",
      headline: "This is one of the better prices we've seen for this product.",
      explanation: `You're currently paying €${savingsVsTypical} less than the typical price. It's not the absolute lowest (€${lowest}), but close enough that waiting may only save around €${gapToLow}.`,
      savingsVsTypical,
      potentialWaitSavings: gapToLow,
    };
  }

  if (
    gapToLow >= 25 ||
    current >= avg90 ||
    (advertisedDiscountPct && advertisedDiscountPct >= 20 && pctBelowAvg < 5)
  ) {
    return {
      recommendation: "AVOID",
      headline:
        "This isn't a particularly good deal despite the advertised discount.",
      explanation: `The product has mostly traded near €${Math.round(avg90)}. The current price is €${gapToLow} above the recent low.`,
      savingsVsTypical,
      potentialWaitSavings: gapToLow,
    };
  }

  return {
    recommendation: "WAIT",
    headline: `This product frequently drops below €${lowest + 20}.`,
    explanation: `It's currently €${current}. History suggests you might save around €${gapToLow} by waiting for a deeper dip.`,
    savingsVsTypical,
    potentialWaitSavings: gapToLow,
  };
}

export function scoreFrom(input: {
  current: number;
  avg90: number;
  lowest: number;
  recommendation: Recommendation;
}): ScoreBreakdown {
  const { current, avg90, lowest, recommendation } = input;
  const denom = avg90 - lowest || 1;
  const priceRatio = Math.max(
    0,
    Math.min(100, Math.round(100 - ((current - lowest) / denom) * 55)),
  );
  const history =
    recommendation === "BUY_NOW" ? 91 : recommendation === "WAIT" ? 72 : 48;
  const alternatives = recommendation === "AVOID" ? 62 : 78;
  const reviews = 89;
  const overall = Math.round(
    priceRatio * 0.4 + history * 0.3 + alternatives * 0.15 + reviews * 0.15,
  );
  return {
    overall,
    price: priceRatio,
    history,
    alternatives,
    reviews,
  };
}

export function realSaleFrom(input: {
  current: number;
  avg90: number;
  advertisedWas?: number;
}): { isUnusual: boolean; label: string; detail: string } {
  const { current, avg90, advertisedWas } = input;
  const belowTypical = current < avg90 * 0.95;
  if (advertisedWas && advertisedWas > avg90 * 1.15 && !belowTypical) {
    return {
      isUnusual: false,
      label: "Sale isn't unusual",
      detail: `The advertised ${Math.round(((advertisedWas - current) / advertisedWas) * 100)}% discount is based on a reference price that hasn't been representative recently. Typical price is around €${Math.round(avg90)}.`,
    };
  }
  if (belowTypical) {
    return {
      isUnusual: true,
      label: "Sale looks real",
      detail:
        "Current price is meaningfully below the 90-day average — not just a marked-up reference price.",
    };
  }
  return {
    isUnusual: false,
    label: "Sale isn't unusual",
    detail: `Current €${current} sits near the typical €${Math.round(avg90)}. Don't let the discount percentage make the decision for you.`,
  };
}
