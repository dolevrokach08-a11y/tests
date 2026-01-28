import { useState, useRef } from 'react';
import {
  Settings as SettingsIcon,
  Download,
  Upload,
  RefreshCw,
  Trash2,
  Moon,
  Sun,
  DollarSign,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Button } from '@/components/common';
import { usePortfolioStore, useSettings, useExchangeRates } from '@/stores/portfolioStore';
import type { Currency } from '@/types';

export function Settings() {
  const settings = useSettings();
  const rates = useExchangeRates();
  const {
    updateSettings,
    updateExchangeRates,
    importPortfolio,
    resetPortfolio,
  } = usePortfolioStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Manual rate editing
  const [editingRates, setEditingRates] = useState({
    USD: rates.USD,
    EUR: rates.EUR,
  });

  const handleExport = () => {
    const state = usePortfolioStore.getState();
    const data = {
      holdings: state.holdings,
      bonds: state.bonds,
      groups: state.groups,
      cashAccounts: state.cashAccounts,
      exchangeRates: state.exchangeRates,
      snapshots: state.snapshots,
      settings: state.settings,
      exportDate: new Date().toISOString(),
      version: '2.0',
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `portfolio-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);

        // Basic validation
        if (!data.holdings || !Array.isArray(data.holdings)) {
          throw new Error('קובץ לא תקין - חסר שדה holdings');
        }

        if (confirm('האם אתה בטוח? זה יחליף את כל הנתונים הקיימים.')) {
          importPortfolio({
            holdings: data.holdings || [],
            bonds: data.bonds || [],
            groups: data.groups || [],
            cashAccounts: data.cashAccounts || {
              ILS: { currency: 'ILS', balance: 0, transactions: [] },
              USD: { currency: 'USD', balance: 0, transactions: [] },
              EUR: { currency: 'EUR', balance: 0, transactions: [] },
            },
            exchangeRates: data.exchangeRates || rates,
            snapshots: data.snapshots || [],
            settings: data.settings || settings,
          });
        }
      } catch (err) {
        setImportError(err instanceof Error ? err.message : 'שגיאה בטעינת הקובץ');
      }
    };
    reader.readAsText(file);

    // Reset input
    event.target.value = '';
  };

  const handleReset = () => {
    resetPortfolio();
    setShowResetConfirm(false);
  };

  const handleSaveRates = () => {
    updateExchangeRates({
      USD: editingRates.USD,
      EUR: editingRates.EUR,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">הגדרות</h1>
        <p className="text-white/60">התאמה אישית וניהול נתונים</p>
      </div>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle>תצוגה</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {settings.darkMode ? (
                <Moon className="w-5 h-5 text-primary-500" />
              ) : (
                <Sun className="w-5 h-5 text-amber-500" />
              )}
              <div>
                <p className="font-medium text-gray-800 dark:text-white">מצב תצוגה</p>
                <p className="text-sm text-gray-500">
                  {settings.darkMode ? 'מצב כהה' : 'מצב בהיר'}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                updateSettings({ darkMode: !settings.darkMode });
                document.documentElement.classList.toggle('dark');
              }}
              className={`relative w-14 h-7 rounded-full transition-colors ${
                settings.darkMode ? 'bg-primary-500' : 'bg-gray-300'
              }`}
            >
              <div
                className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                  settings.darkMode ? 'right-1' : 'left-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DollarSign className="w-5 h-5 text-gray-500" />
              <div>
                <p className="font-medium text-gray-800 dark:text-white">מטבע ברירת מחדל</p>
                <p className="text-sm text-gray-500">מטבע להצגה ראשית</p>
              </div>
            </div>
            <select
              value={settings.defaultCurrency}
              onChange={(e) => updateSettings({ defaultCurrency: e.target.value as Currency })}
              className="input-field w-auto"
            >
              <option value="ILS">ILS - שקל</option>
              <option value="USD">USD - דולר</option>
              <option value="EUR">EUR - יורו</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Exchange Rates */}
      <Card>
        <CardHeader>
          <CardTitle>שערי חליפין</CardTitle>
          <span className="text-sm text-gray-500">
            עדכון אחרון: {new Date(rates.lastUpdate).toLocaleString('he-IL')}
          </span>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                USD → ILS
              </label>
              <input
                type="number"
                step="0.0001"
                value={editingRates.USD}
                onChange={(e) => setEditingRates({ ...editingRates, USD: Number(e.target.value) })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                EUR → ILS
              </label>
              <input
                type="number"
                step="0.0001"
                value={editingRates.EUR}
                onChange={(e) => setEditingRates({ ...editingRates, EUR: Number(e.target.value) })}
                className="input-field"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSaveRates} leftIcon={<RefreshCw className="w-4 h-4" />}>
              שמור שערים
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Auto Refresh */}
      <Card>
        <CardHeader>
          <CardTitle>עדכון אוטומטי</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-gray-500" />
              <div>
                <p className="font-medium text-gray-800 dark:text-white">עדכון מחירים אוטומטי</p>
                <p className="text-sm text-gray-500">עדכון מחירי מניות באופן אוטומטי</p>
              </div>
            </div>
            <button
              onClick={() => updateSettings({ autoRefreshPrices: !settings.autoRefreshPrices })}
              className={`relative w-14 h-7 rounded-full transition-colors ${
                settings.autoRefreshPrices ? 'bg-primary-500' : 'bg-gray-300'
              }`}
            >
              <div
                className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                  settings.autoRefreshPrices ? 'right-1' : 'left-1'
                }`}
              />
            </button>
          </div>

          {settings.autoRefreshPrices && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">תדירות עדכון:</span>
              <select
                value={settings.refreshIntervalMinutes}
                onChange={(e) => updateSettings({ refreshIntervalMinutes: Number(e.target.value) })}
                className="input-field w-auto"
              >
                <option value="5">כל 5 דקות</option>
                <option value="15">כל 15 דקות</option>
                <option value="30">כל 30 דקות</option>
                <option value="60">כל שעה</option>
              </select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader>
          <CardTitle>ניהול נתונים</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="secondary"
              leftIcon={<Download className="w-4 h-4" />}
              onClick={handleExport}
            >
              ייצוא נתונים
            </Button>
            <Button
              variant="secondary"
              leftIcon={<Upload className="w-4 h-4" />}
              onClick={() => fileInputRef.current?.click()}
            >
              ייבוא נתונים
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </div>

          {importError && (
            <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-sm">
              {importError}
            </div>
          )}

          <div className="pt-4 border-t dark:border-gray-700">
            {showResetConfirm ? (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-3">
                  <AlertTriangle className="w-5 h-5" />
                  <p className="font-medium">אזהרה: פעולה זו תמחק את כל הנתונים!</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => setShowResetConfirm(false)}
                  >
                    ביטול
                  </Button>
                  <Button
                    className="bg-red-500 hover:bg-red-600"
                    onClick={handleReset}
                  >
                    אישור מחיקה
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="secondary"
                leftIcon={<Trash2 className="w-4 h-4" />}
                onClick={() => setShowResetConfirm(true)}
                className="text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30"
              >
                איפוס כל הנתונים
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardContent className="p-4 text-center">
          <SettingsIcon className="w-8 h-8 mx-auto mb-2 text-primary-500" />
          <p className="font-medium text-gray-800 dark:text-white">תיק השקעות v2.0</p>
          <p className="text-sm text-gray-500">
            מערכת ניהול תיק השקעות מודרנית
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Built with React, TypeScript, Zustand & Tailwind CSS
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
