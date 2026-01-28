import type {
  Holding,
  Bond,
  Snapshot,
  Currency,
  ExchangeRates,
  Group,
  CashAccount,
  HoldingWithCalculations,
  BondWithCalculations,
} from '@/types';
import type {
  TWRResult,
  AllocationResult,
  AllocationItem,
  PortfolioSummary,
} from '@/types';

// ===== Currency Conversion =====
export function convertToILS(
  amount: number,
  currency: Currency,
  rates: ExchangeRates
): number {
  if (currency === 'ILS') return amount;
  return amount * rates[currency];
}

// ===== Holding Calculations =====
export function calculateHolding(
  holding: Holding,
  rates: ExchangeRates
): HoldingWithCalculations {
  // Calculate cost basis from transactions
  const costBasis = holding.transactions
    .filter((t) => t.type === 'buy')
    .reduce((sum, t) => sum + t.shares * t.pricePerShare + t.fees, 0);

  const marketValue = holding.shares * holding.currentPrice;
  const marketValueILS = convertToILS(marketValue, holding.currency, rates);
  const gainLoss = marketValue - costBasis;
  const gainLossPercent = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;

  return {
    ...holding,
    costBasis,
    marketValue,
    marketValueILS,
    gainLoss,
    gainLossPercent,
  };
}

// ===== Bond Calculations =====
export function calculateBond(bond: Bond): BondWithCalculations {
  const marketValue = bond.units * bond.currentPrice;
  const gainLoss = marketValue - bond.costBasis;
  const gainLossPercent = bond.costBasis > 0 ? (gainLoss / bond.costBasis) * 100 : 0;

  return {
    ...bond,
    marketValue,
    gainLoss,
    gainLossPercent,
  };
}

// ===== TWR Calculation =====
export function calculateTWR(snapshots: Snapshot[]): TWRResult | null {
  if (snapshots.length < 2) {
    return null;
  }

  // Sort snapshots by date
  const sorted = [...snapshots].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  let cumulativeReturn = 1;

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];

    // Value at end of period = value before any cash flow in current snapshot
    const endValue = curr.valueBeforeFlow;
    // Value at start of period = value after cash flow in previous snapshot
    const startValue = prev.valueBeforeFlow + prev.cashFlow;

    if (startValue > 0) {
      const periodReturn = endValue / startValue;
      cumulativeReturn *= periodReturn;
    }
  }

  const totalReturn = (cumulativeReturn - 1) * 100;

  // Calculate period in days
  const firstDate = new Date(sorted[0].date);
  const lastDate = new Date(sorted[sorted.length - 1].date);
  const periodDays = Math.max(
    1,
    (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Annualized return (CAGR)
  const years = periodDays / 365;
  const annualizedReturn =
    years > 0 ? (Math.pow(cumulativeReturn, 1 / years) - 1) * 100 : totalReturn;

  return {
    totalReturn,
    annualizedReturn,
    baseReturn: totalReturn, // Could split this further if needed
    liveReturn: 0,
    periodDays,
  };
}

// ===== XIRR Calculation (Newton-Raphson method) =====
export function calculateXIRR(
  cashFlows: { date: Date; amount: number }[],
  guess: number = 0.1
): number | null {
  if (cashFlows.length < 2) return null;

  const sorted = [...cashFlows].sort((a, b) => a.date.getTime() - b.date.getTime());
  const firstDate = sorted[0].date;

  const xnpv = (rate: number): number => {
    return sorted.reduce((sum, cf) => {
      const years =
        (cf.date.getTime() - firstDate.getTime()) / (365 * 24 * 60 * 60 * 1000);
      return sum + cf.amount / Math.pow(1 + rate, years);
    }, 0);
  };

  const xnpvDerivative = (rate: number): number => {
    return sorted.reduce((sum, cf) => {
      const years =
        (cf.date.getTime() - firstDate.getTime()) / (365 * 24 * 60 * 60 * 1000);
      return sum - (years * cf.amount) / Math.pow(1 + rate, years + 1);
    }, 0);
  };

  let rate = guess;
  const maxIterations = 100;
  const tolerance = 0.00001;

  for (let i = 0; i < maxIterations; i++) {
    const npv = xnpv(rate);
    const derivative = xnpvDerivative(rate);

    if (Math.abs(derivative) < 1e-10) break;

    const newRate = rate - npv / derivative;

    if (Math.abs(newRate - rate) < tolerance) {
      return newRate * 100; // Return as percentage
    }

    rate = newRate;
  }

  return null;
}

// ===== Allocation Calculation =====
export function calculateAllocation(
  holdings: HoldingWithCalculations[],
  groups: Group[]
): AllocationResult {
  const totalValue = holdings.reduce((sum, h) => sum + h.marketValueILS, 0);

  if (totalValue === 0) {
    return {
      items: groups.map((g) => ({
        groupId: g.id,
        groupName: g.name,
        currentValue: 0,
        currentPercent: 0,
        targetPercent: g.targetPercent,
        difference: -g.targetPercent,
        differenceValue: 0,
        color: g.color,
      })),
      totalValue: 0,
      rebalanceNeeded: false,
    };
  }

  const items: AllocationItem[] = groups.map((group) => {
    const groupHoldings = holdings.filter((h) => h.groupId === group.id);
    const currentValue = groupHoldings.reduce((sum, h) => sum + h.marketValueILS, 0);
    const currentPercent = (currentValue / totalValue) * 100;
    const difference = currentPercent - group.targetPercent;
    const differenceValue = (difference / 100) * totalValue;

    return {
      groupId: group.id,
      groupName: group.name,
      currentValue,
      currentPercent,
      targetPercent: group.targetPercent,
      difference,
      differenceValue,
      color: group.color,
    };
  });

  // Check if rebalance is needed (any allocation off by more than 5%)
  const rebalanceNeeded = items.some((item) => Math.abs(item.difference) > 5);

  return {
    items,
    totalValue,
    rebalanceNeeded,
  };
}

// ===== Advanced Risk Metrics =====

export interface RiskMetrics {
  sharpeRatio: number | null;
  sortinoRatio: number | null;
  maxDrawdown: number;
  maxDrawdownDate: string | null;
  volatility: number;
  beta: number | null;
}

export interface ConcentrationRisk {
  topHoldingPercent: number;
  top5HoldingsPercent: number;
  herfindahlIndex: number; // HHI - measure of concentration
  isConcentrated: boolean;
}

export interface CurrencyExposure {
  ILS: number;
  USD: number;
  EUR: number;
  totalILS: number;
}

// Calculate returns from snapshots
function calculateReturns(snapshots: Snapshot[]): number[] {
  if (snapshots.length < 2) return [];

  const sorted = [...snapshots].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const returns: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    const prevValue = prev.stocksValue + prev.bondsValue + prev.cashTotal;
    const currValue = curr.stocksValue + curr.bondsValue + curr.cashTotal;

    if (prevValue > 0) {
      returns.push((currValue - prevValue) / prevValue);
    }
  }

  return returns;
}

// Calculate standard deviation
function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / (values.length - 1));
}

// Calculate downside deviation (for Sortino)
function downsideDeviation(returns: number[], threshold: number = 0): number {
  const downsideReturns = returns.filter((r) => r < threshold);
  if (downsideReturns.length < 2) return 0;
  const squaredDiffs = downsideReturns.map((r) => Math.pow(r - threshold, 2));
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / downsideReturns.length);
}

// Sharpe Ratio = (Return - Risk-free rate) / Standard Deviation
export function calculateSharpeRatio(
  snapshots: Snapshot[],
  riskFreeRate: number = 0.04 // 4% annual risk-free rate
): number | null {
  const returns = calculateReturns(snapshots);
  if (returns.length < 12) return null; // Need at least 12 periods

  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const annualizedReturn = avgReturn * 12; // Assuming monthly returns
  const annualizedStdDev = standardDeviation(returns) * Math.sqrt(12);

  if (annualizedStdDev === 0) return null;

  return (annualizedReturn - riskFreeRate) / annualizedStdDev;
}

// Sortino Ratio = (Return - Risk-free rate) / Downside Deviation
export function calculateSortinoRatio(
  snapshots: Snapshot[],
  riskFreeRate: number = 0.04
): number | null {
  const returns = calculateReturns(snapshots);
  if (returns.length < 12) return null;

  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const annualizedReturn = avgReturn * 12;
  const annualizedDownside = downsideDeviation(returns) * Math.sqrt(12);

  if (annualizedDownside === 0) return null;

  return (annualizedReturn - riskFreeRate) / annualizedDownside;
}

// Max Drawdown = largest peak-to-trough decline
export function calculateMaxDrawdown(snapshots: Snapshot[]): {
  maxDrawdown: number;
  maxDrawdownDate: string | null;
} {
  if (snapshots.length < 2) {
    return { maxDrawdown: 0, maxDrawdownDate: null };
  }

  const sorted = [...snapshots].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  let peak = 0;
  let maxDrawdown = 0;
  let maxDrawdownDate: string | null = null;

  for (const snapshot of sorted) {
    const value = snapshot.stocksValue + snapshot.bondsValue + snapshot.cashTotal;

    if (value > peak) {
      peak = value;
    }

    const drawdown = peak > 0 ? (peak - value) / peak : 0;

    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
      maxDrawdownDate = snapshot.date;
    }
  }

  return { maxDrawdown: maxDrawdown * 100, maxDrawdownDate };
}

// Calculate all risk metrics
export function calculateRiskMetrics(snapshots: Snapshot[]): RiskMetrics {
  const { maxDrawdown, maxDrawdownDate } = calculateMaxDrawdown(snapshots);
  const returns = calculateReturns(snapshots);
  const volatility = standardDeviation(returns) * Math.sqrt(12) * 100; // Annualized

  return {
    sharpeRatio: calculateSharpeRatio(snapshots),
    sortinoRatio: calculateSortinoRatio(snapshots),
    maxDrawdown,
    maxDrawdownDate,
    volatility,
    beta: null, // Would need benchmark data
  };
}

// Concentration risk analysis
export function calculateConcentrationRisk(
  holdings: HoldingWithCalculations[]
): ConcentrationRisk {
  const totalValue = holdings.reduce((sum, h) => sum + h.marketValueILS, 0);

  if (totalValue === 0) {
    return {
      topHoldingPercent: 0,
      top5HoldingsPercent: 0,
      herfindahlIndex: 0,
      isConcentrated: false,
    };
  }

  // Sort by value descending
  const sorted = [...holdings].sort((a, b) => b.marketValueILS - a.marketValueILS);

  const topHoldingPercent =
    sorted.length > 0 ? (sorted[0].marketValueILS / totalValue) * 100 : 0;

  const top5HoldingsPercent =
    sorted.slice(0, 5).reduce((sum, h) => sum + h.marketValueILS, 0) / totalValue * 100;

  // Herfindahl-Hirschman Index (HHI)
  const herfindahlIndex = holdings.reduce((sum, h) => {
    const weight = h.marketValueILS / totalValue;
    return sum + Math.pow(weight * 100, 2);
  }, 0);

  // HHI > 2500 is considered concentrated
  // Single holding > 25% is considered concentrated
  const isConcentrated = herfindahlIndex > 2500 || topHoldingPercent > 25;

  return {
    topHoldingPercent,
    top5HoldingsPercent,
    herfindahlIndex,
    isConcentrated,
  };
}

// Currency exposure analysis
export function calculateCurrencyExposure(
  holdings: HoldingWithCalculations[],
  rates: ExchangeRates
): CurrencyExposure {
  const exposure = { ILS: 0, USD: 0, EUR: 0 };

  holdings.forEach((h) => {
    exposure[h.currency] += h.marketValue;
  });

  // Convert to ILS for total
  const totalILS =
    exposure.ILS +
    exposure.USD * rates.USD +
    exposure.EUR * rates.EUR;

  return {
    ...exposure,
    totalILS,
  };
}

// ===== Portfolio Summary =====
export function calculatePortfolioSummary(
  holdings: Holding[],
  bonds: Bond[],
  cashAccounts: Record<Currency, CashAccount>,
  rates: ExchangeRates,
  snapshots: Snapshot[]
): PortfolioSummary {
  // Calculate holdings
  const holdingsWithCalc = holdings.map((h) => calculateHolding(h, rates));
  const stocksValue = holdingsWithCalc.reduce((sum, h) => sum + h.marketValueILS, 0);
  const totalCostBasis = holdingsWithCalc.reduce((sum, h) => {
    const costInILS = convertToILS(h.costBasis, h.currency, rates);
    return sum + costInILS;
  }, 0);

  // Calculate bonds
  const bondsWithCalc = bonds.map(calculateBond);
  const bondsValue = bondsWithCalc.reduce((sum, b) => sum + b.marketValue, 0);

  // Calculate cash
  const cashByCategory: Record<Currency, number> = {
    ILS: cashAccounts.ILS.balance,
    USD: cashAccounts.USD.balance,
    EUR: cashAccounts.EUR.balance,
  };

  const cashValue =
    cashByCategory.ILS +
    cashByCategory.USD * rates.USD +
    cashByCategory.EUR * rates.EUR;

  // Total portfolio value
  const totalValueILS = stocksValue + bondsValue + cashValue;
  const totalGainLoss = totalValueILS - totalCostBasis - cashValue;
  const totalGainLossPercent =
    totalCostBasis > 0 ? (totalGainLoss / totalCostBasis) * 100 : 0;

  // TWR
  const twr = calculateTWR(snapshots);

  return {
    totalValueILS,
    totalCostBasis,
    totalGainLoss,
    totalGainLossPercent,
    stocksValue,
    bondsValue,
    cashValue,
    holdingsCount: holdings.length,
    bondsCount: bonds.length,
    cashByCategory,
    twr,
  };
}
