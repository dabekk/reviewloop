import { useCallback, useRef, useState } from "react";

/** Copy to clipboard with a 1.6s "Copied" flash, safe in sandboxed frames. */
export function useCopy() {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  const copy = useCallback((text: string) => {
    const flash = () => {
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 1600);
    };
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(flash, flash);
    else flash();
  }, []);

  return { copied, copy };
}
