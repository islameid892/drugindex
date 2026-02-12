import { useState, useEffect, useCallback } from 'react';

interface DataLoaderState {
  data: any[];
  loading: boolean;
  error: string | null;
  loadedChunks: Set<number>;
}

const CHUNK_SIZE = 500;
let cachedData: any[] = [];
let cachedIndex: any = null;

export function useDataLoader() {
  const [state, setState] = useState<DataLoaderState>({
    data: [],
    loading: true,
    error: null,
    loadedChunks: new Set(),
  });

  // Load index on mount
  useEffect(() => {
    const loadIndex = async () => {
      try {
        const response = await fetch('/data/chunks/index.json');
        if (!response.ok) throw new Error('Failed to load index');
        cachedIndex = await response.json();
        
        // Load first chunk immediately
        await loadChunk(0);
      } catch (error) {
        setState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Unknown error',
          loading: false,
        }));
      }
    };

    loadIndex();
  }, []);

  const loadChunk = useCallback(async (chunkIndex: number) => {
    if (!cachedIndex) return;
    
    // Prevent duplicate loads
    if (state.loadedChunks.has(chunkIndex)) return;

    try {
      const chunkFile = cachedIndex.files[chunkIndex];
      if (!chunkFile) return;

      const response = await fetch(`/data/chunks/${chunkFile}`);
      if (!response.ok) throw new Error(`Failed to load chunk ${chunkIndex}`);
      
      const chunkData = await response.json();
      cachedData = [...cachedData, ...chunkData];

      setState(prev => ({
        ...prev,
        data: cachedData,
        loadedChunks: new Set(Array.from(prev.loadedChunks).concat(chunkIndex)),
        loading: false,
      }));
    } catch (error) {
      console.error(`Error loading chunk ${chunkIndex}:`, error);
    }
  }, [state.loadedChunks]);

  const loadAllChunks = useCallback(async () => {
    if (!cachedIndex) return;

    const promises = [];
    for (let i = 0; i < cachedIndex.chunks; i++) {
      if (!state.loadedChunks.has(i)) {
        promises.push(loadChunk(i));
      }
    }

    if (promises.length > 0) {
      await Promise.all(promises);
    }
  }, [cachedIndex, state.loadedChunks, loadChunk]);

  const loadChunksInRange = useCallback(async (startIndex: number, endIndex: number) => {
    if (!cachedIndex) return;

    const promises = [];
    for (let i = startIndex; i <= endIndex && i < cachedIndex.chunks; i++) {
      if (!state.loadedChunks.has(i)) {
        promises.push(loadChunk(i));
      }
    }

    await Promise.all(promises);
  }, [cachedIndex, state.loadedChunks, loadChunk]);

  return {
    data: state.data,
    loading: state.loading,
    error: state.error,
    loadedChunks: state.loadedChunks,
    loadChunk,
    loadAllChunks,
    loadChunksInRange,
    totalChunks: cachedIndex?.chunks || 0,
  };
}
