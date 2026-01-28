import { useState } from 'react';
import { Plus, Edit2, Trash2, Landmark, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Button, StatCard } from '@/components/common';
import { usePortfolioStore } from '@/stores/portfolioStore';
import { formatCurrency, formatPercent } from '@/utils/formatters';
import { calculateBond } from '@/services/calculationService';
import type { Bond } from '@/types';

export function Bonds() {
  const bonds = usePortfolioStore((state) => state.bonds);
  const { addBond, updateBond, deleteBond } = usePortfolioStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBond, setEditingBond] = useState<Bond | null>(null);

  // Calculate totals
  const bondsWithCalc = bonds.map(calculateBond);
  const totalValue = bondsWithCalc.reduce((sum, b) => sum + b.marketValue, 0);
  const totalCost = bondsWithCalc.reduce((sum, b) => sum + b.costBasis, 0);
  const totalGain = totalValue - totalCost;

  const handleEdit = (bond: Bond) => {
    setEditingBond(bond);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('האם אתה בטוח שברצונך למחוק אג"ח זה?')) {
      deleteBond(id);
    }
  };

  const handleSave = (data: Omit<Bond, 'id' | 'lastUpdate'>) => {
    if (editingBond) {
      updateBond(editingBond.id, data);
    } else {
      addBond(data);
    }
    setIsModalOpen(false);
    setEditingBond(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">ניהול אג"ח</h1>
          <p className="text-white/60">{bonds.length} אג"חים בתיק</p>
        </div>
        <Button
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => {
            setEditingBond(null);
            setIsModalOpen(true);
          }}
        >
          הוסף אג"ח
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="שווי כולל"
          value={formatCurrency(totalValue)}
          icon={<Landmark className="w-5 h-5" />}
        />
        <StatCard
          label="עלות בסיס"
          value={formatCurrency(totalCost)}
          icon={<Landmark className="w-5 h-5" />}
        />
        <StatCard
          label="רווח/הפסד"
          value={formatCurrency(totalGain)}
          trend={totalGain >= 0 ? 'positive' : 'negative'}
          icon={totalGain >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
        />
      </div>

      {/* Bonds List */}
      <Card>
        <CardHeader>
          <CardTitle>רשימת אג"חים</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {bonds.length === 0 ? (
            <div className="p-8 text-center">
              <Landmark className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                אין אג"חים בתיק עדיין
              </p>
              <Button onClick={() => setIsModalOpen(true)}>הוסף אג"ח ראשון</Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">שם</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">יחידות</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">מחיר נוכחי</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">שווי</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">עלות</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">רווח/הפסד</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">פעולות</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {bondsWithCalc.map((bond) => {
                    const isPositive = bond.gainLoss >= 0;

                    return (
                      <tr
                        key={bond.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-semibold text-gray-800 dark:text-white">
                              {bond.name}
                            </p>
                            {bond.maturityDate && (
                              <p className="text-sm text-gray-500">
                                פדיון: {new Date(bond.maturityDate).toLocaleDateString('he-IL')}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-800 dark:text-white">
                          {bond.units.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-gray-800 dark:text-white">
                          {formatCurrency(bond.currentPrice)}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-800 dark:text-white">
                          {formatCurrency(bond.marketValue)}
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                          {formatCurrency(bond.costBasis)}
                        </td>
                        <td className="px-4 py-3">
                          <div className={isPositive ? 'text-green-500' : 'text-red-500'}>
                            <p className="font-medium">
                              {isPositive ? '+' : ''}{formatCurrency(bond.gainLoss)}
                            </p>
                            <p className="text-xs">
                              {isPositive ? '+' : ''}{formatPercent(bond.gainLossPercent)}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEdit(bond)}
                              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                            >
                              <Edit2 className="w-4 h-4 text-gray-500" />
                            </button>
                            <button
                              onClick={() => handleDelete(bond.id)}
                              className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <BondModal
          bond={editingBond}
          onSave={handleSave}
          onClose={() => {
            setIsModalOpen(false);
            setEditingBond(null);
          }}
        />
      )}
    </div>
  );
}

// ===== Bond Modal =====
interface BondModalProps {
  bond: Bond | null;
  onSave: (data: Omit<Bond, 'id' | 'lastUpdate'>) => void;
  onClose: () => void;
}

function BondModal({ bond, onSave, onClose }: BondModalProps) {
  const [formData, setFormData] = useState({
    name: bond?.name || '',
    units: bond?.units || 0,
    costBasis: bond?.costBasis || 0,
    currentPrice: bond?.currentPrice || 0,
    maturityDate: bond?.maturityDate || '',
    couponRate: bond?.couponRate || 0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name: formData.name,
      units: Number(formData.units),
      costBasis: Number(formData.costBasis),
      currentPrice: Number(formData.currentPrice),
      maturityDate: formData.maturityDate || undefined,
      couponRate: Number(formData.couponRate) || undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="glass-card w-full max-w-md p-6">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
          {bond ? 'עריכת אג"ח' : 'הוספת אג"ח חדש'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              שם האג"ח
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input-field"
              placeholder='אג"ח ממשלתי 0525'
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                יחידות
              </label>
              <input
                type="number"
                step="1"
                value={formData.units}
                onChange={(e) => setFormData({ ...formData, units: Number(e.target.value) })}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                מחיר נוכחי ליחידה
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
              עלות בסיס כוללת
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.costBasis}
              onChange={(e) => setFormData({ ...formData, costBasis: Number(e.target.value) })}
              className="input-field"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                תאריך פדיון (אופציונלי)
              </label>
              <input
                type="date"
                value={formData.maturityDate}
                onChange={(e) => setFormData({ ...formData, maturityDate: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                ריבית קופון %
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.couponRate}
                onChange={(e) => setFormData({ ...formData, couponRate: Number(e.target.value) })}
                className="input-field"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1">
              {bond ? 'עדכון' : 'הוספה'}
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
