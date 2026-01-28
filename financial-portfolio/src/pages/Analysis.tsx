import {
  AlertTriangle,
  TrendingDown,
  Shield,

  DollarSign,
  Activity,
  Info,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, StatCard } from '@/components/common';
import { useHoldings, useExchangeRates, usePortfolioStore } from '@/stores/portfolioStore';
import {
  calculateHolding,
  calculateRiskMetrics,
  calculateConcentrationRisk,
  calculateCurrencyExposure,
} from '@/services/calculationService';
import { formatCurrency, formatPercent } from '@/utils/formatters';

export function Analysis() {
  const holdings = useHoldings();
  const rates = useExchangeRates();
  const snapshots = usePortfolioStore((state) => state.snapshots);

  // Calculate holdings with values
  const holdingsWithCalc = holdings.map((h) => calculateHolding(h, rates));

  // Calculate all metrics
  const riskMetrics = calculateRiskMetrics(snapshots);
  const concentrationRisk = calculateConcentrationRisk(holdingsWithCalc);
  const currencyExposure = calculateCurrencyExposure(holdingsWithCalc, rates);

  // Sort holdings by value for top holdings
  const topHoldings = [...holdingsWithCalc]
    .sort((a, b) => b.marketValueILS - a.marketValueILS)
    .slice(0, 5);

  const totalValue = holdingsWithCalc.reduce((sum, h) => sum + h.marketValueILS, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">ניתוח מתקדם</h1>
        <p className="text-white/60">מדדי סיכון וביצועים</p>
      </div>

      {/* Risk Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Sharpe Ratio"
          value={riskMetrics.sharpeRatio?.toFixed(2) || 'N/A'}
          subValue="תשואה מותאמת סיכון"
          icon={<Activity className="w-5 h-5" />}
          trend={
            riskMetrics.sharpeRatio
              ? riskMetrics.sharpeRatio > 1
                ? 'positive'
                : riskMetrics.sharpeRatio < 0
                ? 'negative'
                : 'neutral'
              : 'neutral'
          }
        />
        <StatCard
          label="Sortino Ratio"
          value={riskMetrics.sortinoRatio?.toFixed(2) || 'N/A'}
          subValue="מתמקד בסיכון שלילי"
          icon={<Shield className="w-5 h-5" />}
          trend={
            riskMetrics.sortinoRatio
              ? riskMetrics.sortinoRatio > 1
                ? 'positive'
                : 'neutral'
              : 'neutral'
          }
        />
        <StatCard
          label="Max Drawdown"
          value={formatPercent(riskMetrics.maxDrawdown)}
          subValue={
            riskMetrics.maxDrawdownDate
              ? new Date(riskMetrics.maxDrawdownDate).toLocaleDateString('he-IL')
              : 'אין נתונים'
          }
          icon={<TrendingDown className="w-5 h-5" />}
          trend={riskMetrics.maxDrawdown > 20 ? 'negative' : 'neutral'}
        />
        <StatCard
          label="תנודתיות שנתית"
          value={formatPercent(riskMetrics.volatility)}
          subValue="סטיית תקן"
          icon={<Activity className="w-5 h-5" />}
          trend={riskMetrics.volatility > 30 ? 'negative' : 'neutral'}
        />
      </div>

      {/* Metric Explanations */}
      <Card>
        <CardHeader>
          <CardTitle>הסבר על המדדים</CardTitle>
          <Info className="w-5 h-5 text-gray-400" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="font-medium text-gray-800 dark:text-white">Sharpe Ratio</p>
              <p className="text-gray-500">
                מודד כמה תשואה עודפת אתה מקבל על כל יחידת סיכון.
                {' '}
                <span className="text-green-500">מעל 1 = טוב</span>,{' '}
                <span className="text-amber-500">0-1 = בינוני</span>,{' '}
                <span className="text-red-500">שלילי = גרוע</span>
              </p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="font-medium text-gray-800 dark:text-white">Sortino Ratio</p>
              <p className="text-gray-500">
                דומה ל-Sharpe אבל מתייחס רק לתנודתיות שלילית (הפסדים).
                מתאים יותר למשקיעים שחוששים מהפסדים.
              </p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="font-medium text-gray-800 dark:text-white">Max Drawdown</p>
              <p className="text-gray-500">
                הירידה המקסימלית מהשיא לשפל. מראה את ה"כאב" הגדול ביותר שהתיק חווה.
                {' '}
                <span className="text-red-500">מעל 20% = גבוה</span>
              </p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="font-medium text-gray-800 dark:text-white">תנודתיות (Volatility)</p>
              <p className="text-gray-500">
                סטיית תקן שנתית של התשואות. מדד לאי-ודאות.
                {' '}
                <span className="text-green-500">עד 15% = נמוך</span>,{' '}
                <span className="text-red-500">מעל 30% = גבוה</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Concentration Risk */}
      <Card className={concentrationRisk.isConcentrated ? 'border-amber-500' : ''}>
        <CardHeader>
          <CardTitle>סיכון ריכוזיות</CardTitle>
          {concentrationRisk.isConcentrated && (
            <div className="flex items-center gap-1 text-amber-500">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm">התיק מרוכז מדי</span>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-500 mb-1">ההחזקה הגדולה ביותר</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">
                {formatPercent(concentrationRisk.topHoldingPercent)}
              </p>
              {concentrationRisk.topHoldingPercent > 25 && (
                <p className="text-xs text-amber-500 mt-1">
                  מומלץ לא יותר מ-25% בהחזקה בודדת
                </p>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">5 ההחזקות הגדולות</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">
                {formatPercent(concentrationRisk.top5HoldingsPercent)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">מדד HHI</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">
                {concentrationRisk.herfindahlIndex.toFixed(0)}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {concentrationRisk.herfindahlIndex < 1500
                  ? 'פיזור טוב'
                  : concentrationRisk.herfindahlIndex < 2500
                  ? 'ריכוזיות בינונית'
                  : 'ריכוזיות גבוהה'}
              </p>
            </div>
          </div>

          {/* Top Holdings */}
          {topHoldings.length > 0 && (
            <div className="mt-6">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                5 ההחזקות הגדולות
              </p>
              <div className="space-y-2">
                {topHoldings.map((holding, index) => {
                  const percent = totalValue > 0 ? (holding.marketValueILS / totalValue) * 100 : 0;
                  return (
                    <div key={holding.id} className="flex items-center gap-3">
                      <span className="w-6 h-6 flex items-center justify-center bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-300 rounded text-sm font-medium">
                        {index + 1}
                      </span>
                      <span className="flex-1 font-medium">{holding.symbol}</span>
                      <span className="text-gray-500">{formatCurrency(holding.marketValueILS)}</span>
                      <div className="w-24">
                        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary-500 rounded-full"
                            style={{ width: `${Math.min(percent, 100)}%` }}
                          />
                        </div>
                      </div>
                      <span className="w-16 text-left font-medium">{formatPercent(percent)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Currency Exposure */}
      <Card>
        <CardHeader>
          <CardTitle>חשיפה למטבעות</CardTitle>
          <DollarSign className="w-5 h-5 text-gray-400" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(['ILS', 'USD', 'EUR'] as const).map((currency) => {
              const value = currencyExposure[currency];
              const valueInILS =
                currency === 'ILS'
                  ? value
                  : value * rates[currency];
              const percent =
                currencyExposure.totalILS > 0
                  ? (valueInILS / currencyExposure.totalILS) * 100
                  : 0;

              const symbol = currency === 'ILS' ? '₪' : currency === 'USD' ? '$' : '€';
              const label = currency === 'ILS' ? 'שקל' : currency === 'USD' ? 'דולר' : 'יורו';

              return (
                <div key={currency} className="text-center">
                  <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-2xl font-bold">
                    {symbol}
                  </div>
                  <p className="font-medium text-gray-800 dark:text-white">{label}</p>
                  <p className="text-2xl font-bold text-gray-800 dark:text-white">
                    {formatPercent(percent)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {symbol}
                    {value.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Currency bar */}
          <div className="mt-6">
            <div className="h-4 rounded-full overflow-hidden flex">
              {(['ILS', 'USD', 'EUR'] as const).map((currency) => {
                const value = currencyExposure[currency];
                const valueInILS =
                  currency === 'ILS' ? value : value * rates[currency];
                const percent =
                  currencyExposure.totalILS > 0
                    ? (valueInILS / currencyExposure.totalILS) * 100
                    : 0;

                const colors = {
                  ILS: 'bg-blue-500',
                  USD: 'bg-green-500',
                  EUR: 'bg-amber-500',
                };

                return (
                  <div
                    key={currency}
                    className={`${colors[currency]} transition-all`}
                    style={{ width: `${percent}%` }}
                    title={`${currency}: ${percent.toFixed(1)}%`}
                  />
                );
              })}
            </div>
            <div className="flex justify-center gap-4 mt-2 text-sm">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-blue-500 rounded" />
                <span>ILS</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-500 rounded" />
                <span>USD</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-amber-500 rounded" />
                <span>EUR</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Notice */}
      {snapshots.length < 12 && (
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-500 mt-0.5" />
              <div>
                <p className="font-medium text-blue-800 dark:text-blue-200">
                  לא מספיק נתונים לחלק מהמדדים
                </p>
                <p className="text-sm text-blue-600 dark:text-blue-300">
                  יש לך {snapshots.length} תמונות מצב. לחישוב Sharpe ו-Sortino נדרשות לפחות 12.
                  המשך להפקיד ולעדכן את התיק כדי לצבור היסטוריה.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
