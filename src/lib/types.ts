export type Recommendation = "BUY_NOW" | "WAIT" | "AVOID";

export type StoreOffer = {
  store: string;
  price: number;
  url?: string;
  inStock: boolean;
};

export type Alternative = {
  name: string;
  price: number;
  note: string;
  delta: number;
};

export type ScoreBreakdown = {
  overall: number;
  price: number;
  history: number;
  alternatives: number;
  reviews: number;
};

export type PricePoint = {
  date: Date;
  price: number;
};

export type ProductAnalysis = {
  id: string;
  name: string;
  brand: string;
  imageHint: string;
  currency: "EUR";
  currentPrice: number;
  advertisedWas?: number;
  advertisedDiscountPct?: number;
  avg30: number;
  avg90: number;
  lowest: number;
  highest: number;
  recommendation: Recommendation;
  headline: string;
  explanation: string;
  savingsVsTypical: number;
  potentialWaitSavings?: number;
  realSale: {
    isUnusual: boolean;
    label: string;
    detail: string;
  };
  whyNot: string[];
  score: ScoreBreakdown;
  history: PricePoint[];
  stores: StoreOffer[];
  alternatives: Alternative[];
  sourceUrl: string;
  dataSource: "seeded-history" | "live+history" | "tracked" | "unresolved";
  lastMajorDropDays?: number;
  priceBehavior: string;
};
