"use client";

import { useEffect, useRef, useCallback } from "react";

const IDLE_EVENTS: (keyof WindowEventMap)[] = [
  "mousemove",
  "mousedown",
  "keydown",
  "touchstart",
  "scroll",
];

// Signs the user out after idleMs of inactivity.
export function useIdleTimeout(idleMs: number, onIdle: () => void): void {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(onIdle, idleMs);
  }, [idleMs, onIdle]);

  useEffect(() => {
    reset();
    IDLE_EVENTS.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    return () => {
      if (timer.current) clearTimeout(timer.current);
      IDLE_EVENTS.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [reset]);
}
