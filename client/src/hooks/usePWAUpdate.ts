import { useEffect, useState, useCallback } from 'react';

interface UpdateState {
  isUpdateAvailable: boolean;
  isWaiting: boolean;
  isOffline: boolean;
  updateProgress: number;
  hasNewVersion: boolean;
}

interface ServiceWorkerMessage {
  type: string;
  version?: {
    version: number;
    timestamp: string;
  };
  manifest?: any;
}

/**
 * Hook to detect and handle PWA updates
 * Automatically checks for updates every 30 seconds
 * Shows notification when new version is available
 */
export function usePWAUpdate() {
  const [updateState, setUpdateState] = useState<UpdateState>({
    isUpdateAvailable: false,
    isWaiting: false,
    isOffline: false,
    updateProgress: 0,
    hasNewVersion: false,
  });

  const [currentVersion, setCurrentVersion] = useState<{
    version: number;
    timestamp: string;
  } | null>(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      console.warn('[PWA] Service Worker not supported');
      return;
    }

    let registration: ServiceWorkerRegistration | null = null;
    let updateCheckInterval: NodeJS.Timeout | null = null;

    const checkForUpdates = async () => {
      try {
        // Register service worker if not already registered
        if (!registration) {
          registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/',
            updateViaCache: 'none', // Always fetch fresh sw.js
          });
          console.log('[PWA] Service Worker registered successfully');
        }

        // Check for updates
        await registration.update();
        console.log('[PWA] Checked for updates');
      } catch (error) {
        console.error('[PWA] Error checking for updates:', error);
      }
    };

    const onControllerChange = () => {
      console.log('[PWA] New service worker activated');
      setUpdateState(prev => ({
        ...prev,
        isUpdateAvailable: true,
        isWaiting: true,
        hasNewVersion: true,
      }));
      
      // Auto-reload after 2 seconds to show new version
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    };

    const onServiceWorkerMessage = (event: any) => {
      const message = event.data as ServiceWorkerMessage;
      
      console.log('[PWA] Message from Service Worker:', message.type);

      if (message.type === 'UPDATE_AVAILABLE') {
        console.log('[PWA] Update available from Service Worker');
        setUpdateState(prev => ({
          ...prev,
          isUpdateAvailable: true,
          hasNewVersion: true,
        }));
      }

      if (message.type === 'VERSION') {
        console.log('[PWA] Current version:', message.version);
        setCurrentVersion(message.version || null);
      }
    };

    const handleOnline = () => {
      console.log('[PWA] Connection restored');
      setUpdateState(prev => ({
        ...prev,
        isOffline: false,
      }));
      // Check for updates when connection restored
      checkForUpdates();
    };

    const handleOffline = () => {
      console.log('[PWA] Connection lost');
      setUpdateState(prev => ({
        ...prev,
        isOffline: true,
      }));
    };

    const initializePWA = async () => {
      try {
        // Get current registration
        registration = (await navigator.serviceWorker.getRegistration()) || null;

        if (!registration) {
          // Register service worker
          registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/',
            updateViaCache: 'none',
          });
          console.log('[PWA] Service Worker registered');
        }

        // Listen for new service worker
        registration.addEventListener('updatefound', () => {
          const newWorker = registration!.installing;

          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker is ready
              console.log('[PWA] New service worker installed and ready');
              setUpdateState(prev => ({
                ...prev,
                isUpdateAvailable: true,
              }));
            }
          });
        });

        // Listen for controller change
        navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener('message', onServiceWorkerMessage);

        // Check for updates immediately
        await checkForUpdates();

        // Check for updates every 30 seconds
        updateCheckInterval = setInterval(() => {
          checkForUpdates();
        }, 30000);

        // Listen for online/offline events
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Check initial online status
        if (!navigator.onLine) {
          setUpdateState(prev => ({
            ...prev,
            isOffline: true,
          }));
        }

        // Request version from service worker
        if (navigator.serviceWorker.controller) {
          const channel = new MessageChannel();
          navigator.serviceWorker.controller.postMessage(
            { type: 'GET_VERSION' },
            [channel.port2]
          );
          channel.port1.onmessage = (event) => {
            if (event.data.type === 'VERSION') {
              setCurrentVersion(event.data.version);
            }
          };
        }
      } catch (error) {
        console.error('[PWA] Error initializing PWA:', error);
      }
    };

    initializePWA();

    // Cleanup
    return () => {
      if (updateCheckInterval) {
        clearInterval(updateCheckInterval);
      }
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (navigator.serviceWorker) {
        navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
        navigator.serviceWorker.removeEventListener('message', onServiceWorkerMessage);
      }
    };
  }, []);

  const updateApp = useCallback(() => {
    console.log('[PWA] User triggered update');
    
    if (!navigator.serviceWorker.controller) {
      // No service worker, just reload
      console.log('[PWA] No service worker controller, reloading');
      window.location.reload();
      return;
    }

    // Skip waiting and claim clients to activate new service worker
    navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });

    // Show progress
    setUpdateState(prev => ({
      ...prev,
      updateProgress: 100,
    }));

    // Reload after a short delay to let the new service worker activate
    setTimeout(() => {
      console.log('[PWA] Reloading page with new version');
      window.location.reload();
    }, 500);
  }, []);

  const clearCache = useCallback(() => {
    console.log('[PWA] Clearing cache');
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' });
    }
    // Also clear browser cache
    if ('caches' in window) {
      caches.keys().then(cacheNames => {
        Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      });
    }
  }, []);

  return {
    ...updateState,
    updateApp,
    clearCache,
    currentVersion,
  };
}
