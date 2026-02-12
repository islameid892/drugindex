// Web Worker for heavy data processing tasks

interface ProcessMessage {
  type: 'search' | 'filter' | 'aggregate';
  data: any[];
  query?: string;
  filters?: any;
}

self.onmessage = async (event: MessageEvent<ProcessMessage>) => {
  const { type, data, query, filters } = event.data;

  try {
    let result;

    switch (type) {
      case 'search':
        result = performSearch(data, query || '');
        break;
      case 'filter':
        result = performFilter(data, filters);
        break;
      case 'aggregate':
        result = performAggregation(data);
        break;
      default:
        throw new Error(`Unknown message type: ${type}`);
    }

    self.postMessage({ success: true, result });
  } catch (error) {
    self.postMessage({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

function performSearch(data: any[], query: string): any[] {
  const lowerQuery = query.toLowerCase();
  return data.filter(item => {
    return (
      (item.scientificName?.toLowerCase().includes(lowerQuery)) ||
      (item.tradeNames?.some((name: string) =>
        name.toLowerCase().includes(lowerQuery)
      )) ||
      (item.indication?.toLowerCase().includes(lowerQuery)) ||
      (item.icdCodes?.some((code: string) =>
        code.toLowerCase().includes(lowerQuery)
      )) ||
      (item.atcCodes?.some((code: string) =>
        code.toLowerCase().includes(lowerQuery)
      ))
    );
  });
}

function performFilter(data: any[], filters: any): any[] {
  let result = [...data];

  if (filters.coverage) {
    result = result.filter(item => {
      const isCovered = item.isCovered !== false;
      return filters.coverage === 'covered' ? isCovered : !isCovered;
    });
  }

  if (filters.indication) {
    result = result.filter(item =>
      item.indication?.toLowerCase().includes(filters.indication.toLowerCase())
    );
  }

  if (filters.atcCode) {
    result = result.filter(item =>
      item.atcCodes?.some((code: string) =>
        code.toLowerCase().includes(filters.atcCode.toLowerCase())
      )
    );
  }

  return result;
}

function performAggregation(data: any[]): any {
  const aggregation = {
    totalMedications: data.length,
    totalConditions: new Set(data.map(item => item.indication)).size,
    totalCodes: new Set(
      data.flatMap(item => item.icdCodes || [])
    ).size,
    coveredCount: data.filter(item => item.isCovered !== false).length,
    notCoveredCount: data.filter(item => item.isCovered === false).length,
    indicationCounts: {} as Record<string, number>,
    atcCodeCounts: {} as Record<string, number>,
  };

  // Count by indication
  data.forEach(item => {
    if (item.indication) {
      aggregation.indicationCounts[item.indication] =
        (aggregation.indicationCounts[item.indication] || 0) + 1;
    }
  });

  // Count by ATC code
  data.forEach(item => {
    if (item.atcCodes) {
      item.atcCodes.forEach((code: string) => {
        aggregation.atcCodeCounts[code] =
          (aggregation.atcCodeCounts[code] || 0) + 1;
      });
    }
  });

  return aggregation;
}
