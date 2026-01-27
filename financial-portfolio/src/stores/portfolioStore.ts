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
        set(data);
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
      version: 1,
    }
  )
);

// ===== Selector Hooks =====
export const useHoldings = () => usePortfolioStore((state) => state.holdings);
export const useBonds = () => usePortfolioStore((state) => state.bonds);
export const useGroups = () => usePortfolioStore((state) => state.groups);
export const useCashAccounts = () => usePortfolioStore((state) => state.cashAccounts);
export const useExchangeRates = () => usePortfolioStore((state) => state.exchangeRates);
export const useSettings = () => usePortfolioStore((state) => state.settings);
