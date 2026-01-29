import { useState } from 'react';
import { History as HistoryIcon, Filter, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/common';
import { useHoldings, useCashAccounts, usePortfolioStore } from '@/stores/portfolioStore';
import { formatCurrency } from '@/utils/formatters';
import type { Currency } from '@/types';

interface HistoryItem {
  id: string;
  date: string;
  type: 'buy' | 'sell' | 'dividend' | 'deposit' | 'withdrawal' | 'exchange';
  description: string;
  amount: number;
  currency: Currency;
  symbol?: string;
}

export function History() {
  const holdings = useHoldings();
  const cashAccounts = useCashAccounts();
  const snapshots = usePortfolioStore((state) => state.snapshots) ?? [];

  const [filterType, setFilterType] = useState<string>('all');
  const [filterPeriod, setFilterPeriod] = useState<string>('all');

  // Collect all history items
  const historyItems: HistoryItem[] = [];

  // Add holding transactions
  holdings.forEach((holding) => {
    (holding.transactions ?? []).forEach((tx) => {
      historyItems.push({
        id: tx.id,
        date: tx.date,
        type: tx.type as 'buy' | 'sell' | 'dividend',
        description: `${tx.type === 'buy' ? 'קניית' : tx.type === 'sell' ? 'מכירת' : 'דיבידנד'} ${holding.symbol}`,
        amount: tx.shares * tx.pricePerShare,
        currency: holding.currency,
        symbol: holding.symbol,
      });
    });
  });

  // Add cash transactions
  (['ILS', 'USD', 'EUR'] as Currency[]).forEach((currency) => {
    (cashAccounts[currency]?.transactions ?? []).forEach((tx) => {
      historyItems.push({
        id: tx.id,
        date: tx.date,
        type: tx.type as 'deposit' | 'withdrawal' | 'exchange',
        description:
          tx.type === 'deposit'
            ? 'הפקדה'
            : tx.type === 'withdrawal'
            ? 'משיכה'
            : tx.type === 'exchange'
            ? 'המרת מטבע'
            : tx.note || tx.type,
        amount: tx.amount,
        currency,
      });
    });
  });

  // Sort by date (newest first)
  historyItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Filter items
  const filteredItems = historyItems.filter((item) => {
    if (filterType !== 'all' && item.type !== filterType) return false;

    if (filterPeriod !== 'all') {
      const itemDate = new Date(item.date);
      const now = new Date();

      switch (filterPeriod) {
        case 'week':
          if (now.getTime() - itemDate.getTime() > 7 * 24 * 60 * 60 * 1000) return false;
          break;
        case 'month':
          if (now.getTime() - itemDate.getTime() > 30 * 24 * 60 * 60 * 1000) return false;
          break;
        case 'year':
          if (now.getTime() - itemDate.getTime() > 365 * 24 * 60 * 60 * 1000) return false;
          break;
      }
    }

    return true;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'buy':
      case 'deposit':
        return <ArrowDownRight className="w-4 h-4 text-green-500" />;
      case 'sell':
      case 'withdrawal':
        return <ArrowUpRight className="w-4 h-4 text-red-500" />;
      case 'exchange':
        return <RefreshCw className="w-4 h-4 text-blue-500" />;
      default:
        return <HistoryIcon className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'buy':
      case 'deposit':
      case 'dividend':
        return 'bg-green-100 dark:bg-green-900/30';
      case 'sell':
      case 'withdrawal':
        return 'bg-red-100 dark:bg-red-900/30';
      case 'exchange':
        return 'bg-blue-100 dark:bg-blue-900/30';
      default:
        return 'bg-gray-100 dark:bg-gray-800';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'buy':
        return 'קנייה';
      case 'sell':
        return 'מכירה';
      case 'dividend':
        return 'דיבידנד';
      case 'deposit':
        return 'הפקדה';
      case 'withdrawal':
        return 'משיכה';
      case 'exchange':
        return 'המרה';
      default:
        return type;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">היסטוריית עסקאות</h1>
        <p className="text-white/60">{filteredItems.length} פעולות נמצאו</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="input-field"
              >
                <option value="all">כל הסוגים</option>
                <option value="buy">קניות</option>
                <option value="sell">מכירות</option>
                <option value="dividend">דיבידנדים</option>
                <option value="deposit">הפקדות</option>
                <option value="withdrawal">משיכות</option>
                <option value="exchange">המרות</option>
              </select>
            </div>
            <div>
              <select
                value={filterPeriod}
                onChange={(e) => setFilterPeriod(e.target.value)}
                className="input-field"
              >
                <option value="all">כל הזמן</option>
                <option value="week">שבוע אחרון</option>
                <option value="month">חודש אחרון</option>
                <option value="year">שנה אחרונה</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* History List */}
      <Card>
        <CardHeader>
          <CardTitle>פעולות</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center">
              <HistoryIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500">אין פעולות להצגה</p>
            </div>
          ) : (
            <div className="divide-y dark:divide-gray-700">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/30"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${getTypeColor(item.type)}`}>
                      {getTypeIcon(item.type)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-800 dark:text-white">
                        {item.description}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span>{new Date(item.date).toLocaleDateString('he-IL')}</span>
                        <span>•</span>
                        <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">
                          {getTypeLabel(item.type)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-left">
                    <p
                      className={`font-semibold ${
                        ['buy', 'deposit', 'dividend'].includes(item.type)
                          ? 'text-green-500'
                          : ['sell', 'withdrawal'].includes(item.type)
                          ? 'text-red-500'
                          : 'text-gray-800 dark:text-white'
                      }`}
                    >
                      {['buy', 'deposit', 'dividend'].includes(item.type) ? '+' :
                       ['sell', 'withdrawal'].includes(item.type) ? '-' : ''}
                      {formatCurrency(Math.abs(item.amount), item.currency)}
                    </p>
                    <p className="text-xs text-gray-500">{item.currency}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Snapshots */}
      {snapshots.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>תמונות מצב (Snapshots)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">תאריך</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">טריגר</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">שווי לפני</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">תזרים</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">מניות</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">אג"ח</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">מזומן</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {snapshots.slice().reverse().map((snapshot) => (
                    <tr key={snapshot.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                      <td className="px-4 py-3 text-gray-800 dark:text-white">
                        {new Date(snapshot.date).toLocaleDateString('he-IL')}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 rounded text-xs bg-gray-100 dark:bg-gray-800">
                          {snapshot.trigger === 'deposit' ? 'הפקדה' :
                           snapshot.trigger === 'withdrawal' ? 'משיכה' :
                           snapshot.trigger === 'manual' ? 'ידני' : 'יומי'}
                        </span>
                      </td>
                      <td className="px-4 py-3">{formatCurrency(snapshot.valueBeforeFlow)}</td>
                      <td className="px-4 py-3">
                        <span className={snapshot.cashFlow >= 0 ? 'text-green-500' : 'text-red-500'}>
                          {snapshot.cashFlow >= 0 ? '+' : ''}{formatCurrency(snapshot.cashFlow)}
                        </span>
                      </td>
                      <td className="px-4 py-3">{formatCurrency(snapshot.stocksValue)}</td>
                      <td className="px-4 py-3">{formatCurrency(snapshot.bondsValue)}</td>
                      <td className="px-4 py-3">{formatCurrency(snapshot.cashTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
