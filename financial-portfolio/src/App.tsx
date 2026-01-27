import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { Overview } from '@/pages/Overview';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

// Placeholder pages - to be implemented
function ChartsPage() {
  return (
    <div className="glass-card p-8 text-center">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
        גרפים וניתוחים
      </h1>
      <p className="text-gray-500">בקרוב...</p>
    </div>
  );
}

function HoldingsPage() {
  return (
    <div className="glass-card p-8 text-center">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
        ניהול החזקות
      </h1>
      <p className="text-gray-500">בקרוב...</p>
    </div>
  );
}

function BondsPage() {
  return (
    <div className="glass-card p-8 text-center">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
        ניהול אג"ח
      </h1>
      <p className="text-gray-500">בקרוב...</p>
    </div>
  );
}

function CashFlowPage() {
  return (
    <div className="glass-card p-8 text-center">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
        ניהול תזרים
      </h1>
      <p className="text-gray-500">בקרוב...</p>
    </div>
  );
}

function HistoryPage() {
  return (
    <div className="glass-card p-8 text-center">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
        היסטוריית עסקאות
      </h1>
      <p className="text-gray-500">בקרוב...</p>
    </div>
  );
}

function CalculatorPage() {
  return (
    <div className="glass-card p-8 text-center">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
        מחשבון הקצאה
      </h1>
      <p className="text-gray-500">בקרוב...</p>
    </div>
  );
}

function GroupsPage() {
  return (
    <div className="glass-card p-8 text-center">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
        ניהול קבוצות
      </h1>
      <p className="text-gray-500">בקרוב...</p>
    </div>
  );
}

function SettingsPage() {
  return (
    <div className="glass-card p-8 text-center">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
        הגדרות
      </h1>
      <p className="text-gray-500">בקרוב...</p>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/charts" element={<ChartsPage />} />
            <Route path="/holdings" element={<HoldingsPage />} />
            <Route path="/bonds" element={<BondsPage />} />
            <Route path="/cash-flow" element={<CashFlowPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/calculator" element={<CalculatorPage />} />
            <Route path="/groups" element={<GroupsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
