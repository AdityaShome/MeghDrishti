import { useEffect, useRef } from "react";

/** Runs `callback` immediately and then every `delayMs`, always using the
 * latest closure without resetting the timer on every render. */
export function useInterval(callback: () => void, delayMs: number) {
  const savedCallback = useRef(callback);
  savedCallback.current = callback;

  useEffect(() => {
    savedCallback.current();
    const id = setInterval(() => savedCallback.current(), delayMs);
    return () => clearInterval(id);
  }, [delayMs]);
}
