
import React, { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";
import { ToastItem, subscribeToasts, clearToast } from "../../store/toast";

const iconFor = (t: ToastItem["type"]) => {
  if (t === "success") return <CheckCircle2 size={18} className="toast-ic toast-success" />;
  if (t === "error") return <XCircle size={18} className="toast-ic toast-error" />;
  return <Info size={18} className="toast-ic toast-info" />;
};

export function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    return subscribeToasts(setItems);
  }, []);

  return (
    <div className="toast-host" aria-live="polite" aria-relevant="additions removals">
      {items.map((t) => (
        <div key={t.id} className="toast">
          <div className="toast-left">
            {iconFor(t.type)}
            <div className="toast-text">
              <div className="toast-title">{t.title}</div>
              {t.message ? <div className="toast-msg">{t.message}</div> : null}
            </div>
          </div>

          <button className="toast-close" onClick={() => clearToast(t.id)} title="Fechar">
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
