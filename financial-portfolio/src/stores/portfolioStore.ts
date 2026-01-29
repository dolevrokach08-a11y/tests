import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  Portfolio,
  Holding,
  Bond,
  Group,
  Currency,
  Transaction,
  CashTransaction,
  Snapshot,
  ExchangeRates,
  PortfolioSettings,
} from '@/types';
import { createEmptyPortfolio } from '@/types';

// ===== Helper to generate unique IDs =====
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// ===== Migration function for old data format =====
const migrateOldData = (data: Record<string, unknown>): Portfolio => {
  const empty = createEmptyPortfolio();

  // Ensure holdings array exists and each holding has transactions
  const holdings: Holding[] = Array.isArray(data.holdings)
    ? data.holdings.map((h: Record<string, unknown>) => ({
        id: String(h.id || generateId()),
        symbol: String(h.symbol || h.ticker || ''),
        name: String(h.name || h.symbol || ''),
        shares: Number(h.shares) || Number(h.units) || 0,
        currency: (h.currency as Currency) || 'ILS',
        groupId: h.groupId ? String(h.groupId) : (h.group ? String(h.group) : null),
        currentPrice: Number(h.currentPrice) || Number(h.price) || 0,
        lastUpdate: String(h.lastUpdate || new Date().toISOString()),
        transactions: Array.isArray(h.transactions) ? h.transactions : [],
      }))
    : [];

  // Ensure bonds array exists
  const bonds: Bond[] = Array.isArray(data.bonds)
    ? data.bonds.map((b: Record<string, unknown>) => ({
        id: String(b.id || generateId()),
        name: String(b.name || ''),
        units: Number(b.units) || 0,
        costBasis: Number(b.costBasis) || Number(b.cost) || 0,
        currentPrice: Number(b.currentPrice) || Number(b.price) || 0,
        lastUpdate: String(b.lastUpdate || new Date().toISOString()),
        maturityDate: b.maturityDate ? String(b.maturityDate) : undefined,
        couponRate: b.couponRate ? Number(b.couponRate) : undefined,
      }))
    : [];

  // Ensure groups array exists
  const groups: Group[] = Array.isArray(data.groups)
    ? data.groups.map((g: Record<string, unknown>) => ({
        id: String(g.id || generateId()),
        name: String(g.name || ''),
        targetPercent: Number(g.targetPercent) || Number(g.target) || 0,
        color: String(g.color || '#8b5cf6'),
      }))
    : empty.groups;

  // Ensure cashAccounts exists with proper structure
  let cashAccounts = empty.cashAccounts;
  if (data.cashAccounts && typeof data.cashAccounts === 'object') {
    const ca = data.cashAccounts as Record<string, unknown>;
    cashAccounts = {
      ILS: {
        currency: 'ILS',
        balance: Number((ca.ILS as Record<string, unknown>)?.balance) || 0,
        transactions: Array.isArray((ca.ILS as Record<string, unknown>)?.transactions)
          ? ((ca.ILS as Record<string, unknown>).transactions as CashTransaction[])
          : [],
      },
      USD: {
        currency: 'USD',
        balance: Number((ca.USD as Record<string, unknown>)?.balance) || 0,
        transactions: Array.isArray((ca.USD as Record<string, unknown>)?.transactions)
          ? ((ca.USD as Record<string, unknown>).transactions as CashTransaction[])
          : [],
      },
      EUR: {
        currency: 'EUR',
        balance: Number((ca.EUR as Record<string, unknown>)?.balance) || 0,
        transactions: Array.isArray((ca.EUR as Record<string, unknown>)?.transactions)
          ? ((ca.EUR as Record<string, unknown>).transactions as CashTransaction[])
          : [],
      },
    };
  } else if (data.cash && typeof data.cash === 'object') {
    // Old format might use 'cash' instead of 'cashAccounts'
    const cash = data.cash as Record<string, number>;
    cashAccounts = {
      ILS: { currency: 'ILS', balance: Number(cash.ILS) || 0, transactions: [] },
      USD: { currency: 'USD', balance: Number(cash.USD) || 0, transactions: [] },
      EUR: { currency: 'EUR', balance: Number(cash.EUR) || 0, transactions: [] },
    };
  }

  // Ensure snapshots array exists
  const snapshots: Snapshot[] = Array.isArray(data.snapshots) ? data.snapshots : [];

  // Ensure exchangeRates exists
  const exchangeRates: ExchangeRates = {
    USD: Number((data.exchangeRates as Record<string, unknown>)?.USD) || empty.exchangeRates.USD,
    EUR: Number((data.exchangeRates as Record<string, unknown>)?.EUR) || empty.exchangeRates.EUR,
    lastUpdate:
      ((data.exchangeRates as Record<string, unknown>)?.lastUpdate as string) ||
      new Date().toISOString(),
  };

  // Ensure settings exists
  const settings: PortfolioSettings = {
    ...empty.settings,
    ...(data.settings as Partial<PortfolioSettings>),
  };

  return {
    holdings,
    bonds,
    groups,
    cashAccounts,
    exchangeRates,
    snapshots,
    settings,
  };
};

// ===== Store Interface =====
interface PortfolioStore extends Portfolio {
  // Holdings Actions
  addHolding: (holding: Omit<Holding, 'id' | 'transactions' | 'lastUpdate'>) => void;
  updateHolding: (id: string, updates: Partial<Holding>) => void;
  deleteHolding: (id: string) => void;
  updateHoldingPrice: (id: string, price: number) => void;
  addTransaction: (holdingId: string, transaction: Omit<Transaction, 'id'>) => void;

  // Bonds Actions
  addBond: (bond: Omit<Bond, 'id' | 'lastUpdate'>) => void;
  updateBond: (id: string, updates: Partial<Bond>) => void;
  deleteBond: (id: string) => void;

  // Groups Actions
  addGroup: (group: Omit<Group, 'id'>) => void;
  updateGroup: (id: string, updates: Partial<Group>) => void;
  deleteGroup: (id: string) => void;

  // Cash Actions
  updateCashBalance: (currency: Currency, amount: number) => void;
  addCashTransaction: (currency: Currency, transaction: Omit<CashTransaction, 'id'>) => void;
  executeCurrencyExchange: (from: Currency, to: Currency, amount: number, rate: number) => void;

  // Snapshot Actions
  addSnapshot: (snapshot: Omit<Snapshot, 'id'>) => void;

  // Settings & Rates Actions
  updateExchangeRates: (rates: Partial<ExchangeRates>) => void;
  updateSettings: (settings: Partial<PortfolioSettings>) => void;

  // Data Management
  importPortfolio: (data: Portfolio) => void;
  resetPortfolio: () => void;

  // Computed Values (selectors)
  getHoldingById: (id: string) => Holding | undefined;
  getHoldingsByGroup: (groupId: string) => Holding[];
  getTotalCashILS: () => number;
}

// ===== Create Store =====
export const usePortfolioStore = create<PortfolioStore>()(
  persist(
    (set, get) => ({
      // Initial State
      ...createEmptyPortfolio(),

      // ===== Holdings Actions =====
      addHolding: (holdingData) => {
        const newHolding: Holding = {
          ...holdingData,
          id: generateId(),
          transactions: [],
          lastUpdate: new Date().toISOString(),
        };
        set((state) => ({
          holdings: [...state.holdings, newHolding],
        }));
      },

      updateHolding: (id, updates) => {
        set((state) => ({
          holdings: state.holdings.map((h) =>
            h.id === id ? { ...h, ...updates, lastUpdate: new Date().toISOString() } : h
          ),
        }));
      },

      deleteHolding: (id) => {
        set((state) => ({
          holdings: state.holdings.filter((h) => h.id !== id),
        }));
      },

      updateHoldingPrice: (id, price) => {
        set((state) => ({
          holdings: state.holdings.map((h) =>
            h.id === id
              ? { ...h, currentPrice: price, lastUpdate: new Date().toISOString() }
              : h
          ),
        }));
      },

      addTransaction: (holdingId, transactionData) => {
        const newTransaction: Transaction = {
          ...transactionData,
          id: generateId(),
        };
        set((state) => ({
          holdings: state.holdings.map((h) =>
            h.id === holdingId
              ? {
                  ...h,
                  transactions: [...h.transactions, newTransaction],
                  shares:
                    transactionData.type === 'buy'
                      ? h.shares + transactionData.shares
                      : transactionData.type === 'sell'
                      ? h.shares - transactionData.shares
                      : h.shares,
                }
              : h
          ),
        }));
      },

      // ===== Bonds Actions =====
      addBond: (bondData) => {
        const newBond: Bond = {
          ...bondData,
          id: generateId(),
          lastUpdate: new Date().toISOString(),
        };
        set((state) => ({
          bonds: [...state.bonds, newBond],
        }));
      },

      updateBond: (id, updates) => {
        set((state) => ({
          bonds: state.bonds.map((b) =>
            b.id === id ? { ...b, ...updates, lastUpdate: new Date().toISOString() } : b
          ),
        }));
      },

      deleteBond: (id) => {
        set((state) => ({
          bonds: state.bonds.filter((b) => b.id !== id),
        }));
      },

      // ===== Groups Actions =====
      addGroup: (groupData) => {
        const newGroup: Group = {
          ...groupData,
          id: generateId(),
        };
        set((state) => ({
          groups: [...state.groups, newGroup],
        }));
      },

      updateGroup: (id, updates) => {
        set((state) => ({
          groups: state.groups.map((g) => (g.id === id ? { ...g, ...updates } : g)),
        }));
      },

      deleteGroup: (id) => {
        set((state) => ({
          groups: state.groups.filter((g) => g.id !== id),
          // Also remove group assignment from holdings
          holdings: state.holdings.map((h) =>
            h.groupId === id ? { ...h, groupId: null } : h
          ),
        }));
      },

      // ===== Cash Actions =====
      updateCashBalance: (currency, amount) => {
        set((state) => ({
          cashAccounts: {
            ...state.cashAccounts,
            [currency]: {
              ...state.cashAccounts[currency],
              balance: amount,
            },
          },
        }));
      },

      addCashTransaction: (currency, transactionData) => {
        const newTransaction: CashTransaction = {
          ...transactionData,
          id: generateId(),
        };
        set((state) => {
          const account = state.cashAccounts[currency];
          const balanceChange =
            transactionData.type === 'deposit' || transactionData.type === 'dividend'
              ? transactionData.amount
              : -transactionData.amount;

          return {
            cashAccounts: {
              ...state.cashAccounts,
              [currency]: {
                ...account,
                balance: account.balance + balanceChange,
                transactions: [...account.transactions, newTransaction],
              },
            },
          };
        });
      },

      executeCurrencyExchange: (from, to, amount, rate) => {
        const toAmount = amount * rate;
        set((state) => ({
          cashAccounts: {
            ...state.cashAccounts,
            [from]: {
              ...state.cashAccounts[from],
              balance: state.cashAccounts[from].balance - amount,
              transactions: [
                ...state.cashAccounts[from].transactions,
                {
                  id: generateId(),
                  type: 'exchange',
                  date: new Date().toISOString(),
                  amount: -amount,
                  note: `המרה ל-${to} בשער ${rate}`,
                },
              ],
            },
            [to]: {
              ...state.cashAccounts[to],
              balance: state.cashAccounts[to].balance + toAmount,
              transactions: [
                ...state.cashAccounts[to].transactions,
                {
                  id: generateId(),
                  type: 'exchange',
                  date: new Date().toISOString(),
                  amount: toAmount,
                  note: `המרה מ-${from} בשער ${rate}`,
                },
              ],
            },
          },
        }));
      },

      // ===== Snapshot Actions =====
      addSnapshot: (snapshotData) => {
        const newSnapshot: Snapshot = {
          ...snapshotData,
          id: generateId(),
        };
        set((state) => ({
          snapshots: [...state.snapshots, newSnapshot],
        }));
      },

      // ===== Settings & Rates Actions =====
      updateExchangeRates: (rates) => {
        set((state) => ({
          exchangeRates: {
            ...state.exchangeRates,
            ...rates,
            lastUpdate: new Date().toISOString(),
          },
        }));
      },

      updateSettings: (settings) => {
        set((state) => ({
          settings: { ...state.settings, ...settings },
        }));
      },

      // ===== Data Management =====
      importPortfolio: (data) => {
        // Migrate old data format to new format
        const migratedData = migrateOldData(data as unknown as Record<string, unknown>);
        set(migratedData);
      },

      resetPortfolio: () => {
        set(createEmptyPortfolio());
      },

      // ===== Computed Values =====
      getHoldingById: (id) => {
        return get().holdings.find((h) => h.id === id);
      },

      getHoldingsByGroup: (groupId) => {
        return get().holdings.filter((h) => h.groupId === groupId);
      },

      getTotalCashILS: () => {
        const state = get();
        const { USD, EUR } = state.exchangeRates;
        return (
          state.cashAccounts.ILS.balance +
          state.cashAccounts.USD.balance * USD +
          state.cashAccounts.EUR.balance * EUR
        );
      },
    }),
    {
      name: 'financial-portfolio-storage',
      storage: createJSONStorage(() => localStorage),
      version: 2,
      migrate: (persistedState, version) => {
        // Migrate from any old version to new format
        if (version < 2) {
          return migrateOldData(persistedState as Record<string, unknown>);
        }
        return persistedState as Portfolio;
      },
    }
  )
);

// ===== Selector Hooks (with defensive defaults) =====
const empty = createEmptyPortfolio();
export const useHoldings = () => usePortfolioStore((state) => state.holdings ?? []);
export const useBonds = () => usePortfolioStore((state) => state.bonds ?? []);
export const useGroups = () => usePortfolioStore((state) => state.groups ?? empty.groups);
export const useCashAccounts = () =>
  usePortfolioStore((state) => state.cashAccounts ?? empty.cashAccounts);
export const useExchangeRates = () =>
  usePortfolioStore((state) => state.exchangeRates ?? empty.exchangeRates);
export const useSettings = () => usePortfolioStore((state) => state.settings ?? empty.settings);
export const useSnapshots = () => usePortfolioStore((state) => state.snapshots ?? []);
