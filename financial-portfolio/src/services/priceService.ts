import type { PriceData, PriceFetchResult, PriceSource } from '@/types';

// ===== Price Provider Interface =====
interface PriceProvider {
  name: PriceSource;
  supports: (symbol: string) => boolean;
  fetch: (symbol: string) => Promise<PriceFetchResult>;
}

// ===== Israeli Market Detection =====
const isIsraeliSymbol = (symbol: string): boolean => {
  // Israeli symbols typically end with .TA or are numeric
  return symbol.endsWith('.TA') || /^\d+$/.test(symbol);
};

// ===== TASE Provider (Israeli Market) =====
const taseProvider: PriceProvider = {
  name: 'tase',
  supports: isIsraeliSymbol,

  async fetch(symbol: string): Promise<PriceFetchResult> {
    try {
      // Clean symbol for TASE
      const cleanSymbol = symbol.replace('.TA', '');

      const response = await fetch(
        `https://api.allorigins.win/raw?url=${encodeURIComponent(
          `https://market.tase.co.il/api/web/securities/${cleanSymbol}/daily-data`
        )}`
      );

      if (!response.ok) {
        throw new Error(`TASE API error: ${response.status}`);
      }

      const data = await response.json();

      return {
        success: true,
        data: {
          symbol,
          price: data.LastRate || data.BaseLastRate,
          currency: 'ILS',
          change: data.Change || 0,
          changePercent: data.ChangePercent || 0,
          lastUpdate: new Date().toISOString(),
          source: 'tase',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
};

// ===== Yahoo Finance Provider =====
const yahooProvider: PriceProvider = {
  name: 'yahoo',
  supports: () => true, // Fallback for all symbols

  async fetch(symbol: string): Promise<PriceFetchResult> {
    try {
      // Try Yahoo Finance chart API via proxy
      const response = await fetch(
        `https://api.allorigins.win/raw?url=${encodeURIComponent(
          `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`
        )}`
      );

      if (!response.ok) {
        throw new Error(`Yahoo API error: ${response.status}`);
      }

      const data = await response.json();
      const quote = data.chart?.result?.[0]?.meta;

      if (!quote) {
        throw new Error('No quote data');
      }

      return {
        success: true,
        data: {
          symbol,
          price: quote.regularMarketPrice,
          currency: quote.currency || 'USD',
          change: quote.regularMarketPrice - quote.previousClose,
          changePercent:
            ((quote.regularMarketPrice - quote.previousClose) / quote.previousClose) * 100,
          lastUpdate: new Date().toISOString(),
          source: 'yahoo',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
};

// ===== Price Service =====
class PriceService {
  private providers: PriceProvider[] = [taseProvider, yahooProvider];
  private cache: Map<string, { data: PriceData; timestamp: number }> = new Map();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  async getPrice(symbol: string): Promise<PriceFetchResult> {
    // Check cache first
    const cached = this.cache.get(symbol);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return { success: true, data: cached.data };
    }

    // Try providers in order
    for (const provider of this.providers) {
      if (provider.supports(symbol)) {
        const result = await provider.fetch(symbol);

        if (result.success && result.data) {
          // Cache successful result
          this.cache.set(symbol, {
            data: result.data,
            timestamp: Date.now(),
          });
          return result;
        }
      }
    }

    return {
      success: false,
      error: `Could not fetch price for ${symbol}`,
    };
  }

  async getPrices(symbols: string[]): Promise<Map<string, PriceFetchResult>> {
    const results = new Map<string, PriceFetchResult>();

    // Fetch all prices in parallel
    const promises = symbols.map(async (symbol) => {
      const result = await this.getPrice(symbol);
      results.set(symbol, result);
    });

    await Promise.all(promises);
    return results;
  }

  clearCache(): void {
    this.cache.clear();
  }
}

// ===== Exchange Rate Service =====
export async function fetchExchangeRates(): Promise<{
  USD: number;
  EUR: number;
} | null> {
  // Try multiple APIs in order of preference
  const apis = [
    // 1. ExchangeRate API (free, supports ILS)
    async () => {
      const response = await fetch(
        'https://api.exchangerate-api.com/v4/latest/USD'
      );
      if (!response.ok) throw new Error('ExchangeRate API error');
      const data = await response.json();
      // This gives us rates FROM USD, so USD->ILS rate is data.rates.ILS
      const usdToIls = data.rates.ILS;
      const eurToIls = data.rates.ILS / data.rates.EUR;
      return { USD: usdToIls, EUR: eurToIls };
    },

    // 2. Open Exchange Rates (backup)
    async () => {
      const response = await fetch(
        'https://open.er-api.com/v6/latest/USD'
      );
      if (!response.ok) throw new Error('Open ER API error');
      const data = await response.json();
      const usdToIls = data.rates.ILS;
      const eurToIls = data.rates.ILS / data.rates.EUR;
      return { USD: usdToIls, EUR: eurToIls };
    },

    // 3. Bank of Israel XML (last resort)
    async () => {
      const response = await fetch(
        'https://api.allorigins.win/raw?url=' +
          encodeURIComponent('https://www.boi.org.il/currency.xml')
      );
      if (!response.ok) throw new Error('BOI API error');
      const text = await response.text();

      // Parse XML to get rates
      const usdMatch = text.match(/<CURRENCYCODE>USD<\/CURRENCYCODE>[\s\S]*?<RATE>([\d.]+)<\/RATE>/);
      const eurMatch = text.match(/<CURRENCYCODE>EUR<\/CURRENCYCODE>[\s\S]*?<RATE>([\d.]+)<\/RATE>/);

      if (!usdMatch || !eurMatch) throw new Error('Could not parse BOI rates');

      return {
        USD: parseFloat(usdMatch[1]),
        EUR: parseFloat(eurMatch[1]),
      };
    },
  ];

  for (const apiFn of apis) {
    try {
      const rates = await apiFn();
      if (rates.USD > 0 && rates.EUR > 0) {
        console.log('Exchange rates fetched successfully:', rates);
        return rates;
      }
    } catch (error) {
      console.warn('API failed, trying next...', error);
      continue;
    }
  }

  console.warn('All exchange rate APIs failed, using defaults');
  return null;
}

// ===== Singleton Export =====
export const priceService = new PriceService();
