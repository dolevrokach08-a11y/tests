// ===== Price API Types =====
export interface PriceData {
  symbol: string;
  price: number;
  currency: string;
  change: number;
  changePercent: number;
  lastUpdate: string;
  source: PriceSource;
}

export type PriceSource = 'tase' | 'yahoo' | 'manual' | 'unknown';

export interface PriceFetchResult {
  success: boolean;
  data?: PriceData;
  error?: string;
}

// ===== Exchange Rate API Types =====
export interface ExchangeRateData {
  base: string;
  rates: Record<string, number>;
  date: string;
  source: string;
}

// ===== API Response Types =====
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

// ===== Yahoo Finance Types =====
export interface YahooQuoteResponse {
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  currency: string;
  shortName: string;
}

// ===== TASE Types =====
export interface TASESecurityResponse {
  LastRate: number;
  BaseLastRate: number;
  ChangePercent: number;
  TradeDate: string;
}
