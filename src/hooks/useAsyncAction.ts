import { useCallback, useState } from "react";

export function useAsyncAction() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async <T>(action: () => Promise<T>): Promise<T | null> => {
    setIsLoading(true);
    setError(null);
    try {
      return await action();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Ocurrió un error inesperado";
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    error,
    execute,
    clearError: () => setError(null),
  };
}
