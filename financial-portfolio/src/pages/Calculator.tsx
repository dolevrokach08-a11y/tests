import { useState, useMemo } from 'react';
import { Calculator as CalcIcon, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Button } from '@/components/common';
import { useHoldings, useGroups, useExchangeRates, useCashAccounts } from '@/stores/portfolioStore';
import { calculateHolding, calculateAllocation } from '@/services/calculationService';
import { formatCurrency, formatPercent } from '@/utils/formatters';

export function Calculator() {
  const holdings = useHoldings();
  const groups = useGroups();
  const rates = useExchangeRates();
  const cashAccounts = useCashAccounts();

  const [investAmount, setInvestAmount] = useState<number>(10000);

  // Calculate current allocation
  const holdingsWithCalc = holdings.map((h) => calculateHolding(h, rates));
  const currentAllocation = calculateAllocation(holdingsWithCalc, groups);

  // Calculate available cash
  const availableCash =
    cashAccounts.ILS.balance +
    cashAccounts.USD.balance * rates.USD +
    cashAccounts.EUR.balance * rates.EUR;

  // Calculate recommended investments
  const recommendations = useMemo(() => {
    const totalAfterInvestment = currentAllocation.totalValue + investAmount;

    return groups.map((group) => {
      const currentItem = currentAllocation.items.find((i) => i.groupId === group.id);
      const currentValue = currentItem?.currentValue || 0;

      // Target value after investment
      const targetValue = (group.targetPercent / 100) * totalAfterInvestment;

      // How much to invest in this group
      const toInvest = Math.max(0, targetValue - currentValue);

      // New percent after investment
      const newPercent = ((currentValue + toInvest) / totalAfterInvestment) * 100;

      return {
        groupId: group.id,
        groupName: group.name,
        color: group.color,
        currentValue,
        currentPercent: currentItem?.currentPercent || 0,
        targetPercent: group.targetPercent,
        toInvest,
        newPercent,
        difference: newPercent - group.targetPercent,
      };
    });
  }, [groups, currentAllocation, investAmount]);

  // Calculate total recommended investment
  const totalRecommended = recommendations.reduce((sum, r) => sum + r.toInvest, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">מחשבון הקצאה</h1>
        <p className="text-white/60">חשב את ההשקעה האופטימלית לפי יעדי ההקצאה שלך</p>
      </div>

      {/* Investment Input */}
      <Card>
        <CardHeader>
          <CardTitle>סכום להשקעה</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                כמה תרצה להשקיע?
              </label>
              <input
                type="number"
                min="0"
                step="1000"
                value={investAmount}
                onChange={(e) => setInvestAmount(Number(e.target.value))}
                className="input-field text-2xl font-bold"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setInvestAmount(5000)}>
                ₪5,000
              </Button>
              <Button variant="secondary" onClick={() => setInvestAmount(10000)}>
                ₪10,000
              </Button>
              <Button variant="secondary" onClick={() => setInvestAmount(availableCash)}>
                כל המזומן
              </Button>
            </div>
          </div>

          <p className="mt-2 text-sm text-gray-500">
            מזומן זמין: {formatCurrency(availableCash)}
          </p>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>המלצות השקעה</CardTitle>
          {currentAllocation.rebalanceNeeded && (
            <div className="flex items-center gap-1 text-amber-500 text-sm">
              <AlertCircle className="w-4 h-4" />
              מומלץ לאזן מחדש
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">קבוצה</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">שווי נוכחי</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">% נוכחי</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">% יעד</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">להשקיע</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">% אחרי</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {recommendations.map((rec) => (
                  <tr
                    key={rec.groupId}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/30"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: rec.color }}
                        />
                        <span className="font-medium text-gray-800 dark:text-white">
                          {rec.groupName}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {formatCurrency(rec.currentValue)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {rec.currentPercent > rec.targetPercent ? (
                          <TrendingUp className="w-3 h-3 text-green-500" />
                        ) : rec.currentPercent < rec.targetPercent ? (
                          <TrendingDown className="w-3 h-3 text-red-500" />
                        ) : null}
                        <span>{formatPercent(rec.currentPercent)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {formatPercent(rec.targetPercent)}
                    </td>
                    <td className="px-4 py-3">
                      {rec.toInvest > 0 ? (
                        <span className="font-bold text-green-500">
                          +{formatCurrency(rec.toInvest)}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          Math.abs(rec.difference) < 1
                            ? 'text-green-500'
                            : Math.abs(rec.difference) < 5
                            ? 'text-amber-500'
                            : 'text-red-500'
                        }
                      >
                        {formatPercent(rec.newPercent)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <td colSpan={4} className="px-4 py-3 font-medium text-gray-800 dark:text-white">
                    סה"כ להשקעה
                  </td>
                  <td className="px-4 py-3 font-bold text-green-500">
                    {formatCurrency(totalRecommended)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Visual Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>השוואה ויזואלית</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recommendations.map((rec) => (
              <div key={rec.groupId}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 dark:text-gray-300">{rec.groupName}</span>
                  <span className="text-gray-500">
                    {formatPercent(rec.currentPercent)} → {formatPercent(rec.newPercent)}
                  </span>
                </div>
                <div className="relative h-6 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  {/* Target line */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-gray-800 dark:bg-white z-10"
                    style={{ left: `${rec.targetPercent}%` }}
                  />
                  {/* Current bar */}
                  <div
                    className="absolute top-0 bottom-0 rounded-full opacity-50"
                    style={{
                      width: `${rec.currentPercent}%`,
                      backgroundColor: rec.color,
                    }}
                  />
                  {/* New bar */}
                  <div
                    className="absolute top-0 bottom-0 rounded-full"
                    style={{
                      width: `${rec.newPercent}%`,
                      backgroundColor: rec.color,
                    }}
                  />
                </div>
              </div>
            ))}
            <div className="flex items-center gap-4 text-sm text-gray-500 mt-4">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-gray-800 dark:bg-white rounded" />
                <span>יעד</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-primary-500 opacity-50 rounded" />
                <span>נוכחי</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-primary-500 rounded" />
                <span>אחרי השקעה</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <CalcIcon className="w-5 h-5 text-primary-500 mt-0.5" />
            <div>
              <p className="font-medium text-gray-800 dark:text-white mb-1">
                טיפ להשקעה חכמה
              </p>
              <p className="text-sm text-gray-500">
                המחשבון מחשב את ההשקעה האופטימלית כדי להתקרב ליעדי ההקצאה שהגדרת.
                שים לב שזו המלצה בלבד - תמיד קח בחשבון את המצב האישי שלך ואת תנאי השוק.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
