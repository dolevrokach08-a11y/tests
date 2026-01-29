import { useState } from 'react';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  RefreshCw,
  Plus,
  Wallet,
  ArrowLeftRight,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Button, StatCard } from '@/components/common';
import { usePortfolioStore, useCashAccounts, useExchangeRates } from '@/stores/portfolioStore';
import { formatCurrency } from '@/utils/formatters';
import type { Currency, CashTransactionType } from '@/types';

export function CashFlow() {
  const cashAccounts = useCashAccounts();
  const rates = useExchangeRates();
  const { addCashTransaction, executeCurrencyExchange, updateExchangeRates } = usePortfolioStore();

  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isExchangeModalOpen, setIsExchangeModalOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<'deposit' | 'withdrawal'>('deposit');

  // Calculate totals (with defensive checks)
  const totalILS = cashAccounts?.ILS?.balance ?? 0;
  const totalUSD = cashAccounts?.USD?.balance ?? 0;
  const totalEUR = cashAccounts?.EUR?.balance ?? 0;
  const totalInILS = totalILS + totalUSD * (rates?.USD ?? 1) + totalEUR * (rates?.EUR ?? 1);

  // Get recent transactions (with defensive checks)
  const allTransactions = [
    ...(cashAccounts?.ILS?.transactions ?? []).map((t) => ({ ...t, currency: 'ILS' as Currency })),
    ...(cashAccounts?.USD?.transactions ?? []).map((t) => ({ ...t, currency: 'USD' as Currency })),
    ...(cashAccounts?.EUR?.transactions ?? []).map((t) => ({ ...t, currency: 'EUR' as Currency })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleTransaction = (
    type: 'deposit' | 'withdrawal',
    currency: Currency,
    amount: number,
    note: string
  ) => {
    addCashTransaction(currency, {
      type,
      date: new Date().toISOString(),
      amount,
      note,
    });
    setIsDepositModalOpen(false);
  };

  const handleExchange = (
    fromCurrency: Currency,
    toCurrency: Currency,
    amount: number,
    rate: number
  ) => {
    executeCurrencyExchange(fromCurrency, toCurrency, amount, rate);
    setIsExchangeModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">ניהול תזרים מזומנים</h1>
          <p className="text-white/60">סה"כ מזומן: {formatCurrency(totalInILS)}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="secondary"
            leftIcon={<RefreshCw className="w-4 h-4" />}
            onClick={() => {
              // Fetch rates from API
              updateExchangeRates({ lastUpdate: new Date().toISOString() });
            }}
          >
            עדכון שערים
          </Button>
          <Button
            leftIcon={<ArrowLeftRight className="w-4 h-4" />}
            variant="secondary"
            onClick={() => setIsExchangeModalOpen(true)}
          >
            המרה
          </Button>
          <Button
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => {
              setTransactionType('deposit');
              setIsDepositModalOpen(true);
            }}
          >
            הפקדה / משיכה
          </Button>
        </div>
      </div>

      {/* Cash Balances */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="שקלים (ILS)"
          value={`₪${totalILS.toLocaleString('he-IL', { minimumFractionDigits: 2 })}`}
          icon={<Wallet className="w-5 h-5" />}
        />
        <StatCard
          label="דולרים (USD)"
          value={`$${totalUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          subValue={`שער: ${rates.USD}`}
          icon={<Wallet className="w-5 h-5" />}
        />
        <StatCard
          label="יורו (EUR)"
          value={`€${totalEUR.toLocaleString('de-DE', { minimumFractionDigits: 2 })}`}
          subValue={`שער: ${rates.EUR}`}
          icon={<Wallet className="w-5 h-5" />}
        />
      </div>

      {/* Exchange Rates */}
      <Card>
        <CardHeader>
          <CardTitle>שערי חליפין</CardTitle>
          <span className="text-sm text-gray-500">
            עדכון אחרון: {new Date(rates.lastUpdate).toLocaleString('he-IL')}
          </span>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
              <p className="text-sm text-gray-500">USD → ILS</p>
              <p className="text-2xl font-bold">{rates.USD}</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
              <p className="text-sm text-gray-500">EUR → ILS</p>
              <p className="text-2xl font-bold">{rates.EUR}</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
              <p className="text-sm text-gray-500">ILS → USD</p>
              <p className="text-2xl font-bold">{(1 / rates.USD).toFixed(4)}</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
              <p className="text-sm text-gray-500">ILS → EUR</p>
              <p className="text-2xl font-bold">{(1 / rates.EUR).toFixed(4)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>היסטוריית פעולות</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {allTransactions.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              אין פעולות עדיין
            </div>
          ) : (
            <div className="divide-y dark:divide-gray-700">
              {allTransactions.slice(0, 20).map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/30"
                >
                  <div className="flex items-center gap-3">
                    {tx.type === 'deposit' || tx.type === 'dividend' ? (
                      <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                        <ArrowDownCircle className="w-5 h-5 text-green-500" />
                      </div>
                    ) : tx.type === 'exchange' ? (
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                        <ArrowLeftRight className="w-5 h-5 text-blue-500" />
                      </div>
                    ) : (
                      <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                        <ArrowUpCircle className="w-5 h-5 text-red-500" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-800 dark:text-white">
                        {getTransactionLabel(tx.type)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(tx.date).toLocaleDateString('he-IL')}
                        {tx.note && ` • ${tx.note}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p
                      className={`font-semibold ${
                        tx.amount > 0 ? 'text-green-500' : 'text-red-500'
                      }`}
                    >
                      {tx.amount > 0 ? '+' : ''}
                      {formatCurrency(tx.amount, tx.currency)}
                    </p>
                    <p className="text-xs text-gray-500">{tx.currency}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Deposit/Withdrawal Modal */}
      {isDepositModalOpen && (
        <TransactionModal
          type={transactionType}
          onSave={handleTransaction}
          onClose={() => setIsDepositModalOpen(false)}
          onTypeChange={setTransactionType}
        />
      )}

      {/* Exchange Modal */}
      {isExchangeModalOpen && (
        <ExchangeModal
          rates={rates}
          balances={{
            ILS: totalILS,
            USD: totalUSD,
            EUR: totalEUR,
          }}
          onSave={handleExchange}
          onClose={() => setIsExchangeModalOpen(false)}
        />
      )}
    </div>
  );
}

function getTransactionLabel(type: CashTransactionType): string {
  switch (type) {
    case 'deposit':
      return 'הפקדה';
    case 'withdrawal':
      return 'משיכה';
    case 'exchange':
      return 'המרת מטבע';
    case 'dividend':
      return 'דיבידנד';
    case 'interest':
      return 'ריבית';
    default:
      return type;
  }
}

// ===== Transaction Modal =====
interface TransactionModalProps {
  type: 'deposit' | 'withdrawal';
  onSave: (type: 'deposit' | 'withdrawal', currency: Currency, amount: number, note: string) => void;
  onClose: () => void;
  onTypeChange: (type: 'deposit' | 'withdrawal') => void;
}

function TransactionModal({ type, onSave, onClose, onTypeChange }: TransactionModalProps) {
  const [currency, setCurrency] = useState<Currency>('ILS');
  const [amount, setAmount] = useState<number>(0);
  const [note, setNote] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount > 0) {
      onSave(type, currency, amount, note);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="glass-card w-full max-w-md p-6">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
          הפקדה / משיכה
        </h2>

        {/* Type Toggle */}
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => onTypeChange('deposit')}
            className={`flex-1 py-2 rounded-lg transition-all ${
              type === 'deposit'
                ? 'bg-green-500 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600'
            }`}
          >
            הפקדה
          </button>
          <button
            type="button"
            onClick={() => onTypeChange('withdrawal')}
            className={`flex-1 py-2 rounded-lg transition-all ${
              type === 'withdrawal'
                ? 'bg-red-500 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600'
            }`}
          >
            משיכה
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              מטבע
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as Currency)}
              className="input-field"
            >
              <option value="ILS">ILS - שקל</option>
              <option value="USD">USD - דולר</option>
              <option value="EUR">EUR - יורו</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              סכום
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              הערה (אופציונלי)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="input-field"
              placeholder="הערה..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1">
              {type === 'deposit' ? 'הפקד' : 'משוך'}
            </Button>
            <Button type="button" variant="secondary" onClick={onClose}>
              ביטול
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ===== Exchange Modal =====
interface ExchangeModalProps {
  rates: { USD: number; EUR: number };
  balances: { ILS: number; USD: number; EUR: number };
  onSave: (from: Currency, to: Currency, amount: number, rate: number) => void;
  onClose: () => void;
}

function ExchangeModal({ rates, balances, onSave, onClose }: ExchangeModalProps) {
  const [fromCurrency, setFromCurrency] = useState<Currency>('USD');
  const [toCurrency, setToCurrency] = useState<Currency>('ILS');
  const [amount, setAmount] = useState<number>(0);

  const getRate = (from: Currency, to: Currency): number => {
    if (from === to) return 1;
    if (from === 'ILS' && to === 'USD') return 1 / rates.USD;
    if (from === 'ILS' && to === 'EUR') return 1 / rates.EUR;
    if (from === 'USD' && to === 'ILS') return rates.USD;
    if (from === 'USD' && to === 'EUR') return rates.USD / rates.EUR;
    if (from === 'EUR' && to === 'ILS') return rates.EUR;
    if (from === 'EUR' && to === 'USD') return rates.EUR / rates.USD;
    return 1;
  };

  const rate = getRate(fromCurrency, toCurrency);
  const result = amount * rate;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount > 0 && fromCurrency !== toCurrency) {
      onSave(fromCurrency, toCurrency, amount, rate);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="glass-card w-full max-w-md p-6">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
          המרת מטבע
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                ממטבע
              </label>
              <select
                value={fromCurrency}
                onChange={(e) => setFromCurrency(e.target.value as Currency)}
                className="input-field"
              >
                <option value="ILS">ILS (₪{balances.ILS.toFixed(2)})</option>
                <option value="USD">USD (${balances.USD.toFixed(2)})</option>
                <option value="EUR">EUR (€{balances.EUR.toFixed(2)})</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                למטבע
              </label>
              <select
                value={toCurrency}
                onChange={(e) => setToCurrency(e.target.value as Currency)}
                className="input-field"
              >
                <option value="ILS">ILS</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              סכום להמרה
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max={balances[fromCurrency]}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="input-field"
              required
            />
          </div>

          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex justify-between text-sm mb-2">
              <span>שער המרה:</span>
              <span className="font-medium">{rate.toFixed(4)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold">
              <span>תקבל:</span>
              <span className="text-green-500">
                {formatCurrency(result, toCurrency)}
              </span>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1" disabled={fromCurrency === toCurrency}>
              בצע המרה
            </Button>
            <Button type="button" variant="secondary" onClick={onClose}>
              ביטול
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
