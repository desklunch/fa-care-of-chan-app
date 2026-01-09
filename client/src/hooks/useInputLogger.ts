import { useEffect, useRef } from "react";
import { debugLog } from "@/lib/debug-logger";

const THROTTLE_MS = 1000;

export function useInputLogger() {
  const lastClickLogRef = useRef<number>(0);
  const lastKeyLogRef = useRef<number>(0);
  const clickCountRef = useRef<number>(0);
  const keyCountRef = useRef<number>(0);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      clickCountRef.current += 1;
      const now = Date.now();
      
      if (now - lastClickLogRef.current > THROTTLE_MS) {
        const target = event.target as HTMLElement;
        const testId = target.getAttribute("data-testid");
        const tagName = target.tagName;
        const className = target.className?.toString()?.slice(0, 50);
        const textContent = target.textContent?.slice(0, 30);
        
        debugLog("INPUT", `Click detected on ${tagName}`, {
          testId,
          tagName,
          className,
          textContent,
          clickCount: clickCountRef.current,
          x: event.clientX,
          y: event.clientY,
        });
        lastClickLogRef.current = now;
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      keyCountRef.current += 1;
      const now = Date.now();
      
      if (now - lastKeyLogRef.current > THROTTLE_MS) {
        const target = event.target as HTMLElement;
        const tagName = target.tagName;
        const testId = target.getAttribute("data-testid");
        
        debugLog("INPUT", `Key press: ${event.key}`, {
          key: event.key,
          code: event.code,
          tagName,
          testId,
          keyCount: keyCountRef.current,
          ctrlKey: event.ctrlKey,
          altKey: event.altKey,
          shiftKey: event.shiftKey,
        });
        lastKeyLogRef.current = now;
      }
    };

    document.addEventListener("click", handleClick, { capture: true });
    document.addEventListener("keydown", handleKeyDown, { capture: true });

    debugLog("INPUT", "Input logger initialized");

    return () => {
      document.removeEventListener("click", handleClick, { capture: true });
      document.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, []);
}

export function InputLogger() {
  useInputLogger();
  return null;
}
