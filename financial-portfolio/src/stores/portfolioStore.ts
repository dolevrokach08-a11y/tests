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

  // Get purchases and sales arrays for building transactions
  const purchases = Array.isArray(data.purchases) ? data.purchases as Record<string, unknown>[] : [];
  const sales = Array.isArray(data.sales) ? data.sales as Record<string, unknown>[] : [];

  // Build transactions map by assetId
  const transactionsByAsset = new Map<string, Transaction[]>();

  // Process purchases -> buy transactions
  purchases.forEach((p) => {
    if (p.assetType !== 'stocks') return;
    const assetId = String(p.assetId || p.id);
    if (!transactionsByAsset.has(assetId)) {
      transactionsByAsset.set(assetId, []);
    }
    transactionsByAsset.get(assetId)!.push({
      id: String(p.id || generateId()),
      type: 'buy',
      date: String(p.date || new Date().toISOString()),
      shares: Number(p.shares) || 0,
      pricePerShare: Number(p.original_price) || Number(p.originalAmount) / Number(p.shares) || 0,
      fees: Number(p.fee) || 0,
      note: p.note ? String(p.note) : undefined,
    });
  });

  // Process sales -> sell transactions
  sales.forEach((s) => {
    if (s.assetType !== 'stocks') return;
    const assetId = String(s.assetId);
    if (!transactionsByAsset.has(assetId)) {
      transactionsByAsset.set(assetId, []);
    }
    transactionsByAsset.get(assetId)!.push({
      id: String(s.id || generateId()),
      type: 'sell',
      date: String(s.date || new Date().toISOString()),
      shares: Number(s.shares) || 0,
      pricePerShare: Number(s.salePrice) || Number(s.original_price) || 0,
      fees: Number(s.commission) || 0,
      note: s.note ? String(s.note) : undefined,
    });
  });

  // Ensure holdings array exists and attach transactions
  const holdings: Holding[] = Array.isArray(data.holdings)
    ? data.holdings.map((h: Record<string, unknown>) => {
        const holdingId = String(h.id || generateId());
        const existingTx = transactionsByAsset.get(holdingId) || [];

        // If no transactions from purchases, create one from costBasis
        if (existingTx.length === 0 && h.costBasis && h.shares) {
          existingTx.push({
            id: generateId(),
            type: 'buy',
            date: String(h.purchaseDate || new Date().toISOString()),
            shares: Number(h.shares),
            pricePerShare: Number(h.costBasis),
            fees: 0,
          });
        }

        return {
          id: holdingId,
          symbol: String(h.symbol || h.ticker || ''),
          name: String(h.name || h.symbol || ''),
          shares: Number(h.shares) || Number(h.units) || 0,
          currency: (h.currency as Currency) || 'ILS',
          groupId: h.groupId !== undefined ? String(h.groupId) : null,
          currentPrice: Number(h.currentPrice) || Number(h.price) || 0,
          lastUpdate: String(h.lastUpdate || new Date().toISOString()),
          transactions: existingTx,
        };
      })
    : [];

  // Ensure bonds array exists
  const bonds: Bond[] = Array.isArray(data.bonds)
    ? data.bonds.map((b: Record<string, unknown>) => ({
        id: String(b.id || generateId()),
        name: String(b.name || b.symbol || ''),
        units: Number(b.units) || 0,
        costBasis: (Number(b.costBasis) || 0) * (Number(b.units) || 1), // costBasis is per unit in old format
        currentPrice: Number(b.currentPrice) || Number(b.price) || 0,
        lastUpdate: String(b.lastUpdate || new Date().toISOString()),
        maturityDate: b.maturityDate ? String(b.maturityDate) : undefined,
        couponRate: b.couponRate ? Number(b.couponRate) : undefined,
      }))
    : [];

  // Ensure groups array exists (old format uses 'target' instead of 'targetPercent')
  const groups: Group[] = Array.isArray(data.groups)
    ? data.groups.map((g: Record<string, unknown>) => ({
        id: String(g.id || generateId()),
        name: String(g.name || ''),
        targetPercent: Number(g.targetPercent) || Number(g.target) || 0,
        color: String(g.color || '#8b5cf6'),
      }))
    : empty.groups;

  // Build cash transactions from deposits and withdrawals
  const deposits = Array.isArray(data.deposits) ? data.deposits as Record<string, unknown>[] : [];
  const withdrawals = Array.isArray(data.withdrawals) ? data.withdrawals as Record<string, unknown>[] : [];

  const cashTransactions: Record<Currency, CashTransaction[]> = { ILS: [], USD: [], EUR: [] };

  deposits.forEach((d) => {
    const currency = (d.currency as Currency) || 'ILS';
    cashTransactions[currency].push({
      id: String(d.id || generateId()),
      type: 'deposit',
      date: String(d.date || new Date().toISOString()),
      amount: Number(d.amount) || 0,
      note: d.note ? String(d.note) : undefined,
    });
  });

  withdrawals.forEach((w) => {
    const currency = (w.currency as Currency) || 'ILS';
    cashTransactions[currency].push({
      id: String(w.id || generateId()),
      type: 'withdrawal',
      date: String(w.date || new Date().toISOString()),
      amount: Number(w.amount) || 0,
      note: w.note ? String(w.note) : undefined,
    });
  });

  // Ensure cashAccounts exists with proper structure
  let cashAccounts = empty.cashAccounts;

  if (data.cash && typeof data.cash === 'object') {
    const cash = data.cash as Record<string, unknown>;
    cashAccounts = {
      ILS: { currency: 'ILS', balance: Number(cash.ILS) || 0, transactions: cashTransactions.ILS },
      USD: { currency: 'USD', balance: Number(cash.USD) || 0, transactions: cashTransactions.USD },
      EUR: { currency: 'EUR', balance: Number(cash.EUR) || 0, transactions: cashTransactions.EUR },
    };
  } else if (data.cashAccounts && typeof data.cashAccounts === 'object') {
    const ca = data.cashAccounts as Record<string, Record<string, unknown>>;
    cashAccounts = {
      ILS: {
        currency: 'ILS',
        balance: Number(ca.ILS?.balance) || 0,
        transactions: [...(Array.isArray(ca.ILS?.transactions) ? ca.ILS.transactions as CashTransaction[] : []), ...cashTransactions.ILS],
      },
      USD: {
        currency: 'USD',
        balance: Number(ca.USD?.balance) || 0,
        transactions: [...(Array.isArray(ca.USD?.transactions) ? ca.USD.transactions as CashTransaction[] : []), ...cashTransactions.USD],
      },
      EUR: {
        currency: 'EUR',
        balance: Number(ca.EUR?.balance) || 0,
        transactions: [...(Array.isArray(ca.EUR?.transactions) ? ca.EUR.transactions as CashTransaction[] : []), ...cashTransactions.EUR],
      },
    };
  }

  // Migrate snapshots (old format uses different field names)
  let snapshots: Snapshot[] = [];
  if (Array.isArray(data.snapshots)) {
    snapshots = data.snapshots.map((s: Record<string, unknown>) => {
      // Map triggerType to trigger
      let trigger: 'deposit' | 'withdrawal' | 'manual' | 'daily' = 'manual';
      if (s.triggerType === 'deposit' || s.trigger === 'deposit') trigger = 'deposit';
      else if (s.triggerType === 'withdrawal' || s.trigger === 'withdrawal') trigger = 'withdrawal';
      else if (s.triggerType === 'daily' || s.trigger === 'daily') trigger = 'daily';

      return {
        id: String(s.id || generateId()),
        date: String(s.date || new Date().toISOString()),
        trigger,
        note: s.triggerNote ? String(s.triggerNote) : (s.note ? String(s.note) : undefined),
        // Old format uses value_before_flow and cash_flow (with underscores)
        valueBeforeFlow: Number(s.value_before_flow) || Number(s.valueBeforeFlow) || 0,
        cashFlow: Number(s.cash_flow) || Number(s.cashFlow) || 0,
        // These might not exist in old format, calculate from totalValue if needed
        stocksValue: Number(s.stocksValue) || Number(s.stocks) || 0,
        bondsValue: Number(s.bondsValue) || Number(s.bonds) || 0,
        cashTotal: Number(s.cashTotal) || Number(s.cash) || 0,
      };
    });
  }

  // Ensure exchangeRates exists (old format uses 'rates')
  let exchangeRates: ExchangeRates = empty.exchangeRates;
  if (data.exchangeRates && typeof data.exchangeRates === 'object') {
    const er = data.exchangeRates as Record<string, unknown>;
    exchangeRates = {
      USD: Number(er.USD) || empty.exchangeRates.USD,
      EUR: Number(er.EUR) || empty.exchangeRates.EUR,
      lastUpdate: String(er.lastUpdate || new Date().toISOString()),
    };
  } else if (data.rates && typeof data.rates === 'object') {
    const rates = data.rates as Record<string, unknown>;
    exchangeRates = {
      USD: Number(rates.USD) || empty.exchangeRates.USD,
      EUR: Number(rates.EUR) || empty.exchangeRates.EUR,
      lastUpdate: new Date().toISOString(),
    };
  }

  // Ensure settings exists
  const settings: PortfolioSettings = {
    ...empty.settings,
    ...(data.settings as Partial<PortfolioSettings>),
  };

  console.log('Migration complete:', { holdings: holdings.length, bonds: bonds.length, snapshots: snapshots.length });

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
