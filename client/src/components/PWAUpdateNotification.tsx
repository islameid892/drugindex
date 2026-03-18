import { useEffect, useState } from 'react';
import { usePWAUpdate } from '@/hooks/usePWAUpdate';
import { Button } from '@/components/ui/button';
import { AlertCircle, Download, X, Loader2 } from 'lucide-react';

export function PWAUpdateNotification() {
  const { isUpdateAvailable, updateApp } = usePWAUpdate();
  const [showNotification, setShowNotification] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateProgress, setUpdateProgress] = useState(0);

  useEffect(() => {
    if (isUpdateAvailable) {
      setShowNotification(true);
    }
  }, [isUpdateAvailable]);

  const handleUpdate = async () => {
    setIsUpdating(true);
    
    // Simulate progress
    const progressInterval = setInterval(() => {
      setUpdateProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + Math.random() * 30;
      });
    }, 300);

    // Call the actual update function
    updateApp();

    // Clean up interval
    return () => clearInterval(progressInterval);
  };

  if (!showNotification) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg shadow-lg p-4 flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {isUpdating ? (
            <Loader2 className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-spin" />
          ) : (
            <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100">
            {isUpdating ? 'Updating App...' : 'Update Available'}
          </h3>
          <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
            {isUpdating 
              ? 'Installing the latest version. Please wait...'
              : 'A new version of the app is ready. Update now to get the latest features and improvements.'
            }
          </p>

          {/* Progress bar */}
          {isUpdating && (
            <div className="mt-3 w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-blue-600 dark:bg-blue-400 h-full transition-all duration-300 ease-out"
                style={{ width: `${updateProgress}%` }}
              />
            </div>
          )}
          
          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              onClick={handleUpdate}
              disabled={isUpdating}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white dark:bg-blue-600 dark:hover:bg-blue-700"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-1" />
                  Update Now
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowNotification(false)}
              disabled={isUpdating}
              className="border-blue-300 text-blue-700 hover:bg-blue-100 disabled:opacity-60 disabled:cursor-not-allowed dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-900"
            >
              {isUpdating ? 'Wait...' : 'Later'}
            </Button>
          </div>
        </div>
        
        <button
          onClick={() => !isUpdating && setShowNotification(false)}
          disabled={isUpdating}
          className="flex-shrink-0 text-blue-400 hover:text-blue-600 disabled:opacity-60 disabled:cursor-not-allowed dark:hover:text-blue-300"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
