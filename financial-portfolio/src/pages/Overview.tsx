import {
  Wallet,
  TrendingUp,
  PiggyBank,
  Briefcase,
  BarChart3,
  Percent,
} from 'lucide-react';
import { StatCard, Card, CardHeader, CardTitle, CardContent } from '@/components/common';
import { usePortfolioSummary } from '@/hooks/usePortfolioSummary';
import { formatCurrency, formatChangePercent, formatPercent } from '@/utils/formatters';

export function Overview() {
  const summary = usePortfolioSummary();
  const isPositive = summary.totalGainLoss >= 0;

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-white">סקירה כללית</h1>
        <p className="text-white/60">תמונת מצב של תיק ההשקעות שלך</p>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="שווי התיק"
          value={formatCurrency(summary.totalValueILS)}
          icon={<Wallet className="w-5 h-5" />}
        />
        <StatCard
          label="רווח/הפסד"
          value={formatCurrency(summary.totalGainLoss)}
          subValue={formatChangePercent(summary.totalGainLossPercent)}
          trend={isPositive ? 'positive' : 'negative'}
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <StatCard
          label="תשואה שנתית (TWR)"
          value={
            summary.twr
              ? formatPercent(summary.twr.annualizedReturn)
              : 'N/A'
          }
          trend={
            summary.twr
              ? summary.twr.annualizedReturn >= 0
                ? 'positive'
                : 'negative'
              : 'neutral'
          }
          icon={<Percent className="w-5 h-5" />}
        />
        <StatCard
          label="מזומן זמין"
          value={formatCurrency(summary.cashValue)}
          icon={<PiggyBank className="w-5 h-5" />}
        />
      </div>

      {/* Breakdown Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Asset Allocation */}
        <Card>
          <CardHeader>
            <CardTitle>חלוקת נכסים</CardTitle>
            <Briefcase className="w-5 h-5 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <AllocationBar
                label="מניות"
                value={summary.stocksValue}
                total={summary.totalValueILS}
                color="bg-primary-500"
              />
              <AllocationBar
                label='אג"ח'
                value={summary.bondsValue}
                total={summary.totalValueILS}
                color="bg-cyan-500"
              />
              <AllocationBar
                label="מזומן"
                value={summary.cashValue}
                total={summary.totalValueILS}
                color="bg-emerald-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* Cash by Currency */}
        <Card>
          <CardHeader>
            <CardTitle>יתרות מזומן</CardTitle>
            <BarChart3 className="w-5 h-5 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <CashRow
                currency="ILS"
                symbol="₪"
                balance={summary.cashByCategory.ILS}
              />
              <CashRow
                currency="USD"
                symbol="$"
                balance={summary.cashByCategory.USD}
              />
              <CashRow
                currency="EUR"
                symbol="€"
                balance={summary.cashByCategory.EUR}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="text-center">
          <p className="text-3xl font-bold text-gray-800 dark:text-white">
            {summary.holdingsCount}
          </p>
          <p className="text-sm text-gray-500">החזקות</p>
        </Card>
        <Card className="text-center">
          <p className="text-3xl font-bold text-gray-800 dark:text-white">
            {summary.bondsCount}
          </p>
          <p className="text-sm text-gray-500">אג"חים</p>
        </Card>
        <Card className="text-center">
          <p className="text-3xl font-bold text-gray-800 dark:text-white">
            {summary.twr?.periodDays || 0}
          </p>
          <p className="text-sm text-gray-500">ימי מסחר</p>
        </Card>
        <Card className="text-center">
          <p className="text-3xl font-bold text-gray-800 dark:text-white">
            {formatCurrency(summary.totalCostBasis)}
          </p>
          <p className="text-sm text-gray-500">עלות בסיס</p>
        </Card>
      </div>
    </div>
  );
}

// ===== Helper Components =====

function AllocationBar({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const percent = total > 0 ? (value / total) * 100 : 0;

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-600 dark:text-gray-300">{label}</span>
        <span className="text-gray-800 dark:text-white font-medium">
          {formatCurrency(value)} ({formatPercent(percent, 1)})
        </span>
      </div>
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-500`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function CashRow({
  currency,
  symbol,
  balance,
}: {
  currency: string;
  symbol: string;
  balance: number;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <div className="flex items-center gap-2">
        <span className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-full text-sm font-bold">
          {symbol}
        </span>
        <span className="text-gray-600 dark:text-gray-300">{currency}</span>
      </div>
      <span className="font-medium text-gray-800 dark:text-white">
        {symbol}
        {balance.toLocaleString('he-IL', { minimumFractionDigits: 2 })}
      </span>
    </div>
  );
}
