// ===== Currency Types =====
export type Currency = 'ILS' | 'USD' | 'EUR';

export interface ExchangeRates {
  USD: number;
  EUR: number;
  lastUpdate: string;
}

// ===== Group Types =====
export interface Group {
  id: string;
  name: string;
  targetPercent: number;
  color: string;
}

// ===== Transaction Types =====
export type TransactionType = 'buy' | 'sell' | 'dividend' | 'split';

export interface Transaction {
  id: string;
  type: TransactionType;
  date: string; // ISO date string
  shares: number;
  pricePerShare: number;
  fees: number;
  note?: string;
}

// ===== Holding Types =====
export interface Holding {
  id: string;
  symbol: string;
  name: string;
  shares: number;
  currency: Currency;
  groupId: string | null;
  currentPrice: number;
  lastUpdate: string;
  transactions: Transaction[];
}

export interface HoldingWithCalculations extends Holding {
  costBasis: number;
  marketValue: number;
  marketValueILS: number;
  gainLoss: number;
  gainLossPercent: number;
}

// ===== Bond Types =====
export interface Bond {
  id: string;
  name: string;
  units: number;
  costBasis: number;
  currentPrice: number;
  lastUpdate: string;
  maturityDate?: string;
  couponRate?: number;
}

export interface BondWithCalculations extends Bond {
  marketValue: number;
  gainLoss: number;
  gainLossPercent: number;
}

// ===== Cash Types =====
export type CashTransactionType = 'deposit' | 'withdrawal' | 'exchange' | 'dividend' | 'interest';

export interface CashTransaction {
  id: string;
  type: CashTransactionType;
  date: string;
  amount: number;
  note?: string;
  relatedHoldingId?: string;
}

export interface CashAccount {
  currency: Currency;
  balance: number;
  transactions: CashTransaction[];
}

// ===== Snapshot Types (for TWR calculation) =====
export interface Snapshot {
  id: string;
  date: string;
  trigger: 'deposit' | 'withdrawal' | 'manual' | 'daily';
  note?: string;
  valueBeforeFlow: number;
  cashFlow: number;
  stocksValue: number;
  bondsValue: number;
  cashTotal: number;
}

// ===== Portfolio Settings =====
export interface PortfolioSettings {
  defaultCurrency: Currency;
  darkMode: boolean;
  autoRefreshPrices: boolean;
  refreshIntervalMinutes: number;
}

// ===== Main Portfolio Type =====
export interface Portfolio {
  holdings: Holding[];
  bonds: Bond[];
  groups: Group[];
  cashAccounts: Record<Currency, CashAccount>;
  exchangeRates: ExchangeRates;
  snapshots: Snapshot[];
  settings: PortfolioSettings;
}

// ===== Default Values =====
export const DEFAULT_SETTINGS: PortfolioSettings = {
  defaultCurrency: 'ILS',
  darkMode: false,
  autoRefreshPrices: true,
  refreshIntervalMinutes: 15,
};

export const DEFAULT_EXCHANGE_RATES: ExchangeRates = {
  USD: 3.75,
  EUR: 4.05,
  lastUpdate: new Date().toISOString(),
};

export const createEmptyPortfolio = (): Portfolio => ({
  holdings: [],
  bonds: [],
  groups: [
    { id: 'stocks-us', name: 'מניות ארה"ב', targetPercent: 40, color: '#8b5cf6' },
    { id: 'stocks-il', name: 'מניות ישראל', targetPercent: 20, color: '#06b6d4' },
    { id: 'bonds', name: 'אג"ח', targetPercent: 30, color: '#10b981' },
    { id: 'other', name: 'אחר', targetPercent: 10, color: '#f59e0b' },
  ],
  cashAccounts: {
    ILS: { currency: 'ILS', balance: 0, transactions: [] },
    USD: { currency: 'USD', balance: 0, transactions: [] },
    EUR: { currency: 'EUR', balance: 0, transactions: [] },
  },
  exchangeRates: DEFAULT_EXCHANGE_RATES,
  snapshots: [],
  settings: DEFAULT_SETTINGS,
});
