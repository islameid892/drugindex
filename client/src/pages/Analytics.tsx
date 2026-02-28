import { AnalyticsDashboard } from "@/components/AnalyticsDashboard";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function Analytics() {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-lg font-medium">يرجى تسجيل الدخول للوصول إلى لوحة التحليلات</p>
        <a href={getLoginUrl()}>
          <Button>تسجيل الدخول</Button>
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <button
          onClick={() => setLocation("/")}
          className="flex items-center gap-2 text-sky-600 hover:text-sky-700 mb-6 font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          العودة إلى الرئيسية
        </button>
        <AnalyticsDashboard />
      </div>
    </div>
  );
}
