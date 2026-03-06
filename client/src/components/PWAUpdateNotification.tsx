import { useEffect, useState } from 'react';
import { usePWAUpdate } from '@/hooks/usePWAUpdate';
import { Button } from '@/components/ui/button';
import { AlertCircle, Download, X } from 'lucide-react';

export function PWAUpdateNotification() {
  const { isUpdateAvailable, updateApp } = usePWAUpdate();
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    if (isUpdateAvailable) {
      setShowNotification(true);
    }
  }, [isUpdateAvailable]);

  if (!showNotification) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg shadow-lg p-4 flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100">
            Update Available
          </h3>
          <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
            A new version of the app is ready. Update now to get the latest features and improvements.
          </p>
          
          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              onClick={() => {
                updateApp();
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:hover:bg-blue-700"
            >
              <Download className="h-4 w-4 mr-1" />
              Update Now
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowNotification(false)}
              className="border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-900"
            >
              Later
            </Button>
          </div>
        </div>
        
        <button
          onClick={() => setShowNotification(false)}
          className="flex-shrink-0 text-blue-400 hover:text-blue-600 dark:hover:text-blue-300"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
