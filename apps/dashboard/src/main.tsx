import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';

// One QueryClient for the whole app's
// It owns the cache all useQuery/useMutation
// calls anywhere in the component tree
const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        {/* Mounted once, same as QueryClientProvider/BrowserRouter, so now any component anywhere
            can call toast.success(...)/toast.error(...) */}
        <Toaster
          toastOptions={{
            style: {
              background: '#1f2937', // gray-800, matches the dashboard's colours
              color: '#f3f4f6', // gray-100
              border: '1px solid #374151', // gray-700
            },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
