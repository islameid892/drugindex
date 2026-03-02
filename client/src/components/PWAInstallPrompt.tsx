import { useEffect, useState } from 'react';
import { X, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Don't show again for 7 days
    localStorage.setItem('pwa-install-dismissed', new Date().getTime().toString());
  };

  if (isInstalled || !showPrompt || !deferredPrompt) {
    return null;
  }

  // Check if user dismissed recently
  const dismissed = localStorage.getItem('pwa-install-dismissed');
  if (dismissed) {
    const dismissedTime = parseInt(dismissed, 10);
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    if (new Date().getTime() - dismissedTime < sevenDaysMs) {
      return null;
    }
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6">
      <div className="max-w-md mx-auto bg-gradient-to-r from-sky-500 to-blue-600 rounded-2xl shadow-2xl p-4 sm:p-6 text-white animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <Download className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base">Install App</h3>
              <p className="text-xs sm:text-sm text-white/90">Quick access on your home screen</p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleInstall}
            className="flex-1 bg-white text-sky-600 hover:bg-gray-100 font-semibold text-sm"
          >
            Install
          </Button>
          <Button
            onClick={handleDismiss}
            variant="outline"
            className="flex-1 border-white/30 text-white hover:bg-white/10 text-sm"
          >
            Later
          </Button>
        </div>
      </div>
    </div>
  );
}
