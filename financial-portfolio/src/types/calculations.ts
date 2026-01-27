import type { Currency } from './portfolio';

// ===== TWR (Time Weighted Return) =====
export interface TWRResult {
  totalReturn: number;         // אחוז תשואה כולל
  annualizedReturn: number;    // CAGR - תשואה שנתית
  baseReturn: number;          // תשואה עד לעדכון האחרון
  liveReturn: number;          // תשואה מאז העדכון האחרון
  periodDays: number;          // מספר ימים בתקופה
}

// ===== XIRR (Internal Rate of Return) =====
export interface XIRRCashFlow {
  date: Date;
  amount: number;
}

// ===== Allocation =====
export interface AllocationItem {
  groupId: string;
  groupName: string;
  currentValue: number;
  currentPercent: number;
  targetPercent: number;
  difference: number;         // הפרש באחוזים
  differenceValue: number;    // הפרש בשקלים
  color: string;
}

export interface AllocationResult {
  items: AllocationItem[];
  totalValue: number;
  rebalanceNeeded: boolean;
}

// ===== Portfolio Summary =====
export interface PortfolioSummary {
  totalValueILS: number;
  totalCostBasis: number;
  totalGainLoss: number;
  totalGainLossPercent: number;

  stocksValue: number;
  bondsValue: number;
  cashValue: number;

  holdingsCount: number;
  bondsCount: number;

  cashByCategory: Record<Currency, number>;

  twr: TWRResult | null;
}

// ===== Chart Data Types =====
export interface TimeSeriesDataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface PieChartDataPoint {
  name: string;
  value: number;
  color: string;
  percent: number;
}

export interface PerformanceDataPoint {
  date: string;
  portfolioValue: number;
  benchmark?: number;
}
