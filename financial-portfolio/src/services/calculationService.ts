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
