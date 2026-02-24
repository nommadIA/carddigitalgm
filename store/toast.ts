
export type ToastType = "success" | "error" | "info";

export type ToastItem = {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  ttl?: number; // ms
};

type Listener = (items: ToastItem[]) => void;

let toasts: ToastItem[] = [];
const listeners = new Set<Listener>();

function emit() {
  for (const l of listeners) l(toasts);
}

export function subscribeToasts(listener: Listener) {
  listeners.add(listener);
  listener(toasts);
  return () => { listeners.delete(listener); };
}

export function pushToast(input: Omit<ToastItem, "id">) {
  const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const item: ToastItem = { id, ttl: 2800, ...input };

  toasts = [item, ...toasts].slice(0, 4);
  emit();

  window.setTimeout(() => {
    toasts = toasts.filter(t => t.id !== id);
    emit();
  }, item.ttl);

  return id;
}

export function clearToast(id: string) {
  toasts = toasts.filter(t => t.id !== id);
  emit();
}
