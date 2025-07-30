import { useEffect, useState } from 'react';

export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function useDebouncedCallback(callback, delay = 300, deps = []) {
  // Returns a debounced version of a callback
  const [args, setArgs] = useState();
  useEffect(() => {
    if (args === undefined) return;
    const handler = setTimeout(() => {
      callback(...args);
    }, delay);
    return () => clearTimeout(handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [args, delay, ...deps]);
  return (..._args) => setArgs(_args);
} 