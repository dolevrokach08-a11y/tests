import { useMemo } from 'react';
import { usePortfolioStore } from '@/stores/portfolioStore';
import { calculatePortfolioSummary } from '@/services/calculationService';
import type { PortfolioSummary } from '@/types';

export function usePortfolioSummary(): PortfolioSummary {
  const holdings = usePortfolioStore((state) => state.holdings);
  const bonds = usePortfolioStore((state) => state.bonds);
  const cashAccounts = usePortfolioStore((state) => state.cashAccounts);
  const exchangeRates = usePortfolioStore((state) => state.exchangeRates);
  const snapshots = usePortfolioStore((state) => state.snapshots);

  return useMemo(
    () =>
      calculatePortfolioSummary(
        holdings,
        bonds,
        cashAccounts,
        exchangeRates,
        snapshots
      ),
    [holdings, bonds, cashAccounts, exchangeRates, snapshots]
  );
}
