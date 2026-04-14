import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { getLoginUrl } from "./const";
import "./index.css";

// Initialize analytics
const initializeAnalytics = () => {
  const endpoint = import.meta.env.VITE_ANALYTICS_ENDPOINT;
  const websiteId = import.meta.env.VITE_ANALYTICS_WEBSITE_ID;
  
  if (!endpoint || !websiteId) {
    console.warn('[Analytics] Missing configuration');
    return;
  }

  // Track page views
  const trackPageView = () => {
    fetch(`${endpoint}/api/v1/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        website_id: websiteId,
        hostname: window.location.hostname,
        screen: `${window.innerWidth}x${window.innerHeight}`,
        language: navigator.language,
        referrer: document.referrer,
        url: window.location.pathname,
      }),
    }).catch(err => console.debug('[Analytics] Send failed:', err));
  };

  // Track initial page view
  trackPageView();

  // Track page changes (for SPA)
  let lastPath = window.location.pathname;
  const observer = new MutationObserver(() => {
    if (window.location.pathname !== lastPath) {
      lastPath = window.location.pathname;
      trackPageView();
    }
  });
  
  observer.observe(document.body, { subtree: true, childList: true });
};

initializeAnalytics();

// Optimized QueryClient configuration for better performance and stability
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
      retry: (failureCount, error: any) => {
        // Don't retry on 401 (unauthorized) - let it redirect
        if (error?.status === 401) return false;
        // Don't retry on 403 (forbidden)
        if (error?.status === 403) return false;
        // Retry up to 3 times for other errors (network, 5xx, etc)
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => {
        // Exponential backoff: 1s, 2s, 4s
        return Math.min(1000 * 2 ** attemptIndex, 30000);
      },
      refetchOnWindowFocus: false,
      refetchOnReconnect: true, // Refetch when connection restored
      refetchOnMount: false, // Don't auto-refetch on mount to reduce requests
    },
    mutations: {
      retry: (failureCount, error: any) => {
        // Don't retry on 401 (unauthorized)
        if (error?.status === 401) return false;
        // Don't retry on 403 (forbidden)
        if (error?.status === 403) return false;
        // Retry up to 2 times for other errors
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => {
        return Math.min(1000 * 2 ** attemptIndex, 30000);
      },
    },
  },
});

// Track logout attempts to prevent spam
let lastLogoutAttempt = 0;
const LOGOUT_COOLDOWN = 5000; // 5 seconds between logout attempts

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  // Prevent logout spam
  const now = Date.now();
  if (now - lastLogoutAttempt < LOGOUT_COOLDOWN) {
    console.warn('[Auth] Logout attempt blocked (cooldown active)');
    return;
  }

  lastLogoutAttempt = now;
  console.warn('[Auth] Redirecting to login due to unauthorized error');
  window.location.href = getLoginUrl();
};

// Monitor network connectivity (after analytics init)
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[Network] Connection restored');
    // Only refetch queries that are not stale
    queryClient.refetchQueries({ type: 'active' });
  });
  window.addEventListener('offline', () => {
    console.log('[Network] Connection lost');
  });
}

// Error handling with improved logic
const handleQueryError = (error: any) => {
  // Only redirect on actual unauthorized errors (401)
  // Ignore other errors like network timeouts, CORS, etc.
  if (error?.status === 401 || error?.message === UNAUTHED_ERR_MSG) {
    redirectToLoginIfUnauthorized(error);
  } else if (error?.status >= 500) {
    // Server errors - log but don't logout
    console.error('[API] Server error:', error);
  } else if (error?.status >= 400) {
    // Client errors - log but don't logout
    console.warn('[API] Client error:', error?.status, error?.message);
  }
};

if (process.env.NODE_ENV !== 'production') {
  queryClient.getQueryCache().subscribe(event => {
    if (event.type === "updated" && event.action.type === "error") {
      const error = event.query.state.error;
      handleQueryError(error);
    }
  });

  queryClient.getMutationCache().subscribe(event => {
    if (event.type === "updated" && event.action.type === "error") {
      const error = event.mutation.state.error;
      handleQueryError(error);
    }
  });
} else {
  // Production: Only handle actual unauthorized errors
  queryClient.getQueryCache().subscribe(event => {
    if (event.type === "updated" && event.action.type === "error") {
      const error = event.query.state.error;
      handleQueryError(error);
    }
  });

  queryClient.getMutationCache().subscribe(event => {
    if (event.type === "updated" && event.action.type === "error") {
      const error = event.mutation.state.error;
      handleQueryError(error);
    }
  });
}

// Optimized tRPC client with batching and caching
const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      maxURLLength: 2083, // Support IE 11
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

// Expose analytics tracking function globally for events
if (typeof window !== 'undefined') {
  (window as any).trackEvent = (eventName: string, data?: Record<string, unknown>) => {
    const endpoint = import.meta.env.VITE_ANALYTICS_ENDPOINT;
    const websiteId = import.meta.env.VITE_ANALYTICS_WEBSITE_ID;
    if (endpoint && websiteId) {
      fetch(`${endpoint}/api/v1/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          website_id: websiteId,
          hostname: window.location.hostname,
          url: window.location.pathname,
          event_name: eventName,
          event_data: data,
        }),
      }).catch(() => {});
    }
  };
}

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
