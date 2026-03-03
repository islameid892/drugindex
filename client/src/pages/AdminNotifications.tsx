import { useState } from 'react';
import { Send, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { useLocation } from 'wouter';

export default function AdminNotifications() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const sendNotificationMutation = trpc.pushNotifications.sendBroadcast.useMutation();

  // Redirect if not admin
  if (!authLoading && user?.role !== 'admin') {
    navigate('/', { replace: true });
    return null;
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
      </div>
    );
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!title.trim()) {
      setError('الرجاء إدخال عنوان الإشعار');
      return;
    }

    if (!message.trim()) {
      setError('الرجاء إدخال محتوى الإشعار');
      return;
    }

    try {
      await sendNotificationMutation.mutateAsync({
        title: title.trim(),
        body: message.trim(),
        icon: '/icon-192.png',
        badge: '/icon-192.png'
      });

      setSuccess('تم إرسال الإشعار إلى جميع المستخدمين بنجاح');
      setTitle('');
      setMessage('');

      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'فشل إرسال الإشعار';
      setError(errorMessage);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-emerald-50 py-12">
      <div className="container max-w-2xl">
        <div className="space-y-8">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold text-slate-900">لوحة الإشعارات</h1>
            <p className="text-lg text-slate-600">إرسال إشعارات إلى جميع المستخدمين</p>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8">
            <form onSubmit={handleSend} className="space-y-6">
              {/* Title Input */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-900">
                  عنوان الإشعار
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: تحديث جديد متاح"
                  className="text-lg p-3 border-slate-200 focus:border-sky-500 focus:ring-sky-500"
                  maxLength={100}
                />
                <p className="text-xs text-slate-500">{title.length}/100</p>
              </div>

              {/* Message Input */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-900">
                  محتوى الإشعار
                </label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="أدخل محتوى الإشعار هنا..."
                  className="min-h-32 text-base p-3 border-slate-200 focus:border-sky-500 focus:ring-sky-500 resize-none"
                  maxLength={500}
                />
                <p className="text-xs text-slate-500">{message.length}/500</p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Success Message */}
              {success && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-emerald-700">{success}</p>
                </div>
              )}

              {/* Send Button */}
              <Button
                type="submit"
                disabled={sendNotificationMutation.isPending || !title.trim() || !message.trim()}
                className="w-full gap-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-semibold py-3 text-base"
              >
                {sendNotificationMutation.isPending ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    جاري الإرسال...
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5" />
                    إرسال الإشعار
                  </>
                )}
              </Button>
            </form>
          </div>

          {/* Info Box */}
          <div className="bg-sky-50 border border-sky-200 rounded-lg p-6 space-y-3">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-sky-500 flex items-center justify-center text-white text-sm font-bold">ℹ</span>
              معلومات مهمة
            </h3>
            <ul className="space-y-2 text-sm text-slate-700">
              <li>• سيتم إرسال الإشعار إلى جميع المستخدمين المشتركين في الإشعارات</li>
              <li>• يمكن للمستخدمين إلغاء الاشتراك في أي وقت من إعدادات الجهاز</li>
              <li>• تأكد من أن الرسالة واضحة ومفيدة</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
