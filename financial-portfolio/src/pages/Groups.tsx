import { useState } from 'react';
import { Plus, Edit2, Trash2, Layers, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Button } from '@/components/common';
import { usePortfolioStore, useGroups, useHoldings } from '@/stores/portfolioStore';
import { formatPercent } from '@/utils/formatters';
import type { Group } from '@/types';

const DEFAULT_COLORS = [
  '#8b5cf6', // Purple
  '#06b6d4', // Cyan
  '#10b981', // Green
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#ec4899', // Pink
  '#6366f1', // Indigo
  '#14b8a6', // Teal
];

export function Groups() {
  const groups = useGroups();
  const holdings = useHoldings();
  const { addGroup, updateGroup, deleteGroup } = usePortfolioStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);

  // Calculate total target
  const totalTarget = groups.reduce((sum, g) => sum + g.targetPercent, 0);
  const isValidTotal = Math.abs(totalTarget - 100) < 0.01;

  // Count holdings per group
  const holdingsPerGroup = groups.map((g) => ({
    ...g,
    holdingsCount: holdings.filter((h) => h.groupId === g.id).length,
  }));

  const handleEdit = (group: Group) => {
    setEditingGroup(group);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    const group = groups.find((g) => g.id === id);
    const holdingsCount = holdings.filter((h) => h.groupId === id).length;

    if (holdingsCount > 0) {
      if (!confirm(`לקבוצה "${group?.name}" יש ${holdingsCount} החזקות. האם למחוק בכל זאת? ההחזקות יישארו ללא קבוצה.`)) {
        return;
      }
    } else if (!confirm(`האם אתה בטוח שברצונך למחוק את הקבוצה "${group?.name}"?`)) {
      return;
    }

    deleteGroup(id);
  };

  const handleSave = (data: Omit<Group, 'id'>) => {
    if (editingGroup) {
      updateGroup(editingGroup.id, data);
    } else {
      addGroup(data);
    }
    setIsModalOpen(false);
    setEditingGroup(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">ניהול קבוצות</h1>
          <p className="text-white/60">{groups.length} קבוצות מוגדרות</p>
        </div>
        <Button
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => {
            setEditingGroup(null);
            setIsModalOpen(true);
          }}
        >
          הוסף קבוצה
        </Button>
      </div>

      {/* Total Warning */}
      {!isValidTotal && (
        <Card className="border-amber-500 bg-amber-50 dark:bg-amber-900/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <AlertCircle className="w-5 h-5" />
              <p>
                סך היעדים הוא {formatPercent(totalTarget)} - מומלץ שהסכום יהיה 100%
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Groups Grid */}
      {groups.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Layers className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              אין קבוצות מוגדרות עדיין
            </p>
            <Button onClick={() => setIsModalOpen(true)}>צור קבוצה ראשונה</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {holdingsPerGroup.map((group) => (
            <Card key={group.id} className="relative overflow-hidden">
              {/* Color bar */}
              <div
                className="absolute top-0 left-0 right-0 h-1"
                style={{ backgroundColor: group.color }}
              />

              <CardContent className="p-4 pt-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: group.color }}
                    />
                    <h3 className="font-semibold text-gray-800 dark:text-white">
                      {group.name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEdit(group)}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                    >
                      <Edit2 className="w-4 h-4 text-gray-500" />
                    </button>
                    <button
                      onClick={() => handleDelete(group.id)}
                      className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">יעד:</span>
                    <span className="font-medium">{formatPercent(group.targetPercent)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">החזקות:</span>
                    <span className="font-medium">{group.holdingsCount}</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-3">
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(group.targetPercent, 100)}%`,
                        backgroundColor: group.color,
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>סיכום יעדים</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {groups.map((group) => (
              <div key={group.id} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: group.color }}
                />
                <span className="flex-1 text-gray-600 dark:text-gray-400">{group.name}</span>
                <span className="font-medium">{formatPercent(group.targetPercent)}</span>
              </div>
            ))}
            <div className="pt-2 mt-2 border-t dark:border-gray-700 flex justify-between font-bold">
              <span>סה"כ:</span>
              <span className={isValidTotal ? 'text-green-500' : 'text-amber-500'}>
                {formatPercent(totalTarget)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <GroupModal
          group={editingGroup}
          usedColors={groups.map((g) => g.color)}
          onSave={handleSave}
          onClose={() => {
            setIsModalOpen(false);
            setEditingGroup(null);
          }}
        />
      )}
    </div>
  );
}

// ===== Group Modal =====
interface GroupModalProps {
  group: Group | null;
  usedColors: string[];
  onSave: (data: Omit<Group, 'id'>) => void;
  onClose: () => void;
}

function GroupModal({ group, usedColors, onSave, onClose }: GroupModalProps) {
  const [formData, setFormData] = useState({
    name: group?.name || '',
    targetPercent: group?.targetPercent || 0,
    color: group?.color || DEFAULT_COLORS.find((c) => !usedColors.includes(c)) || DEFAULT_COLORS[0],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name: formData.name,
      targetPercent: Number(formData.targetPercent),
      color: formData.color,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="glass-card w-full max-w-md p-6">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
          {group ? 'עריכת קבוצה' : 'הוספת קבוצה חדשה'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              שם הקבוצה
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input-field"
              placeholder='מניות ארה"ב'
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              יעד אחוז מהתיק
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              value={formData.targetPercent}
              onChange={(e) => setFormData({ ...formData, targetPercent: Number(e.target.value) })}
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              צבע
            </label>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, color })}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    formData.color === color
                      ? 'border-gray-800 dark:border-white scale-110'
                      : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1">
              {group ? 'עדכון' : 'הוספה'}
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
