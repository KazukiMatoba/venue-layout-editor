import { useState, useCallback, useEffect } from 'react';

interface ErrorHandlerOptions {
  autoClear?: boolean;
  autoClearDelay?: number;
  logErrors?: boolean;
  onError?: (error: string) => void;
  keepHistory?: boolean;
  maxHistorySize?: number;
}

interface ErrorHandlerReturn {
  error: string | null;
  hasError: boolean;
  errorHistory: string[];
  setError: (error: string | Error | null | undefined) => void;
  clearError: () => void;
  clearErrorHistory: () => void;
  handleError: <T>(fn: () => T) => T | undefined;
  handleAsyncError: <T>(fn: () => Promise<T>) => Promise<T | undefined>;
}

/**
 * エラーハンドリングフック
 * エラーの表示、自動クリア、履歴管理などを提供
 */
export const useErrorHandler = (options: ErrorHandlerOptions = {}): ErrorHandlerReturn => {
  const {
    autoClear = false,
    autoClearDelay = 5000,
    logErrors = true,
    onError,
    keepHistory = false,
    maxHistorySize = 10
  } = options;

  const [error, setErrorState] = useState<string | null>(null);
  const [errorHistory, setErrorHistory] = useState<string[]>([]);

  // 自動クリアのタイマー
  useEffect(() => {
    if (error && autoClear) {
      const timer = setTimeout(() => {
        setErrorState(null);
      }, autoClearDelay);

      return () => clearTimeout(timer);
    }
  }, [error, autoClear, autoClearDelay]);

  const setError = useCallback((errorInput: string | Error | null | undefined) => {
    if (!errorInput) {
      setErrorState(null);
      return;
    }

    let errorMessage: string;
    if (typeof errorInput === 'string') {
      errorMessage = errorInput;
    } else if (errorInput instanceof Error) {
      errorMessage = errorInput.message;
    } else {
      errorMessage = '不明なエラーが発生しました';
    }

    setErrorState(errorMessage);

    // エラーログ出力
    if (logErrors) {
      console.error('Error:', errorMessage);
    }

    // カスタムエラーハンドラー呼び出し
    if (onError) {
      onError(errorMessage);
    }

    // エラー履歴の更新
    if (keepHistory) {
      setErrorHistory(prev => {
        const newHistory = [...prev, errorMessage];
        return newHistory.slice(-maxHistorySize);
      });
    }
  }, [logErrors, onError, keepHistory, maxHistorySize]);

  const clearError = useCallback(() => {
    setErrorState(null);
  }, []);

  const clearErrorHistory = useCallback(() => {
    setErrorHistory([]);
  }, []);

  const handleError = useCallback(<T>(fn: () => T): T | undefined => {
    try {
      return fn();
    } catch (error) {
      setError(error as Error);
      return undefined;
    }
  }, [setError]);

  const handleAsyncError = useCallback(async <T>(fn: () => Promise<T>): Promise<T | undefined> => {
    try {
      return await fn();
    } catch (error) {
      setError(error as Error);
      return undefined;
    }
  }, [setError]);

  return {
    error,
    hasError: error !== null,
    errorHistory,
    setError,
    clearError,
    clearErrorHistory,
    handleError,
    handleAsyncError
  };
};