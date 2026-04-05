import { useState, useEffect } from 'react';
import { DatabaseSearch } from '@/components/DatabaseSearch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Database as DatabaseIcon } from 'lucide-react';

interface Medication {
  tradeNames?: string[];
  scientificName: string;
  indication: string;
  icdCodes?: string[];
  atcCode?: string;
  manufacturer?: string;
}

export default function Database() {
  const [medicationsData, setMedicationsData] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/data/main_data.json');
        if (!response.ok) {
          throw new Error('Failed to load medications data');
        }
        const data = await response.json();
        setMedicationsData(data);
        setError(null);
      } catch (err) {
        console.error('Error loading medications data:', err);
        setError('فشل في تحميل البيانات. حاول مرة أخرى.');
        setMedicationsData([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

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
                <p className="text-sm text-slate-700">
                  إجمالي الأدوية: <span className="font-semibold">{medicationsData.length.toLocaleString()}</span>
                </p>
              </CardContent>
            </Card>

            {/* Search Component */}
            <DatabaseSearch data={medicationsData} />
          </div>
        )}
      </div>
    </div>
  );
}
