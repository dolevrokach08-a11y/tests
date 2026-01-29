import { useState } from 'react';
import { Plus, RefreshCw, Search, Filter, Trash2, Edit2, TrendingUp, TrendingDown } from 'lucide-react';
import { usePortfolioStore, useHoldings, useGroups, useExchangeRates } from '@/stores/portfolioStore';
import { Card, CardContent, Button } from '@/components/common';
import { formatCurrency, formatPercent, formatNumber } from '@/utils/formatters';
import { calculateHolding } from '@/services/calculationService';
import { usePriceRefresh } from '@/hooks/usePriceRefresh';
import type { Holding, Currency, HoldingWithCalculations } from '@/types';

export function Holdings() {
  const holdings = useHoldings();
  const groups = useGroups();
  const rates = useExchangeRates();
  const { addHolding, updateHolding, deleteHolding } = usePortfolioStore();
  const { isRefreshing, refreshAll } = usePriceRefresh();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHolding, setEditingHolding] = useState<Holding | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGroup, setFilterGroup] = useState<string>('all');

  // Calculate holdings with values
  const holdingsWithCalc: HoldingWithCalculations[] = holdings.map((h) =>
    calculateHolding(h, rates)
  );

  // Filter holdings
  const filteredHoldings = holdingsWithCalc.filter((h) => {
    const matchesSearch =
      h.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGroup = filterGroup === 'all' || h.groupId === filterGroup;
    return matchesSearch && matchesGroup;
  });

  // Calculate totals
  const totalValue = filteredHoldings.reduce((sum, h) => sum + h.marketValueILS, 0);
  const totalGain = filteredHoldings.reduce((sum, h) => sum + h.gainLoss, 0);

  const handleEdit = (holding: Holding) => {
    setEditingHolding(holding);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('האם אתה בטוח שברצונך למחוק החזקה זו?')) {
      deleteHolding(id);
    }
  };

  const handleSave = (data: Omit<Holding, 'id' | 'transactions' | 'lastUpdate'>) => {
    if (editingHolding) {
      updateHolding(editingHolding.id, data);
    } else {
      addHolding(data);
    }
    setIsModalOpen(false);
    setEditingHolding(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">ניהול החזקות</h1>
          <p className="text-white/60">
            {holdings.length} החזקות | שווי כולל: {formatCurrency(totalValue)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            leftIcon={<RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />}
            onClick={refreshAll}
            disabled={isRefreshing}
          >
            {isRefreshing ? 'מעדכן...' : 'עדכון מחירים'}
          </Button>
          <Button
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => {
              setEditingHolding(null);
              setIsModalOpen(true);
            }}
          >
            הוסף החזקה
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="חיפוש לפי סימול או שם..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pr-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={filterGroup}
                onChange={(e) => setFilterGroup(e.target.value)}
                className="input-field"
              >
                <option value="all">כל הקבוצות</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Holdings Table */}
      <Card>
        <CardContent className="p-0">
          {filteredHoldings.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {holdings.length === 0
                  ? 'אין החזקות עדיין. הוסף את ההחזקה הראשונה שלך!'
                  : 'לא נמצאו החזקות התואמות לחיפוש'}
              </p>
              {holdings.length === 0 && (
                <Button onClick={() => setIsModalOpen(true)}>הוסף החזקה</Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">סימול</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">כמות</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">מחיר נוכחי</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">שווי</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">רווח/הפסד</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">קבוצה</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">פעולות</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {filteredHoldings.map((holding) => {
                    const group = groups.find((g) => g.id === holding.groupId);
                    const isPositive = holding.gainLoss >= 0;

                    return (
                      <tr
                        key={holding.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-semibold text-gray-800 dark:text-white">
                              {holding.symbol}
                            </p>
                            <p className="text-sm text-gray-500">{holding.name}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-800 dark:text-white">
                          {formatNumber(holding.shares)}
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-gray-800 dark:text-white">
                              {formatCurrency(holding.currentPrice, holding.currency)}
                            </p>
                            <p className="text-xs text-gray-500">{holding.currency}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-gray-800 dark:text-white">
                              {formatCurrency(holding.marketValueILS)}
                            </p>
                            {holding.currency !== 'ILS' && (
                              <p className="text-xs text-gray-500">
                                {formatCurrency(holding.marketValue, holding.currency)}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className={`flex items-center gap-1 ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                            {isPositive ? (
                              <TrendingUp className="w-4 h-4" />
                            ) : (
                              <TrendingDown className="w-4 h-4" />
                            )}
                            <div>
                              <p className="font-medium">
                                {formatCurrency(Math.abs(holding.gainLoss), holding.currency)}
                              </p>
                              <p className="text-xs">
                                {isPositive ? '+' : ''}{formatPercent(holding.gainLossPercent)}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {group && (
                            <span
                              className="px-2 py-1 rounded-full text-xs font-medium text-white"
                              style={{ backgroundColor: group.color }}
                            >
                              {group.name}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEdit(holding)}
                              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                            >
                              <Edit2 className="w-4 h-4 text-gray-500" />
                            </button>
                            <button
                              onClick={() => handleDelete(holding.id)}
                              className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 font-medium text-gray-800 dark:text-white">
                      סה"כ
                    </td>
                    <td className="px-4 py-3 font-bold text-gray-800 dark:text-white">
                      {formatCurrency(totalValue)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={totalGain >= 0 ? 'text-green-500' : 'text-red-500'}>
                        {totalGain >= 0 ? '+' : ''}{formatCurrency(totalGain)}
                      </span>
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <HoldingModal
          holding={editingHolding}
          groups={groups}
          onSave={handleSave}
          onClose={() => {
            setIsModalOpen(false);
            setEditingHolding(null);
          }}
        />
      )}
    </div>
  );
}

// ===== Holding Modal Component =====
interface HoldingModalProps {
  holding: Holding | null;
  groups: { id: string; name: string }[];
  onSave: (data: Omit<Holding, 'id' | 'transactions' | 'lastUpdate'>) => void;
  onClose: () => void;
}

function HoldingModal({ holding, groups, onSave, onClose }: HoldingModalProps) {
  const [formData, setFormData] = useState({
    symbol: holding?.symbol || '',
    name: holding?.name || '',
    shares: holding?.shares || 0,
    currentPrice: holding?.currentPrice || 0,
    currency: holding?.currency || 'ILS' as Currency,
    groupId: holding?.groupId || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      symbol: formData.symbol.toUpperCase(),
      name: formData.name,
      shares: Number(formData.shares),
      currentPrice: Number(formData.currentPrice),
      currency: formData.currency,
      groupId: formData.groupId || null,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="glass-card w-full max-w-md p-6">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
          {holding ? 'עריכת החזקה' : 'הוספת החזקה חדשה'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                סימול
              </label>
              <input
                type="text"
                value={formData.symbol}
                onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                className="input-field"
                placeholder="AAPL"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                מטבע
              </label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value as Currency })}
                className="input-field"
              >
                <option value="ILS">ILS - שקל</option>
                <option value="USD">USD - דולר</option>
                <option value="EUR">EUR - יורו</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              שם החברה
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input-field"
              placeholder="Apple Inc."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                כמות
              </label>
              <input
                type="number"
                step="0.0001"
                value={formData.shares}
                onChange={(e) => setFormData({ ...formData, shares: Number(e.target.value) })}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                מחיר נוכחי
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.currentPrice}
                onChange={(e) => setFormData({ ...formData, currentPrice: Number(e.target.value) })}
                className="input-field"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              קבוצה
            </label>
            <select
              value={formData.groupId}
              onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}
              className="input-field"
            >
              <option value="">ללא קבוצה</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1">
              {holding ? 'עדכון' : 'הוספה'}
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
