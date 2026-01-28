import { useState, useMemo } from 'react';
import {
  FileText,
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  AlertCircle,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Button, StatCard } from '@/components/common';
import { useHoldings, useExchangeRates } from '@/stores/portfolioStore';
import { formatCurrency } from '@/utils/formatters';
import type { Currency } from '@/types';

interface TaxableEvent {
  id: string;
  date: string;
  type: 'sale' | 'dividend';
  symbol: string;
  description: string;
  proceeds: number; // מחיר מכירה או דיבידנד
  costBasis: number; // עלות רכישה (0 לדיבידנד)
  gainLoss: number; // רווח/הפסד
  currency: Currency;
  holdingPeriodDays: number;
  isShortTerm: boolean; // פחות משנה
}

export function TaxReport() {
  const holdings = useHoldings();
  const rates = useExchangeRates();

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  // Extract all taxable events
  const taxableEvents: TaxableEvent[] = useMemo(() => {
    const events: TaxableEvent[] = [];

    holdings.forEach((holding) => {
      // Sales
      const sales = holding.transactions.filter((t) => t.type === 'sell');
      const buys = holding.transactions.filter((t) => t.type === 'buy');

      sales.forEach((sale) => {
        const saleDate = new Date(sale.date);
        if (saleDate.getFullYear() !== selectedYear) return;

        // FIFO - find matching buy
        let remainingShares = sale.shares;
        let totalCostBasis = 0;
        let earliestBuyDate: Date | null = null;

        for (const buy of buys) {
          if (remainingShares <= 0) break;
          const buyDate = new Date(buy.date);
          if (buyDate > saleDate) continue;

          const sharesToMatch = Math.min(remainingShares, buy.shares);
          totalCostBasis += sharesToMatch * buy.pricePerShare;
          remainingShares -= sharesToMatch;

          if (!earliestBuyDate || buyDate < earliestBuyDate) {
            earliestBuyDate = buyDate;
          }
        }

        const proceeds = sale.shares * sale.pricePerShare;
        const gainLoss = proceeds - totalCostBasis - sale.fees;
        const holdingPeriodDays = earliestBuyDate
          ? Math.floor((saleDate.getTime() - earliestBuyDate.getTime()) / (1000 * 60 * 60 * 24))
          : 0;

        events.push({
          id: sale.id,
          date: sale.date,
          type: 'sale',
          symbol: holding.symbol,
          description: `מכירת ${sale.shares} מניות ${holding.symbol}`,
          proceeds,
          costBasis: totalCostBasis,
          gainLoss,
          currency: holding.currency,
          holdingPeriodDays,
          isShortTerm: holdingPeriodDays < 365,
        });
      });

      // Dividends
      const dividends = holding.transactions.filter((t) => t.type === 'dividend');
      dividends.forEach((div) => {
        const divDate = new Date(div.date);
        if (divDate.getFullYear() !== selectedYear) return;

        const amount = div.shares * div.pricePerShare;
        events.push({
          id: div.id,
          date: div.date,
          type: 'dividend',
          symbol: holding.symbol,
          description: `דיבידנד מ-${holding.symbol}`,
          proceeds: amount,
          costBasis: 0,
          gainLoss: amount,
          currency: holding.currency,
          holdingPeriodDays: 0,
          isShortTerm: false,
        });
      });
    });

    return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [holdings, selectedYear]);

  // Calculate totals
  const totals = useMemo(() => {
    const convertToILS = (amount: number, currency: Currency) => {
      if (currency === 'ILS') return amount;
      return amount * rates[currency];
    };

    let totalProceeds = 0;
    let totalCostBasis = 0;
    let totalGains = 0;
    let totalLosses = 0;
    let totalDividends = 0;
    let shortTermGains = 0;
    let longTermGains = 0;

    taxableEvents.forEach((event) => {
      const proceedsILS = convertToILS(event.proceeds, event.currency);
      const costBasisILS = convertToILS(event.costBasis, event.currency);
      const gainLossILS = convertToILS(event.gainLoss, event.currency);

      if (event.type === 'dividend') {
        totalDividends += gainLossILS;
      } else {
        totalProceeds += proceedsILS;
        totalCostBasis += costBasisILS;

        if (gainLossILS > 0) {
          totalGains += gainLossILS;
          if (event.isShortTerm) {
            shortTermGains += gainLossILS;
          } else {
            longTermGains += gainLossILS;
          }
        } else {
          totalLosses += Math.abs(gainLossILS);
        }
      }
    });

    const netGainLoss = totalGains - totalLosses;
    const taxableIncome = totalDividends + Math.max(0, netGainLoss);

    // Israeli tax rates (simplified)
    const capitalGainsTaxRate = 0.25; // 25%
    const dividendTaxRate = 0.25; // 25%

    const estimatedTax =
      Math.max(0, netGainLoss) * capitalGainsTaxRate +
      totalDividends * dividendTaxRate;

    return {
      totalProceeds,
      totalCostBasis,
      totalGains,
      totalLosses,
      netGainLoss,
      totalDividends,
      shortTermGains,
      longTermGains,
      taxableIncome,
      estimatedTax,
      lossCarryforward: totalLosses > totalGains ? totalLosses - totalGains : 0,
    };
  }, [taxableEvents, rates]);

  // Generate CSV export
  const exportToCsv = () => {
    const headers = ['תאריך', 'סוג', 'נייר ערך', 'תיאור', 'תמורה', 'עלות', 'רווח/הפסד', 'מטבע', 'ימי החזקה'];
    const rows = taxableEvents.map((e) => [
      new Date(e.date).toLocaleDateString('he-IL'),
      e.type === 'sale' ? 'מכירה' : 'דיבידנד',
      e.symbol,
      e.description,
      e.proceeds.toFixed(2),
      e.costBasis.toFixed(2),
      e.gainLoss.toFixed(2),
      e.currency,
      e.holdingPeriodDays.toString(),
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tax-report-${selectedYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Available years
  const years = useMemo(() => {
    const yearsSet = new Set<number>();
    holdings.forEach((h) => {
      h.transactions.forEach((t) => {
        yearsSet.add(new Date(t.date).getFullYear());
      });
    });
    yearsSet.add(currentYear);
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [holdings, currentYear]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">דוח מס שנתי</h1>
          <p className="text-white/60">סיכום אירועי מס לשנת {selectedYear}</p>
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
            leftIcon={<Download className="w-4 h-4" />}
            onClick={exportToCsv}
            disabled={taxableEvents.length === 0}
          >
            ייצוא CSV
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="רווחי הון ממומשים"
          value={formatCurrency(totals.totalGains)}
          icon={<TrendingUp className="w-5 h-5" />}
          trend="positive"
        />
        <StatCard
          label="הפסדי הון"
          value={formatCurrency(totals.totalLosses)}
          icon={<TrendingDown className="w-5 h-5" />}
          trend="negative"
        />
        <StatCard
          label="דיבידנדים"
          value={formatCurrency(totals.totalDividends)}
          icon={<Calendar className="w-5 h-5" />}
        />
        <StatCard
          label="מס משוער"
          value={formatCurrency(totals.estimatedTax)}
          subValue="25% מס רווחי הון"
          icon={<FileText className="w-5 h-5" />}
        />
      </div>

      {/* Tax Summary */}
      <Card>
        <CardHeader>
          <CardTitle>סיכום לצורכי מס</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">סה"כ תמורות ממכירות</span>
                <span className="font-medium">{formatCurrency(totals.totalProceeds)}</span>
              </div>
              <div className="flex justify-between py-2 border-b dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">סה"כ עלות רכישה</span>
                <span className="font-medium">{formatCurrency(totals.totalCostBasis)}</span>
              </div>
              <div className="flex justify-between py-2 border-b dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">רווח הון נטו</span>
                <span className={`font-bold ${totals.netGainLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {formatCurrency(totals.netGainLoss)}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-600 dark:text-gray-400">דיבידנדים</span>
                <span className="font-medium">{formatCurrency(totals.totalDividends)}</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">רווחים קצרי טווח (&lt;שנה)</span>
                <span className="font-medium">{formatCurrency(totals.shortTermGains)}</span>
              </div>
              <div className="flex justify-between py-2 border-b dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">רווחים ארוכי טווח (&gt;שנה)</span>
                <span className="font-medium">{formatCurrency(totals.longTermGains)}</span>
              </div>
              {totals.lossCarryforward > 0 && (
                <div className="flex justify-between py-2 border-b dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">הפסד להעברה</span>
                  <span className="font-medium text-amber-500">
                    {formatCurrency(totals.lossCarryforward)}
                  </span>
                </div>
              )}
              <div className="flex justify-between py-2 bg-gray-50 dark:bg-gray-800 rounded-lg px-3">
                <span className="font-medium">הכנסה חייבת במס</span>
                <span className="font-bold text-lg">{formatCurrency(totals.taxableIncome)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200">
                הערה חשובה
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                דוח זה מיועד למעקב בלבד ואינו מהווה ייעוץ מס. שיעורי המס המוצגים הם הערכה כללית (25%).
                יש להתייעץ עם רואה חשבון או יועץ מס לדיווח הסופי.
                המערכת משתמשת בשיטת FIFO (ראשון נכנס ראשון יוצא) לחישוב עלות הבסיס.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Events Table */}
      <Card>
        <CardHeader>
          <CardTitle>אירועי מס</CardTitle>
          <span className="text-sm text-gray-500">{taxableEvents.length} אירועים</span>
        </CardHeader>
        <CardContent className="p-0">
          {taxableEvents.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500">אין אירועי מס ב-{selectedYear}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">תאריך</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">סוג</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">נייר ערך</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">תמורה</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">עלות</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">רווח/הפסד</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">תקופה</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {taxableEvents.map((event) => (
                    <tr
                      key={event.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/30"
                    >
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {new Date(event.date).toLocaleDateString('he-IL')}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            event.type === 'dividend'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          }`}
                        >
                          {event.type === 'dividend' ? 'דיבידנד' : 'מכירה'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800 dark:text-white">
                        {event.symbol}
                      </td>
                      <td className="px-4 py-3">
                        {formatCurrency(event.proceeds, event.currency)}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {event.costBasis > 0 ? formatCurrency(event.costBasis, event.currency) : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={event.gainLoss >= 0 ? 'text-green-500' : 'text-red-500'}>
                          {event.gainLoss >= 0 ? '+' : ''}
                          {formatCurrency(event.gainLoss, event.currency)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {event.type === 'sale' && (
                          <span
                            className={`text-xs ${
                              event.isShortTerm ? 'text-amber-500' : 'text-green-500'
                            }`}
                          >
                            {event.holdingPeriodDays} ימים
                            {event.isShortTerm ? ' (קצר)' : ' (ארוך)'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
