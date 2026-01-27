import type { Currency } from '@/types';

// ===== Number Formatting =====
export function formatNumber(value: number, decimals: number = 2): string {
  return value.toLocaleString('he-IL', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// ===== Currency Formatting =====
const currencySymbols: Record<Currency, string> = {
  ILS: '₪',
  USD: '$',
  EUR: '€',
};

export function formatCurrency(
  value: number,
  currency: Currency = 'ILS',
  showSymbol: boolean = true
): string {
  const formatted = formatNumber(value, 2);
  if (!showSymbol) return formatted;

  const symbol = currencySymbols[currency];

  // For ILS, symbol comes after the number
  if (currency === 'ILS') {
    return `${formatted} ${symbol}`;
  }

  // For USD/EUR, symbol comes before
  return `${symbol}${formatted}`;
}

// ===== Percentage Formatting =====
export function formatPercent(value: number, decimals: number = 2): string {
  const formatted = formatNumber(value, decimals);
  return `${formatted}%`;
}

// ===== Change Formatting (with + or -) =====
export function formatChange(value: number, decimals: number = 2): string {
  const prefix = value >= 0 ? '+' : '';
  return `${prefix}${formatNumber(value, decimals)}`;
}

export function formatChangePercent(value: number): string {
  const prefix = value >= 0 ? '+' : '';
  return `${prefix}${formatPercent(value)}`;
}

// ===== Date Formatting =====
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('he-IL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('he-IL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - d.getTime();

  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return 'עכשיו';
  if (minutes < 60) return `לפני ${minutes} דקות`;
  if (hours < 24) return `לפני ${hours} שעות`;
  if (days < 7) return `לפני ${days} ימים`;

  return formatDate(d);
}

// ===== Shares Formatting =====
export function formatShares(shares: number): string {
  if (shares === Math.floor(shares)) {
    return shares.toLocaleString('he-IL');
  }
  return formatNumber(shares, 4);
}
