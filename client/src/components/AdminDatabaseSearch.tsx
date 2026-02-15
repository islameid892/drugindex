import { useState, useMemo, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Download, X } from 'lucide-react';
import * as XLSX from 'xlsx';

interface Medication {
  id: number;
  tradeName: string;
  scientificName: string;
  indication: string;
  icdCodes: string[];
  atcCode: string;
  manufacturer: string;
  category?: string;
}

interface AdminDatabaseSearchProps {
  data: Medication[];
}

export function AdminDatabaseSearch({ data }: AdminDatabaseSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchField, setSearchField] = useState<'all' | 'tradeName' | 'scientificName' | 'indication'>('all');
  const [sortField, setSortField] = useState<'tradeName' | 'scientificName' | 'indication'>('tradeName');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, searchField]);

  const filteredData = useMemo(() => {
    let result = data;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((med) => {
        if (searchField === 'all') {
          return (
            (med.tradeName || '').toLowerCase().includes(query) ||
            (med.scientificName || '').toLowerCase().includes(query) ||
            (med.indication || '').toLowerCase().includes(query) ||
            (med.atcCode || '').toLowerCase().includes(query)
          );
        } else if (searchField === 'tradeName') {
          return (med.tradeName || '').toLowerCase().includes(query);
        } else if (searchField === 'scientificName') {
          return (med.scientificName || '').toLowerCase().includes(query);
        } else if (searchField === 'indication') {
          return (med.indication || '').toLowerCase().includes(query);
        }
        return true;
      });
    }

    result.sort((a, b) => {
      let aValue = '';
      let bValue = '';

      if (sortField === 'tradeName') {
        aValue = a.tradeName || '';
        bValue = b.tradeName || '';
      } else if (sortField === 'scientificName') {
        aValue = a.scientificName || '';
        bValue = b.scientificName || '';
      } else if (sortField === 'indication') {
        aValue = a.indication || '';
        bValue = b.indication || '';
      }

      if (sortOrder === 'asc') {
        return (aValue || '').localeCompare(bValue || '');
      } else {
        return (bValue || '').localeCompare(aValue || '');
      }
    });

    return result;
  }, [data, searchQuery, searchField, sortField, sortOrder]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredData.slice(startIndex, endIndex);
  }, [filteredData, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const handleExportToExcel = () => {
    const exportData = filteredData.map((med) => ({
      'Trade Name': med.tradeName,
      'Scientific Name': med.scientificName,
      'Indication': med.indication,
      'ICD-10 Codes': med.icdCodes.join(', '),
      'ATC Code': med.atcCode,
      'Manufacturer': med.manufacturer,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Medications');

    worksheet['!cols'] = [
      { wch: 25 },
      { wch: 30 },
      { wch: 25 },
      { wch: 30 },
      { wch: 12 },
      { wch: 20 },
    ];

    XLSX.writeFile(workbook, `medications_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                placeholder="ابحث عن دواء..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            {searchQuery && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">
                ابحث في
              </label>
              <Select value={searchField} onValueChange={(value: any) => setSearchField(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="tradeName">اسم تجاري</SelectItem>
                  <SelectItem value="scientificName">مادة فعالة</SelectItem>
                  <SelectItem value="indication">الاستخدام</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">
                ترتيب حسب
              </label>
              <Select value={sortField} onValueChange={(value: any) => setSortField(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tradeName">اسم تجاري</SelectItem>
                  <SelectItem value="scientificName">مادة فعالة</SelectItem>
                  <SelectItem value="indication">الاستخدام</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">
                الترتيب
              </label>
              <Select value={sortOrder} onValueChange={(value: any) => setSortOrder(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">تصاعدي (A-Z)</SelectItem>
                  <SelectItem value="desc">تنازلي (Z-A)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">
                عدد الصفوف
              </label>
              <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="text-sm text-slate-600">
              عرض <span className="font-semibold">{paginatedData.length}</span> من{' '}
              <span className="font-semibold">{filteredData.length}</span> النتائج
              {searchQuery && (
                <span className="ml-2 text-slate-500">
                  (من أصل {data.length} دواء)
                </span>
              )}
            </div>
            <Button
              onClick={handleExportToExcel}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              تصدير Excel
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        {filteredData.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            لم يتم العثور على نتائج. حاول البحث بكلمات مختلفة.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="font-semibold">اسم تجاري</TableHead>
                    <TableHead className="font-semibold">مادة فعالة</TableHead>
                    <TableHead className="font-semibold">الاستخدام</TableHead>
                    <TableHead className="font-semibold">أكواد ICD-10</TableHead>
                    <TableHead className="font-semibold">رمز ATC</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.map((med, idx) => (
                    <TableRow key={med.id ? `med-${med.id}` : `med-${idx}`} className="hover:bg-slate-50">
                      <TableCell className="font-medium text-slate-900">
                        {med.tradeName}
                      </TableCell>
                      <TableCell className="text-slate-700">
                        {med.scientificName}
                      </TableCell>
                      <TableCell className="text-slate-600 text-sm">
                        {med.indication}
                      </TableCell>
                      <TableCell className="text-slate-600 text-sm">
                        <div className="flex flex-wrap gap-1">
                          {med.icdCodes && med.icdCodes.length > 0 ? (
                            <>
                              {med.icdCodes.slice(0, 3).map((code, idx) => (
                                <span
                                  key={`icd-${med.id}-${idx}`}
                                  className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium"
                                >
                                  {code}
                                </span>
                              ))}
                              {med.icdCodes.length > 3 && (
                                <span
                                  key={`icd-more-${med.id}`}
                                  className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-medium"
                                >
                                  +{med.icdCodes.length - 3}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-slate-400 text-xs">لا توجد أكواد</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-600 text-sm">
                        {med.atcCode || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
                <div className="text-sm text-slate-600">
                  الصفحة <span className="font-semibold">{currentPage}</span> من{' '}
                  <span className="font-semibold">{totalPages}</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    السابق
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    التالي
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
