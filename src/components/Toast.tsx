import type { ToastState } from "../hooks/useSave";

export function Toast({ toast }: { toast: ToastState }) {
  return <div className={`toast ${toast.tone}`}>{toast.message}</div>;
}
