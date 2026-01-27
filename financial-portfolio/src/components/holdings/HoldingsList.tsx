import { useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { useHoldings } from '@/stores/portfolioStore';
import { usePriceRefresh } from '@/hooks/usePriceRefresh';
import { HoldingCard } from './HoldingCard';
import { Button } from '@/components/common';
import type { Holding } from '@/types';

interface HoldingsListProps {
  onAddHolding: () => void;
  onEditHolding: (holding: Holding) => void;
}

export function HoldingsList({ onAddHolding, onEditHolding }: HoldingsListProps) {
  const holdings = useHoldings();
  const { isRefreshing, refreshPrices } = usePriceRefresh();
  const [filter, setFilter] = useState<'all' | 'stocks' | 'etf'>('all');

  const filteredHoldings = holdings.filter((h) => {
    if (filter === 'all') return true;
    // Simple heuristic: ETFs often have longer names or specific patterns
    const isETF = h.symbol.includes('ETF') || h.name?.includes('ETF');
    return filter === 'etf' ? isETF : !isETF;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-white">החזקות</h2>
          <span className="text-sm text-white/60">({holdings.length})</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={refreshPrices}
            isLoading={isRefreshing}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            עדכון מחירים
          </Button>
          <Button
            size="sm"
            onClick={onAddHolding}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            הוסף החזקה
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {(['all', 'stocks', 'etf'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`tab-button ${filter === f ? 'active' : ''}`}
          >
            {f === 'all' ? 'הכל' : f === 'stocks' ? 'מניות' : 'קרנות סל'}
          </button>
        ))}
      </div>

      {/* Holdings Grid */}
      {filteredHoldings.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            אין החזקות להצגה
          </p>
          <Button className="mt-4" onClick={onAddHolding}>
            הוסף החזקה ראשונה
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredHoldings.map((holding) => (
            <HoldingCard
              key={holding.id}
              holding={holding}
              onEdit={onEditHolding}
            />
          ))}
        </div>
      )}
    </div>
  );
}
