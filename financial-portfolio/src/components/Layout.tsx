import { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  LineChart,
  Briefcase,
  Landmark,
  ArrowLeftRight,
  History,
  Calculator,
  Layers,
  Settings,
  Moon,
  Sun,
  Menu,
  X,
  Activity,
  Banknote,
  FileText,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useSettings, usePortfolioStore } from '@/stores/portfolioStore';
import { fetchExchangeRates } from '@/services/priceService';

interface LayoutProps {
  children: ReactNode;
}

const navItems = [
  { path: '/', label: 'סקירה', icon: LayoutDashboard },
  { path: '/charts', label: 'גרפים', icon: LineChart },
  { path: '/holdings', label: 'החזקות', icon: Briefcase },
  { path: '/bonds', label: 'אג"ח', icon: Landmark },
  { path: '/cash-flow', label: 'תזרים', icon: ArrowLeftRight },
  { path: '/history', label: 'היסטוריה', icon: History },
  { path: '/calculator', label: 'מחשבון', icon: Calculator },
  { path: '/analysis', label: 'ניתוח', icon: Activity },
  { path: '/dividends', label: 'דיבידנדים', icon: Banknote },
  { path: '/tax-report', label: 'דוח מס', icon: FileText },
  { path: '/groups', label: 'קבוצות', icon: Layers },
  { path: '/settings', label: 'הגדרות', icon: Settings },
];

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const settings = useSettings();
  const updateSettings = usePortfolioStore((state) => state.updateSettings);
  const updateExchangeRates = usePortfolioStore((state) => state.updateExchangeRates);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Fetch exchange rates on mount
  useEffect(() => {
    const loadRates = async () => {
      try {
        const rates = await fetchExchangeRates();
        if (rates) {
          updateExchangeRates({ ...rates, lastUpdate: new Date().toISOString() });
          console.log('Exchange rates loaded:', rates);
        }
      } catch (error) {
        console.error('Failed to fetch exchange rates:', error);
      }
    };
    loadRates();
  }, [updateExchangeRates]);

  const toggleDarkMode = () => {
    updateSettings({ darkMode: !settings.darkMode });
    document.documentElement.classList.toggle('dark');
  };

  return (
    <div className={clsx('min-h-screen', settings.darkMode && 'dark')}>
      {/* Header */}
      <header className="sticky top-0 z-50 glass-card rounded-none border-0 border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-pink-500 rounded-xl flex items-center justify-center">
              <Briefcase className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gradient hidden sm:block">
              תיק השקעות
            </span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={clsx(
                    'flex items-center gap-2 px-3 py-2 rounded-lg transition-all',
                    isActive
                      ? 'bg-primary-500 text-white'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-white/20'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleDarkMode}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              aria-label="Toggle dark mode"
            >
              {settings.darkMode ? (
                <Sun className="w-5 h-5 text-yellow-400" />
              ) : (
                <Moon className="w-5 h-5 text-gray-600" />
              )}
            </button>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <nav className="lg:hidden border-t border-gray-200 dark:border-gray-700 p-4">
            <div className="grid grid-cols-3 gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={clsx(
                      'flex flex-col items-center gap-1 p-3 rounded-lg transition-all',
                      isActive
                        ? 'bg-primary-500 text-white'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-white/20'
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-xs">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
        )}
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">{children}</main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-4 text-center text-white/40 text-sm">
        תיק השקעות v2.0 | מערכת ניהול תיק מודרנית
      </footer>
    </div>
  );
}
