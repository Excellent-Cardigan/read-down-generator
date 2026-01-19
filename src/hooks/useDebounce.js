import { useEffect, useState } from 'react';

/**
 * @template T
 * @param {T} value
 * @param {number} [delay=300]
 * @returns {T}
 */
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

/**
 * @param {function(...*): void} callback
 * @param {number} [delay=300]
 * @param {React.DependencyList} [deps=[]]
 * @returns {function(...*): void}
 */
export function useDebouncedCallback(callback, delay = 300, deps = []) {
  /** @type {[* | undefined, function(* | undefined): void]} */
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