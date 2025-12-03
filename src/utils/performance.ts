import { useCallback, useMemo, useRef, useEffect } from 'react';

/**
 * Custom hook to debounce function calls
 * @param func - Function to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced function
 */
export function useDebounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedFunc = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        func(...args);
      }, delay);
    },
    [func, delay]
  ) as T;

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedFunc;
}

/**
 * Custom hook to throttle function calls
 * @param func - Function to throttle
 * @param delay - Delay in milliseconds
 * @returns Throttled function
 */
export function useThrottle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): T {
  const lastCallRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const throttledFunc = useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      
      if (now - lastCallRef.current >= delay) {
        func(...args);
        lastCallRef.current = now;
      } else {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          func(...args);
          lastCallRef.current = Date.now();
        }, delay - (now - lastCallRef.current));
      }
    },
    [func, delay]
  ) as T;

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return throttledFunc;
}

/**
 * Custom hook to memoize expensive calculations with cleanup
 * @param factory - Factory function that returns the value
 * @param deps - Dependencies array
 * @param cleanup - Optional cleanup function
 * @returns Memoized value
 */
export function useMemoWithCleanup<T>(
  factory: () => T,
  deps: React.DependencyList,
  cleanup?: (value: T) => void
): T {
  const value = useMemo(factory, deps);

  useEffect(() => {
    return () => {
      if (cleanup) {
        cleanup(value);
      }
    };
  }, [value, cleanup]);

  return value;
}

/**
 * Utility to check if component should re-render
 * @param prevProps - Previous props
 * @param nextProps - Next props
 * @param keys - Keys to compare
 * @returns Boolean indicating if re-render is needed
 */
export function shouldComponentUpdate<T extends Record<string, any>>(
  prevProps: T,
  nextProps: T,
  keys: (keyof T)[]
): boolean {
  return keys.some(key => prevProps[key] !== nextProps[key]);
}

/**
 * Utility to create a stable reference for objects
 * @param obj - Object to stabilize
 * @returns Stable reference
 */
export function useStableObject<T extends Record<string, any>>(obj: T): T {
  const ref = useRef<T>(obj);
  
  if (!Object.is(ref.current, obj)) {
    ref.current = obj;
  }
  
  return ref.current;
}

/**
 * Utility to prevent unnecessary re-renders in lists
 * @param items - Array of items
 * @param keyExtractor - Function to extract unique keys
 * @returns Stable array reference
 */
export function useStableArray<T>(
  items: T[],
  keyExtractor: (item: T, index: number) => string | number
): T[] {
  const ref = useRef<{ items: T[]; keys: (string | number)[] }>({ items: [], keys: [] });
  
  const currentKeys = items.map(keyExtractor);
  
  if (
    ref.current.items.length !== items.length ||
    !currentKeys.every((key, index) => ref.current.keys[index] === key)
  ) {
    ref.current = { items, keys: currentKeys };
  }
  
  return ref.current.items;
}


