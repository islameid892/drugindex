/**
 * Performance Optimization Utilities
 * Provides lazy loading, code splitting, and performance monitoring
 */

import React, { lazy, Suspense } from 'react';

/**
 * Lazy load a component with a fallback
 * Usage: const Component = lazyLoadComponent(() => import('./Component'));
 */
export const lazyLoadComponent = (importFunc: () => Promise<any>) => {
  return lazy(() => importFunc());
};

/**
 * Debounce function for search and input optimization
 * Prevents excessive API calls during user input
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Throttle function for scroll and resize events
 * Limits function execution frequency
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean = false;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

/**
 * Intersection Observer for lazy loading images and components
 * Loads elements only when they're visible in the viewport
 */
export const useIntersectionObserver = (
  callback: (entry: IntersectionObserverEntry) => void,
  options?: IntersectionObserverInit
) => {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        callback(entry);
      }
    }, {
      threshold: 0.1,
      ...options,
    });

    observer.observe(ref.current);

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [callback, options]);

  return ref;
};

/**
 * Preload images for better performance
 */
export const preloadImages = (urls: string[]) => {
  urls.forEach((url) => {
    const img = new Image();
    img.src = url;
  });
};

/**
 * Performance monitoring
 * Measures and logs Core Web Vitals
 */
export const measurePerformance = () => {
  if (typeof window !== 'undefined' && 'performance' in window) {
    const perfData = window.performance.timing;
    const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
    const connectTime = perfData.responseEnd - perfData.requestStart;
    const renderTime = perfData.domComplete - perfData.domLoading;

    console.log('Performance Metrics:', {
      pageLoadTime: `${pageLoadTime}ms`,
      connectTime: `${connectTime}ms`,
      renderTime: `${renderTime}ms`,
    });

    return {
      pageLoadTime,
      connectTime,
      renderTime,
    };
  }
};

/**
 * Request animation frame wrapper for smooth animations
 */
export const requestAnimationFrameThrottle = (callback: () => void) => {
  let rafId: number | null = null;

  return () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
    }
    rafId = requestAnimationFrame(callback);
  };
};

/**
 * Cache API responses to reduce network requests
 */
export const createCache = <T>(ttl: number = 60000) => {
  const cache = new Map<string, { data: T; timestamp: number }>();

  return {
    get: (key: string): T | null => {
      const item = cache.get(key);
      if (!item) return null;

      const isExpired = Date.now() - item.timestamp > ttl;
      if (isExpired) {
        cache.delete(key);
        return null;
      }

      return item.data;
    },
    set: (key: string, data: T) => {
      cache.set(key, { data, timestamp: Date.now() });
    },
    clear: () => cache.clear(),
  };
};

/**
 * Virtual scrolling for large lists
 * Only renders visible items to improve performance
 */
export const useVirtualScroll = (
  items: any[],
  itemHeight: number,
  containerHeight: number
) => {
  const [scrollTop, setScrollTop] = React.useState(0);

  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.ceil((scrollTop + containerHeight) / itemHeight);
  const visibleItems = items.slice(startIndex, endIndex);

  const offsetY = startIndex * itemHeight;

  return {
    visibleItems,
    offsetY,
    onScroll: (e: React.UIEvent<HTMLDivElement>) => {
      setScrollTop((e.target as HTMLDivElement).scrollTop);
    },
  };
};


