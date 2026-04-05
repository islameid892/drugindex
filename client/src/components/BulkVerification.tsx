'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Upload, Download, Loader2, CheckCircle2, XCircle, Plus, Camera, X, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { trpc } from '@/lib/trpc';

interface BulkResult {
  input: string;
  type: 'code';
  found: boolean;
  isCovered: boolean;
  details: {
    name?: string;
  };
}

interface Suggestion {
  code: string;
  description: string;
}

export function BulkVerification() {
  const [input, setInput] = useState('');
  const [codeSearch, setCodeSearch] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [codes, setCodes] = useState<string[]>([]);
  const [results, setResults] = useState<BulkResult[]>([]);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [cameraError, setCameraError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  
  const verifyMutation = trpc.bulk.verifyBatch.useMutation({
    onSuccess: (data) => {
      setResults(Array.isArray(data) ? data : []);
    },
    onError: (error) => {
      console.error('Verification failed:', error);
    },
  });

  const suggestionsQuery = trpc.bulk.suggestions.useQuery(
    { query: codeSearch, limit: 10 },
    {
      enabled: codeSearch.length > 0,
      staleTime: 0,
    }
  );

  const ocrMutation = trpc.ocr.extractCodes.useMutation({
    onSuccess: (data) => {
      console.log('OCR extraction successful:', data);
      const extractedCodes = data.codes || [];
      console.log('Extracted codes:', extractedCodes);
      
      if (extractedCodes.length > 0) {
        setInput(prevInput => {
          const newCodes = extractedCodes.filter(
            (code: string) => !prevInput.includes(code)
          );
          
          if (newCodes.length > 0) {
            const additionalCodes = newCodes.join('\n');
            const updatedInput = prevInput ? `${prevInput}\n${additionalCodes}` : additionalCodes;
            console.log('Updated input:', updatedInput);
            return updatedInput;
          }
          return prevInput;
        });
        setCameraError('');
        alert(`✓ Successfully extracted ${extractedCodes.length} code(s) from image`);
      } else {
        setCameraError('No ICD-10 codes found in the image. Please try another image.');
        alert('No ICD-10 codes found in the image. Please try another image.');
      }
      setIsProcessingImage(false);
    },
    onError: (error) => {
      console.error('OCR processing failed:', error);
      setIsProcessingImage(false);
      const errorMsg = 'Failed to process image. Please try again or use manual entry.';
      setCameraError(errorMsg);
      alert(errorMsg);
    },
  });

  // Update suggestions when query changes
  useEffect(() => {
    if (suggestionsQuery.data) {
      setSuggestions(suggestionsQuery.data);
      setSelectedSuggestionIndex(-1);
    }
  }, [suggestionsQuery.data]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCodeSearchChange = (value: string) => {
    setCodeSearch(value.toUpperCase());
    setShowSuggestions(value.length > 0);
    setSelectedSuggestionIndex(-1);
  };

  const handleSelectSuggestion = (suggestion: Suggestion) => {
    setCodeSearch(suggestion.code);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedSuggestionIndex >= 0) {
          handleSelectSuggestion(suggestions[selectedSuggestionIndex]);
        } else {
          handleAddCode();
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        break;
    }
  };

  const handleAddCode = useCallback(() => {
    const trimmedCode = codeSearch.trim().toUpperCase();
    if (trimmedCode && /^[A-Z]\d{2}(\.\d{1,2})?$/.test(trimmedCode)) {
      if (!codes.includes(trimmedCode)) {
        setCodes([...codes, trimmedCode]);
        setCodeSearch('');
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }
  }, [codeSearch, codes]);

  const handleRemoveCode = useCallback((index: number) => {
    setCodes(codes.filter((_, i) => i !== index));
  }, [codes]);

  const handleVerify = useCallback(async () => {
    const allCodes = [
      ...codes,
      ...input
        .split('\n')
        .map(line => line.trim().toUpperCase())
        .filter(line => line.length > 0)
    ];

    if (allCodes.length === 0) return;

    verifyMutation.mutate({ items: allCodes });
  }, [input, codes, verifyMutation]);

  const handleCameraCapture = useCallback(() => {
    setCameraError('');
    if (fileInputRef.current) {
      // Reset the input value to allow selecting the same file twice
      fileInputRef.current.value = '';
      fileInputRef.current.accept = 'image/*';
      fileInputRef.current.click();
    }
  }, []);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      console.log('No file selected');
      setCameraError('');
      return;
    }

    // Validate file is an image
    if (!file.type.startsWith('image/')) {
      const errorMsg = 'Please select a valid image file (JPG, PNG, WebP, etc.)';
      setCameraError(errorMsg);
      alert(errorMsg);
      return;
    }

    // Validate file size (max 10MB)
    const maxSizeInBytes = 10 * 1024 * 1024;
    if (file.size > maxSizeInBytes) {
      const errorMsg = 'Image is too large. Please select an image smaller than 10MB.';
      setCameraError(errorMsg);
      alert(errorMsg);
      return;
    }

    setIsProcessingImage(true);
    setCameraError('');
    const reader = new FileReader();
    
    reader.onerror = () => {
      console.error('Failed to read file');
      setIsProcessingImage(false);
      const errorMsg = 'Failed to read image file. Please try again.';
      setCameraError(errorMsg);
      alert(errorMsg);
    };
    
    reader.onload = async (event) => {
      try {
        const base64Data = event.target?.result as string;
        if (!base64Data) {
          throw new Error('Failed to convert image to base64');
        }
        console.log('Image loaded, sending to OCR...');
        ocrMutation.mutate({ image: base64Data });
      } catch (error) {
        console.error('Error processing image:', error);
        setIsProcessingImage(false);
        const errorMsg = 'Error processing image. Please try again.';
        setCameraError(errorMsg);
        alert(errorMsg);
      }
    };
    
    reader.readAsDataURL(file);
  }, [ocrMutation]);

  const handleExportCSV = () => {
    if (results.length === 0) return;

    const csvResult = trpc.bulk.exportResults.useQuery({
      results,
      format: 'csv'
    });

    if (csvResult.data) {
      const blob = new Blob([csvResult.data.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = csvResult.data.filename;
      a.click();
      window.URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="space-y-6">
      {/* Code Search with Autocomplete */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-700">Add ICD-10 Codes</label>
        <div className="relative" ref={suggestionsRef}>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                placeholder="Type code (e.g., E11, D07.28)..."
                value={codeSearch}
                onChange={(e) => handleCodeSearchChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => codeSearch.length > 0 && setShowSuggestions(true)}
                className="h-10 text-base"
              />
              
              {/* Autocomplete Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                  {suggestions.map((suggestion, index) => (
                    <div
                      key={suggestion.code}
                      onClick={() => handleSelectSuggestion(suggestion)}
                      className={`px-4 py-2 cursor-pointer transition-colors ${
                        index === selectedSuggestionIndex
                          ? 'bg-sky-100 text-sky-900'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="font-semibold text-slate-900">{suggestion.code}</div>
                      <div className="text-sm text-slate-600">{suggestion.description}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <Button
              onClick={handleAddCode}
              disabled={!codeSearch.trim()}
              className="bg-sky-600 hover:bg-sky-700 text-white"
              size="sm"
            >
              <Plus className="h-4 w-4" />
              Add
            </Button>

            <Button
              onClick={handleCameraCapture}
              disabled={isProcessingImage}
              variant="outline"
              size="sm"
              title="Upload image to extract codes via OCR (supports camera or gallery)"
            >
              {isProcessingImage ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Camera Error Message */}
      {cameraError && (
        <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-700">{cameraError}</div>
        </div>
      )}

      {/* Selected Codes List */}
      {codes.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Selected Codes ({codes.length})</label>
          <div className="flex flex-wrap gap-2">
            {codes.map((code, index) => (
              <div
                key={index}
                className="bg-sky-50 border border-sky-200 rounded-lg px-3 py-1 flex items-center gap-2"
              >
                <span className="font-semibold text-sky-900">{code}</span>
                <button
                  onClick={() => handleRemoveCode(index)}
                  className="text-sky-600 hover:text-sky-900"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Paste Multiple Codes */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-700">Paste Multiple Codes (Optional)</label>
        <textarea
          placeholder="Paste codes here (one per line)..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="w-full h-32 p-3 border border-slate-200 rounded-lg font-mono text-sm"
        />
      </div>

      {/* Verify Button */}
      <Button
        onClick={handleVerify}
        disabled={verifyMutation.isPending || (codes.length === 0 && input.trim().length === 0)}
        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
      >
        {verifyMutation.isPending ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Verifying...
          </>
        ) : (
          'Verify Batch'
        )}
      </Button>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-900">Results ({results.length})</h3>
            <Button
              onClick={handleExportCSV}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold">Code</th>
                  <th className="px-4 py-2 text-left font-semibold">Found</th>
                  <th className="px-4 py-2 text-left font-semibold">Coverage</th>
                  <th className="px-4 py-2 text-left font-semibold">Details</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result, index) => (
                  <tr key={index} className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="px-4 py-2 font-mono font-semibold text-slate-900">{result.input}</td>
                    <td className="px-4 py-2">
                      {result.found ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {result.found ? (
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          result.isCovered
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {result.isCovered ? 'Covered' : 'Not Covered'}
                        </span>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-slate-700">{result.details.name || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Hidden file input for camera - supports both capture and gallery */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
        capture="environment"
      />

      {isProcessingImage && (
        <div className="flex items-center justify-center gap-2 text-slate-600 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <Loader2 className="h-4 w-4 animate-spin" />
          Processing image with OCR...
        </div>
      )}
    </div>
  );
}
