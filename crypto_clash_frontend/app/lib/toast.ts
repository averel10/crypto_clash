export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

let toastListener: ((toast: Toast) => void) | null = null;
let toastId = 0;

export function setToastListener(listener: (toast: Toast) => void) {
  toastListener = listener;
}

export function showToast(message: string, type: ToastType = 'info', duration = 4000) {
  const id = String(toastId++);
  const toast: Toast = {
    id,
    message,
    type,
    duration,
  };

  if (toastListener) {
    toastListener(toast);
  }

  return id;
}

export function showSuccessToast(message: string, duration?: number) {
  return showToast(message, 'success', duration);
}

export function showErrorToast(message: string, duration?: number) {
  return showToast(message, 'error', duration);
}

export function showInfoToast(message: string, duration?: number) {
  return showToast(message, 'info', duration);
}

export function showWarningToast(message: string, duration?: number) {
  return showToast(message, 'warning', duration);
}
