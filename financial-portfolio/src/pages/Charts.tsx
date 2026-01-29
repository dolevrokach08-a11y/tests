import { useState } from 'react';
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, PieChart as PieIcon, BarChart3, Activity } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/common';
import { useHoldings, useGroups, useExchangeRates, usePortfolioStore } from '@/stores/portfolioStore';
import { calculateHolding, calculateAllocation } from '@/services/calculationService';
import { formatCurrency, formatPercent } from '@/utils/formatters';

const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1'];

export function Charts() {
  const holdings = useHoldings();
  const groups = useGroups();
  const rates = useExchangeRates();
  const snapshots = usePortfolioStore((state) => state.snapshots);

  const [activeTab, setActiveTab] = useState<'allocation' | 'performance' | 'distribution'>('allocation');

  // Calculate holdings with values
  const holdingsWithCalc = holdings.map((h) => calculateHolding(h, rates));
  const allocation = calculateAllocation(holdingsWithCalc, groups);

  // Prepare data for charts
  const allocationData = allocation.items.map((item) => ({
    name: item.groupName,
    value: item.currentValue,
    percent: item.currentPercent,
    target: item.targetPercent,
    color: item.color,
  }));

  const comparisonData = allocation.items.map((item) => ({
    name: item.groupName,
    current: item.currentPercent,
    target: item.targetPercent,
  }));

  const holdingsDistribution = holdingsWithCalc
    .sort((a, b) => b.marketValueILS - a.marketValueILS)
    .slice(0, 10)
    .map((h, i) => ({
      name: h.symbol,
      value: h.marketValueILS,
      color: COLORS[i % COLORS.length],
    }));

  // Performance over time (from snapshots)
  const performanceData = snapshots.map((s) => ({
    date: new Date(s.date).toLocaleDateString('he-IL'),
    value: s.stocksValue + s.bondsValue + s.cashTotal,
    stocks: s.stocksValue,
    bonds: s.bondsValue,
    cash: s.cashTotal,
  }));

  const tabs = [
    { id: 'allocation', label: 'הקצאת נכסים', icon: PieIcon },
    { id: 'performance', label: 'ביצועים', icon: TrendingUp },
    { id: 'distribution', label: 'התפלגות', icon: BarChart3 },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">גרפים וניתוחים</h1>
        <p className="text-white/60">ניתוח ויזואלי של תיק ההשקעות</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                activeTab === tab.id
                  ? 'bg-primary-500 text-white'
                  : 'glass-card text-gray-600 dark:text-gray-300 hover:bg-white/30'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Charts Content */}
      {activeTab === 'allocation' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle>הקצאה לפי קבוצות</CardTitle>
            </CardHeader>
            <CardContent>
              {allocationData.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  אין נתונים להצגה
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={allocationData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${percent.toFixed(1)}%)`}
                    >
                      {allocationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        borderRadius: '8px',
                        border: 'none',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Comparison Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle>נוכחי מול יעד</CardTitle>
            </CardHeader>
            <CardContent>
              {comparisonData.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  אין נתונים להצגה
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={comparisonData} layout="vertical" margin={{ left: 20, right: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={120}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                    <Legend />
                    <Bar dataKey="current" name="נוכחי" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="target" name="יעד" fill="#06b6d4" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Allocation Table */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>פירוט הקצאה</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b dark:border-gray-700">
                      <th className="text-right py-2 px-4">קבוצה</th>
                      <th className="text-right py-2 px-4">שווי</th>
                      <th className="text-right py-2 px-4">אחוז נוכחי</th>
                      <th className="text-right py-2 px-4">אחוז יעד</th>
                      <th className="text-right py-2 px-4">הפרש</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allocation.items.map((item) => (
                      <tr key={item.groupId} className="border-b dark:border-gray-700">
                        <td className="py-2 px-4">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: item.color }}
                            />
                            {item.groupName}
                          </div>
                        </td>
                        <td className="py-2 px-4">{formatCurrency(item.currentValue)}</td>
                        <td className="py-2 px-4">{formatPercent(item.currentPercent)}</td>
                        <td className="py-2 px-4">{formatPercent(item.targetPercent)}</td>
                        <td className="py-2 px-4">
                          <span
                            className={
                              item.difference > 0
                                ? 'text-green-500'
                                : item.difference < 0
                                ? 'text-red-500'
                                : ''
                            }
                          >
                            {item.difference > 0 ? '+' : ''}
                            {formatPercent(item.difference)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'performance' && (
        <div className="grid grid-cols-1 gap-6">
          {/* Value Over Time */}
          <Card>
            <CardHeader>
              <CardTitle>שווי התיק לאורך זמן</CardTitle>
            </CardHeader>
            <CardContent>
              {performanceData.length < 2 ? (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>צריך לפחות 2 תמונות מצב כדי להציג גרף</p>
                    <p className="text-sm mt-1">הוסף הפקדות או משיכות כדי ליצור תמונות מצב</p>
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={performanceData}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="date" />
                    <YAxis tickFormatter={(v) => formatCurrency(v, 'ILS', true)} />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        borderRadius: '8px',
                        border: 'none',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      name="שווי כולל"
                      stroke="#8b5cf6"
                      fill="url(#colorValue)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Asset Breakdown Over Time */}
          <Card>
            <CardHeader>
              <CardTitle>פילוח נכסים לאורך זמן</CardTitle>
            </CardHeader>
            <CardContent>
              {performanceData.length < 2 ? (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  אין מספיק נתונים להצגה
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="date" />
                    <YAxis tickFormatter={(v) => formatCurrency(v, 'ILS', true)} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="stocks"
                      name="מניות"
                      stackId="1"
                      stroke="#8b5cf6"
                      fill="#8b5cf6"
                    />
                    <Area
                      type="monotone"
                      dataKey="bonds"
                      name='אג"ח'
                      stackId="1"
                      stroke="#06b6d4"
                      fill="#06b6d4"
                    />
                    <Area
                      type="monotone"
                      dataKey="cash"
                      name="מזומן"
                      stackId="1"
                      stroke="#10b981"
                      fill="#10b981"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'distribution' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Holdings */}
          <Card>
            <CardHeader>
              <CardTitle>10 ההחזקות הגדולות</CardTitle>
            </CardHeader>
            <CardContent>
              {holdingsDistribution.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  אין החזקות להצגה
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={holdingsDistribution}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="value"
                      label={({ name }) => name}
                    >
                      {holdingsDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Holdings Bar */}
          <Card>
            <CardHeader>
              <CardTitle>שווי לפי החזקה</CardTitle>
            </CardHeader>
            <CardContent>
              {holdingsDistribution.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  אין החזקות להצגה
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={holdingsDistribution} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis type="number" tickFormatter={(v) => formatCurrency(v, 'ILS', true)} />
                    <YAxis type="category" dataKey="name" width={60} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="value" name="שווי" radius={[0, 4, 4, 0]}>
                      {holdingsDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Currency Distribution */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>התפלגות לפי מטבע</CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const currencyData = holdingsWithCalc.reduce(
                  (acc, h) => {
                    acc[h.currency] = (acc[h.currency] || 0) + h.marketValueILS;
                    return acc;
                  },
                  {} as Record<string, number>
                );

                const data = Object.entries(currencyData).map(([currency, value], i) => ({
                  name: currency,
                  value,
                  color: COLORS[i],
                }));

                if (data.length === 0) {
                  return (
                    <div className="h-32 flex items-center justify-center text-gray-500">
                      אין נתונים להצגה
                    </div>
                  );
                }

                return (
                  <div className="flex flex-wrap gap-4 justify-center">
                    {data.map((item) => (
                      <div
                        key={item.name}
                        className="flex items-center gap-3 px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800"
                      >
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-gray-500">{formatCurrency(item.value)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
