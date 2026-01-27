import { useState, useCallback } from 'react';
import { usePortfolioStore } from '@/stores/portfolioStore';
import { priceService, fetchExchangeRates } from '@/services/priceService';

interface UsePriceRefreshResult {
  isRefreshing: boolean;
  lastRefresh: Date | null;
  refreshPrices: () => Promise<void>;
  refreshRates: () => Promise<void>;
  refreshAll: () => Promise<void>;
}

export function usePriceRefresh(): UsePriceRefreshResult {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const holdings = usePortfolioStore((state) => state.holdings);
  const updateHoldingPrice = usePortfolioStore((state) => state.updateHoldingPrice);
  const updateExchangeRates = usePortfolioStore((state) => state.updateExchangeRates);

  const refreshPrices = useCallback(async () => {
    setIsRefreshing(true);

    try {
      const symbols = holdings.map((h) => h.symbol);
      const results = await priceService.getPrices(symbols);

      results.forEach((result, symbol) => {
        if (result.success && result.data) {
          const holding = holdings.find((h) => h.symbol === symbol);
          if (holding) {
            updateHoldingPrice(holding.id, result.data.price);
          }
        }
      });

      setLastRefresh(new Date());
    } finally {
      setIsRefreshing(false);
    }
  }, [holdings, updateHoldingPrice]);

  const refreshRates = useCallback(async () => {
    const rates = await fetchExchangeRates();
    if (rates) {
      updateExchangeRates(rates);
    }
  }, [updateExchangeRates]);

  const refreshAll = useCallback(async () => {
    await Promise.all([refreshPrices(), refreshRates()]);
  }, [refreshPrices, refreshRates]);

  return {
    isRefreshing,
    lastRefresh,
    refreshPrices,
    refreshRates,
    refreshAll,
  };
}
