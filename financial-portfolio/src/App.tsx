import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { Overview } from '@/pages/Overview';
import { Holdings } from '@/pages/Holdings';
import { Charts } from '@/pages/Charts';
import { CashFlow } from '@/pages/CashFlow';
import { Bonds } from '@/pages/Bonds';
import { History } from '@/pages/History';
import { Calculator } from '@/pages/Calculator';
import { Groups } from '@/pages/Groups';
import { Settings } from '@/pages/Settings';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename="/tests">
        <Layout>
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/charts" element={<Charts />} />
            <Route path="/holdings" element={<Holdings />} />
            <Route path="/bonds" element={<Bonds />} />
            <Route path="/cash-flow" element={<CashFlow />} />
            <Route path="/history" element={<History />} />
            <Route path="/calculator" element={<Calculator />} />
            <Route path="/groups" element={<Groups />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
