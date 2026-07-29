import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { AppRoutes } from "@/routes";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LanguageProvider } from "@/context/LanguageContext";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // The dataset is static, so re-fetching on every window focus is pure
      // noise. One retry covers a transient blip without stalling the UI.
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 60_000,
    },
  },
});

export default function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </QueryClientProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}
