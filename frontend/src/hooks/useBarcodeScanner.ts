import { useEffect, useRef } from "react";

interface UseBarcodeScannerOptions {
  onScan: (barcode: string) => void;
  minChars?: number;
  maxDelayMs?: number;
  enabled?: boolean;
}

/**
 * useBarcodeScanner
 * Captures high-speed keyboard-wedge USB barcode scanner inputs anywhere in the application.
 * Hardware scanners type characters within 5-30ms intervals ending with an Enter keystroke.
 */
export function useBarcodeScanner({
  onScan,
  minChars = 4,
  maxDelayMs = 45,
  enabled = true,
}: UseBarcodeScannerOptions) {
  const bufferRef = useRef<string>("");
  const lastKeyTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is intentionally typing into a regular input or textarea,
      // UNLESS keystrokes are coming in faster than human typing (< 35ms)
      const target = e.target as HTMLElement | null;
      const isInput =
        target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);

      const currentTime = Date.now();
      const elapsed = currentTime - lastKeyTimeRef.current;
      lastKeyTimeRef.current = currentTime;

      // If delay between keys was too long and not empty, reset buffer
      if (elapsed > maxDelayMs && bufferRef.current.length > 0) {
        bufferRef.current = "";
      }

      if (e.key === "Enter") {
        if (bufferRef.current.length >= minChars) {
          const scannedCode = bufferRef.current.trim();
          bufferRef.current = "";
          // If in an input, prevent submitting parent forms
          e.preventDefault();
          e.stopPropagation();
          onScan(scannedCode);
        } else {
          bufferRef.current = "";
        }
        return;
      }

      // Collect alphanumeric and standard barcode hyphen/slash characters
      if (e.key.length === 1 && /^[\w\-\/\.\:]$/.test(e.key)) {
        bufferRef.current += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [onScan, minChars, maxDelayMs, enabled]);
}
