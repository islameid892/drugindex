import { useState, useEffect } from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export function NotificationSettings() {
  const { isSupported, isSubscribed, isLoading, subscribe, unsubscribe } = usePushNotifications();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    // Clear messages after 5 seconds
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  if (!isSupported) {
    return (
      <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
        <p className="text-sm text-slate-600">
          Push notifications are not supported on this device or browser.
        </p>
      </div>
    );
  }

  const handleSubscribe = async () => {
    try {
      setError(null);
      setSuccess(null);
      await subscribe();
      setSuccess('تم تفعيل الإشعارات بنجاح');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to subscribe to notifications';
      setError(message);
    }
  };

  const handleUnsubscribe = async () => {
    try {
      setError(null);
      setSuccess(null);
      await unsubscribe();
      setSuccess('تم إلغاء الإشعارات بنجاح');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to unsubscribe from notifications';
      setError(message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="p-4 bg-gradient-to-br from-sky-50 to-blue-50 rounded-lg border border-sky-200">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center flex-shrink-0 mt-1">
              <Bell className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">إشعارات الرسائل</h3>
              <p className="text-sm text-slate-600 mt-1">
                {isSubscribed
                  ? 'أنت مشترك في الإشعارات. ستتلقى تحديثات مهمة على جهازك.'
                  : 'فعّل الإشعارات لتلقي التحديثات والرسائل المهمة.'}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          {!isSubscribed ? (
            <Button
              onClick={handleSubscribe}
              disabled={isLoading}
              className="gap-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جاري التفعيل...
                </>
              ) : (
                <>
                  <Bell className="h-4 w-4" />
                  تفعيل الإشعارات
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleUnsubscribe}
              disabled={isLoading}
              variant="outline"
              className="gap-2 border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جاري الإلغاء...
                </>
              ) : (
                <>
                  <BellOff className="h-4 w-4" />
                  إلغاء الإشعارات
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-white text-xs font-bold">!</span>
          </div>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-2">
          <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-white text-xs font-bold">✓</span>
          </div>
          <p className="text-sm text-emerald-700">{success}</p>
        </div>
      )}
    </div>
  );
}
