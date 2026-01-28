import { useState, useMemo } from 'react';
import {
  DollarSign,
  Calendar,
  TrendingUp,
  Plus,
  PiggyBank,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Button, StatCard } from '@/components/common';
import { useHoldings, usePortfolioStore, useExchangeRates } from '@/stores/portfolioStore';
import { calculateHolding } from '@/services/calculationService';
import { formatCurrency, formatPercent } from '@/utils/formatters';
import type { Currency } from '@/types';

interface DividendRecord {
  id: string;
  holdingId: string;
  symbol: string;
  date: string;
  amount: number;
  currency: Currency;
  sharesAtTime: number;
  perShare: number;
}

export function Dividends() {
  const holdings = useHoldings();
  const rates = useExchangeRates();
  const { addCashTransaction } = usePortfolioStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Calculate holdings with values
  const holdingsWithCalc = holdings.map((h) => calculateHolding(h, rates));

  // Extract dividend transactions from holdings
  const allDividends: DividendRecord[] = useMemo(() => {
    const dividends: DividendRecord[] = [];

    holdings.forEach((holding) => {
      holding.transactions
        .filter((t) => t.type === 'dividend')
        .forEach((t) => {
          dividends.push({
            id: t.id,
            holdingId: holding.id,
            symbol: holding.symbol,
            date: t.date,
            amount: t.shares * t.pricePerShare, // Total dividend amount
            currency: holding.currency,
            sharesAtTime: t.shares,
            perShare: t.pricePerShare,
          });
        });
    });

    return dividends.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [holdings]);

  // Filter by year
  const yearDividends = allDividends.filter(
    (d) => new Date(d.date).getFullYear() === selectedYear
  );

  // Calculate totals
  const totalThisYear = yearDividends.reduce((sum, d) => {
    const amountInILS =
      d.currency === 'ILS' ? d.amount : d.amount * rates[d.currency];
    return sum + amountInILS;
  }, 0);

  const totalAllTime = allDividends.reduce((sum, d) => {
    const amountInILS =
      d.currency === 'ILS' ? d.amount : d.amount * rates[d.currency];
    return sum + amountInILS;
  }, 0);

  // Calculate dividend yield
  const totalPortfolioValue = holdingsWithCalc.reduce((sum, h) => sum + h.marketValueILS, 0);
  const dividendYield = totalPortfolioValue > 0 ? (totalThisYear / totalPortfolioValue) * 100 : 0;

  // Group by month for chart
  const monthlyDividends = useMemo(() => {
    const months: Record<string, number> = {};

    yearDividends.forEach((d) => {
      const month = new Date(d.date).toLocaleString('he-IL', { month: 'short' });
      const amountInILS =
        d.currency === 'ILS' ? d.amount : d.amount * rates[d.currency];
      months[month] = (months[month] || 0) + amountInILS;
    });

    return Object.entries(months).map(([month, amount]) => ({ month, amount }));
  }, [yearDividends, rates]);

  // Group by holding
  const dividendsByHolding = useMemo(() => {
    const byHolding: Record<string, { symbol: string; total: number; count: number }> = {};

    yearDividends.forEach((d) => {
      const amountInILS =
        d.currency === 'ILS' ? d.amount : d.amount * rates[d.currency];

      if (!byHolding[d.symbol]) {
        byHolding[d.symbol] = { symbol: d.symbol, total: 0, count: 0 };
      }
      byHolding[d.symbol].total += amountInILS;
      byHolding[d.symbol].count += 1;
    });

    return Object.values(byHolding).sort((a, b) => b.total - a.total);
  }, [yearDividends, rates]);

  const handleAddDividend = (data: {
    holdingId: string;
    amount: number;
    date: string;
  }) => {
    const holding = holdings.find((h) => h.id === data.holdingId);
    if (!holding) return;

    // Add dividend transaction to holding
    usePortfolioStore.getState().addTransaction(data.holdingId, {
      type: 'dividend',
      date: data.date,
      shares: holding.shares,
      pricePerShare: data.amount / holding.shares,
      fees: 0,
      note: 'דיבידנד',
    });

    // Add to cash account
    addCashTransaction(holding.currency, {
      type: 'dividend',
      date: data.date,
      amount: data.amount,
      note: `דיבידנד מ-${holding.symbol}`,
      relatedHoldingId: holding.id,
    });

    setIsModalOpen(false);
  };

  // Available years
  const years = useMemo(() => {
    const yearsSet = new Set(allDividends.map((d) => new Date(d.date).getFullYear()));
    yearsSet.add(new Date().getFullYear());
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [allDividends]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">מעקב דיבידנדים</h1>
          <p className="text-white/60">מעקב אחר הכנסות פסיביות מדיבידנדים</p>
        </div>
        <div className="flex gap-2">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="input-field w-auto"
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          <Button
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsModalOpen(true)}
          >
            רשום דיבידנד
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          label={`דיבידנדים ${selectedYear}`}
          value={formatCurrency(totalThisYear)}
          icon={<DollarSign className="w-5 h-5" />}
        />
        <StatCard
          label="סה״כ כל הזמן"
          value={formatCurrency(totalAllTime)}
          icon={<PiggyBank className="w-5 h-5" />}
        />
        <StatCard
          label="תשואת דיבידנד"
          value={formatPercent(dividendYield)}
          subValue="שנתי"
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <StatCard
          label="תשלומים השנה"
          value={yearDividends.length.toString()}
          icon={<Calendar className="w-5 h-5" />}
        />
      </div>

      {/* Monthly Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>דיבידנדים לפי חודש</CardTitle>
        </CardHeader>
        <CardContent>
          {monthlyDividends.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              אין דיבידנדים ב-{selectedYear}
            </div>
          ) : (
            <div className="space-y-3">
              {monthlyDividends.map(({ month, amount }) => (
                <div key={month} className="flex items-center gap-4">
                  <span className="w-12 text-sm text-gray-500">{month}</span>
                  <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full"
                      style={{
                        width: `${Math.min(
                          (amount / Math.max(...monthlyDividends.map((m) => m.amount))) * 100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                  <span className="w-24 text-left font-medium">{formatCurrency(amount)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* By Holding */}
      <Card>
        <CardHeader>
          <CardTitle>דיבידנדים לפי החזקה</CardTitle>
        </CardHeader>
        <CardContent>
          {dividendsByHolding.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              אין דיבידנדים להצגה
            </div>
          ) : (
            <div className="space-y-3">
              {dividendsByHolding.map(({ symbol, total, count }) => (
                <div
                  key={symbol}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-800 dark:text-white">{symbol}</p>
                    <p className="text-sm text-gray-500">{count} תשלומים</p>
                  </div>
                  <p className="text-lg font-bold text-green-500">{formatCurrency(total)}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Dividends */}
      <Card>
        <CardHeader>
          <CardTitle>דיבידנדים אחרונים</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {allDividends.length === 0 ? (
            <div className="p-8 text-center">
              <DollarSign className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500 mb-4">לא נרשמו דיבידנדים עדיין</p>
              <Button onClick={() => setIsModalOpen(true)}>רשום דיבידנד ראשון</Button>
            </div>
          ) : (
            <div className="divide-y dark:divide-gray-700">
              {allDividends.slice(0, 10).map((dividend) => (
                <div
                  key={dividend.id}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/30"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                      <DollarSign className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800 dark:text-white">
                        {dividend.symbol}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(dividend.date).toLocaleDateString('he-IL')}
                      </p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-green-500">
                      +{formatCurrency(dividend.amount, dividend.currency)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatCurrency(dividend.perShare, dividend.currency)} למניה
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Dividend Modal */}
      {isModalOpen && (
        <DividendModal
          holdings={holdings}
          onSave={handleAddDividend}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
}

// ===== Dividend Modal =====
interface DividendModalProps {
  holdings: { id: string; symbol: string; shares: number; currency: Currency }[];
  onSave: (data: { holdingId: string; amount: number; date: string }) => void;
  onClose: () => void;
}

function DividendModal({ holdings, onSave, onClose }: DividendModalProps) {
  const [holdingId, setHoldingId] = useState(holdings[0]?.id || '');
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const selectedHolding = holdings.find((h) => h.id === holdingId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (holdingId && amount > 0) {
      onSave({ holdingId, amount, date });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="glass-card w-full max-w-md p-6">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
          רישום דיבידנד
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              החזקה
            </label>
            <select
              value={holdingId}
              onChange={(e) => setHoldingId(e.target.value)}
              className="input-field"
              required
            >
              {holdings.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.symbol} ({h.shares} מניות)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              סכום כולל ({selectedHolding?.currency || 'ILS'})
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
            {selectedHolding && amount > 0 && (
              <p className="text-sm text-gray-500 mt-1">
                {(amount / selectedHolding.shares).toFixed(4)} {selectedHolding.currency} למניה
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              תאריך
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input-field"
              required
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1">
              שמור
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
