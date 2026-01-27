import { TrendingUp, TrendingDown, MoreVertical } from 'lucide-react';
import { Card } from '@/components/common';
import { formatCurrency, formatShares, formatChangePercent } from '@/utils/formatters';
import { calculateHolding } from '@/services/calculationService';
import { useExchangeRates } from '@/stores/portfolioStore';
import type { Holding } from '@/types';

interface HoldingCardProps {
  holding: Holding;
  onEdit?: (holding: Holding) => void;
  onDelete?: (holding: Holding) => void;
}

export function HoldingCard({ holding, onEdit }: HoldingCardProps) {
  const rates = useExchangeRates();
  const calculated = calculateHolding(holding, rates);
  const isPositive = calculated.gainLoss >= 0;

  return (
    <Card className="hover:scale-[1.02] transition-transform">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Symbol & Name */}
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-gray-800 dark:text-white">
              {holding.symbol}
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500">
              {holding.currency}
            </span>
          </div>
          {holding.name && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {holding.name}
            </p>
          )}

          {/* Shares & Current Price */}
          <div className="mt-3 flex items-baseline gap-4">
            <div>
              <span className="text-2xl font-bold text-gray-800 dark:text-white">
                {formatCurrency(calculated.marketValue, holding.currency)}
              </span>
              <p className="text-xs text-gray-500">
                {formatShares(holding.shares)} יח' × {formatCurrency(holding.currentPrice, holding.currency, false)}
              </p>
            </div>
          </div>

          {/* Gain/Loss */}
          <div className="mt-2 flex items-center gap-2">
            {isPositive ? (
              <TrendingUp className="w-4 h-4 text-green-500" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-500" />
            )}
            <span className={isPositive ? 'text-green-500' : 'text-red-500'}>
              {formatCurrency(calculated.gainLoss, holding.currency)}{' '}
              ({formatChangePercent(calculated.gainLossPercent)})
            </span>
          </div>
        </div>

        {/* Actions */}
        <button
          onClick={() => onEdit?.(holding)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <MoreVertical className="w-5 h-5 text-gray-400" />
        </button>
      </div>
    </Card>
  );
}
