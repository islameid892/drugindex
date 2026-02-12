import { useEffect, useRef, useCallback, useState } from 'react';

interface WorkerMessage {
  type: 'search' | 'filter' | 'aggregate';
  data: any[];
  query?: string;
  filters?: any;
}

interface WorkerResult {
  success: boolean;
  result?: any;
  error?: string;
}

export function useDataWorker() {
  const workerRef = useRef<Worker | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Initialize Web Worker
    try {
      workerRef.current = new Worker(
        new URL('../workers/dataProcessor.worker.ts', import.meta.url),
        { type: 'module' }
      );
      setIsReady(true);
    } catch (error) {
      console.warn('Web Worker not available, falling back to main thread:', error);
      setIsReady(false);
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  const processData = useCallback(
    (message: WorkerMessage): Promise<any> => {
      return new Promise((resolve, reject) => {
        if (!workerRef.current) {
          reject(new Error('Web Worker not initialized'));
          return;
        }

        const handler = (event: MessageEvent<WorkerResult>) => {
          workerRef.current?.removeEventListener('message', handler);
          workerRef.current?.removeEventListener('error', errorHandler);

          if (event.data.success) {
            resolve(event.data.result);
          } else {
            reject(new Error(event.data.error || 'Worker error'));
          }
        };

        const errorHandler = (error: ErrorEvent) => {
          workerRef.current?.removeEventListener('message', handler);
          workerRef.current?.removeEventListener('error', errorHandler);
          reject(error);
        };

        workerRef.current.addEventListener('message', handler);
        workerRef.current.addEventListener('error', errorHandler);

        workerRef.current.postMessage(message);
      });
    },
    []
  );

  const search = useCallback(
    (data: any[], query: string) => {
      if (!isReady) {
        // Fallback to main thread
        return Promise.resolve(
          data.filter(item =>
            JSON.stringify(item).toLowerCase().includes(query.toLowerCase())
          )
        );
      }
      return processData({ type: 'search', data, query });
    },
    [isReady, processData]
  );

  const filter = useCallback(
    (data: any[], filters: any) => {
      if (!isReady) {
        return Promise.resolve(data);
      }
      return processData({ type: 'filter', data, filters });
    },
    [isReady, processData]
  );

  const aggregate = useCallback(
    (data: any[]) => {
      if (!isReady) {
        return Promise.resolve({
          totalMedications: data.length,
          totalConditions: new Set(data.map(item => item.indication)).size,
        });
      }
      return processData({ type: 'aggregate', data });
    },
    [isReady, processData]
  );

  return {
    isReady,
    search,
    filter,
    aggregate,
  };
}
