import { DatabaseSearch } from '@/components/DatabaseSearch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Database as DatabaseIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useState } from 'react';

const PAGE_SIZE = 50;

export default function Database() {
  const [offset, setOffset] = useState(0);

  const { data: medicationsData = [], isLoading: loading, error: apiError } = trpc.data.medications.getAll.useQuery(
    { limit: PAGE_SIZE, offset },
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 2,
    }
  );

  const { data: statsData } = trpc.data.stats.useQuery(undefined, { staleTime: 60 * 60 * 1000 });
  const totalCount = (statsData as any)?.totalMedications ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  const error = apiError ? 'فشل في تحميل البيانات. حاول مرة أخرى.' : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white shadow-sm sticky top-0 z-40">
        <div className="container py-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-3 rounded-lg shadow-lg">
              <DatabaseIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">قاعدة البيانات</h1>
              <p className="text-slate-600">بحث متقدم عن الأدوية والأكواس الطبية</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container py-8">
        {loading ? (
          <Card>
            <CardContent className="pt-12 pb-12 flex flex-col items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
              <p className="text-slate-600">جاري تحميل البيانات...</p>
            </CardContent>
          </Card>
        ) : error ? (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <p className="text-red-700">{error}</p>
            </CardContent>
          </Card>
        ) : medicationsData.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-slate-600">لم يتم العثور على بيانات.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Info Card */}
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <DatabaseIcon className="h-5 w-5 text-blue-600" />
                  معلومات قاعدة البيانات
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-700">
                    عرض <span className="font-semibold">{offset + 1} - {Math.min(offset + PAGE_SIZE, totalCount || offset + medicationsData.length)}</span>
                    {totalCount > 0 && <> من <span className="font-semibold">{totalCount.toLocaleString()}</span></>}
                  </p>
                  {totalPages > 1 && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                        disabled={offset === 0}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <span className="text-sm text-slate-600">صفحة {currentPage}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setOffset(offset + PAGE_SIZE)}
                        disabled={medicationsData.length < PAGE_SIZE}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Search Component */}
            <DatabaseSearch data={medicationsData} />

            {/* Bottom Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                  disabled={offset === 0}
                >
                  <ChevronRight className="h-4 w-4 ml-1" />
                  السابق
                </Button>
                <span className="text-sm text-slate-600 px-4">صفحة {currentPage}</span>
                <Button
                  variant="outline"
                  onClick={() => setOffset(offset + PAGE_SIZE)}
                  disabled={medicationsData.length < PAGE_SIZE}
                >
                  التالي
                  <ChevronLeft className="h-4 w-4 mr-1" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
