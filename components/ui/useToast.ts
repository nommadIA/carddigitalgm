
import { useCallback, useState } from "react";

export function useToast() {
  const [msg, setMsg] = useState<string>("");

  const show = useCallback((text: string) => {
    setMsg(text);
    const t = window.setTimeout(() => setMsg(""), 2800);
    return () => clearTimeout(t);
  }, []);

  return { msg, show };
}
