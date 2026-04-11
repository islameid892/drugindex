import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Copy, Check, AlertTriangle } from "lucide-react";

export default function DuplicateFinder() {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const { data, isLoading, error, refetch } = trpc.dbUtils.findDuplicates.useQuery();

  const handleCopyIds = (ids: string) => {
    navigator.clipboard.writeText(ids);
    setCopiedId(ids);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
            🔍 Duplicate Finder
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            البحث عن الصفوف المزدوجة (Case-Insensitive)
          </p>
        </div>

        {/* Action Button */}
        <div className="mb-8">
          <Button
            onClick={() => refetch()}
            disabled={isLoading}
            className="bg-sky-600 hover:bg-sky-700 text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                جاري البحث...
              </>
            ) : (
              "🔄 ابدأ البحث"
            )}
          </Button>
        </div>

        {/* Error State */}
        {error && (
          <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 p-6 mb-8">
            <div className="flex gap-4">
              <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-red-900 dark:text-red-200">خطأ</h3>
                <p className="text-red-700 dark:text-red-300">{error.message}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
          </div>
        )}

        {/* Results */}
        {data && !isLoading && (
          <div className="space-y-8">
            {/* Drug Entries Duplicates */}
            {data.drugDuplicates && data.drugDuplicates.length > 0 && (
              <Card className="p-6 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                  💊 Drug Entries ({data.drugDuplicates.length})
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                          Count
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                          IDs
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                          Scientific Names
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                          Trade Names
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                          Indications
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.drugDuplicates.map((dup: any, idx: number) => (
                        <tr
                          key={idx}
                          className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                        >
                          <td className="py-3 px-4">
                            <span className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-3 py-1 rounded-full font-bold">
                              {dup.count}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-xs text-slate-600 dark:text-slate-400">
                            {dup.ids}
                          </td>
                          <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                            {dup.sci_names}
                          </td>
                          <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                            {dup.trade_names}
                          </td>
                          <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                            {dup.indications}
                          </td>
                          <td className="py-3 px-4">
                            <button
                              onClick={() => handleCopyIds(dup.ids)}
                              className="p-2 hover:bg-slate-200 dark:hover:bg-slate-600 rounded transition-colors"
                            >
                              {copiedId === dup.ids ? (
                                <Check className="w-4 h-4 text-green-600" />
                              ) : (
                                <Copy className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                              )}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* ICD Codes Duplicates */}
            {data.codeDuplicates && data.codeDuplicates.length > 0 && (
              <Card className="p-6 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                  📋 ICD Codes ({data.codeDuplicates.length})
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                          Count
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                          IDs
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                          Codes
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.codeDuplicates.map((dup: any, idx: number) => (
                        <tr
                          key={idx}
                          className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                        >
                          <td className="py-3 px-4">
                            <span className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-3 py-1 rounded-full font-bold">
                              {dup.count}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-xs text-slate-600 dark:text-slate-400">
                            {dup.ids}
                          </td>
                          <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                            {dup.codes}
                          </td>
                          <td className="py-3 px-4">
                            <button
                              onClick={() => handleCopyIds(dup.ids)}
                              className="p-2 hover:bg-slate-200 dark:hover:bg-slate-600 rounded transition-colors"
                            >
                              {copiedId === dup.ids ? (
                                <Check className="w-4 h-4 text-green-600" />
                              ) : (
                                <Copy className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                              )}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* ICD Branches Duplicates */}
            {data.branchDuplicates && data.branchDuplicates.length > 0 && (
              <Card className="p-6 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                  🌳 ICD Branches ({data.branchDuplicates.length})
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                          Count
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                          IDs
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                          Codes
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.branchDuplicates.map((dup: any, idx: number) => (
                        <tr
                          key={idx}
                          className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                        >
                          <td className="py-3 px-4">
                            <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-3 py-1 rounded-full font-bold">
                              {dup.count}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-xs text-slate-600 dark:text-slate-400">
                            {dup.ids}
                          </td>
                          <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                            {dup.codes}
                          </td>
                          <td className="py-3 px-4">
                            <button
                              onClick={() => handleCopyIds(dup.ids)}
                              className="p-2 hover:bg-slate-200 dark:hover:bg-slate-600 rounded transition-colors"
                            >
                              {copiedId === dup.ids ? (
                                <Check className="w-4 h-4 text-green-600" />
                              ) : (
                                <Copy className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                              )}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* No Duplicates Found */}
            {(!data.drugDuplicates || data.drugDuplicates.length === 0) &&
              (!data.codeDuplicates || data.codeDuplicates.length === 0) &&
              (!data.branchDuplicates || data.branchDuplicates.length === 0) && (
                <Card className="p-8 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-center">
                  <p className="text-lg text-green-700 dark:text-green-300 font-semibold">
                    ✅ لا توجد صفوف مزدوجة!
                  </p>
                </Card>
              )}
          </div>
        )}
      </div>
    </div>
  );
}
