import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReactNode } from "react";

interface AuthGuardProps {
  children: ReactNode;
  message?: string;
}

export function AuthGuard({ children, message }: AuthGuardProps) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-sky-600 mx-auto" />
          <p className="text-slate-500 text-sm">جاري التحقق من الهوية...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <div className="text-center space-y-6 max-w-md mx-auto px-6">
          <div className="w-20 h-20 rounded-full bg-sky-100 flex items-center justify-center mx-auto">
            <Lock className="h-10 w-10 text-sky-600" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-900">تسجيل الدخول مطلوب</h2>
            <p className="text-slate-500 text-sm leading-relaxed">
              {message || "هذه الصفحة متاحة للمستخدمين المسجلين فقط. يرجى تسجيل الدخول للوصول إليها."}
            </p>
          </div>
          <Button
            onClick={() => window.location.href = getLoginUrl()}
            className="bg-sky-600 hover:bg-sky-700 text-white px-8 py-3 rounded-xl font-semibold w-full"
          >
            تسجيل الدخول
          </Button>
          <p className="text-xs text-slate-400">
            سيتم توجيهك إلى صفحة تسجيل الدخول الآمنة
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
