import { useEffect, useState } from 'react';

interface UpdateState {
  isUpdateAvailable: boolean;
  isWaiting: boolean;
  isOffline: boolean;
}

export function usePWAUpdate() {
  const [updateState, setUpdateState] = useState<UpdateState>({
    isUpdateAvailable: false,
    isWaiting: false,
    isOffline: false,
  });

  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    let registration: ServiceWorkerRegistration | null = null;

    const checkForUpdates = async () => {
      try {
        registration = (await navigator.serviceWorker.getRegistration()) || null;
        
        if (!registration) {
          return;
        }

        // Check for updates every 30 seconds
        const interval = setInterval(async () => {
          try {
            await registration?.update();
          } catch (error) {
            console.error('Error checking for updates:', error);
          }
        }, 30000);

        // Listen for controller change (new service worker activated)
        const onControllerChange = () => {
          setUpdateState(prev => ({
            ...prev,
            isUpdateAvailable: true,
            isWaiting: true,
          }));
        };

        navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

        // Listen for service worker updates
        registration!.addEventListener('updatefound', () => {
          const newWorker = registration!.installing;
          
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker is ready to activate
              setUpdateState(prev => ({
                ...prev,
                isUpdateAvailable: true,
              }));
            }
          });
        });

        // Check online/offline status
        const handleOnline = () => {
          setUpdateState(prev => ({
            ...prev,
            isOffline: false,
          }));
        };

        const handleOffline = () => {
          setUpdateState(prev => ({
            ...prev,
            isOffline: true,
          }));
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
          clearInterval(interval);
          window.removeEventListener('online', handleOnline);
          window.removeEventListener('offline', handleOffline);
          navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
        };
      } catch (error) {
        console.error('Error setting up PWA update detection:', error);
      }
    };

    checkForUpdates();
  }, []);

  const updateApp = () => {
    if (!navigator.serviceWorker.controller) {
      // No service worker, just reload
      window.location.reload();
      return;
    }

    // Skip waiting and claim clients to activate new service worker
    navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
    
    // Reload after a short delay to let the new service worker activate
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  return {
    ...updateState,
    updateApp,
  };
}
