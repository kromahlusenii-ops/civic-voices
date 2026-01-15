"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"
import Toast, { type ToastAction } from "../components/Toast"

interface ToastState {
  message: string
  action?: ToastAction
  duration?: number
}

interface ToastContextValue {
  showToast: (toast: ToastState) => void
  hideToast: () => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null)

  const showToast = useCallback((t: ToastState) => {
    setToast(t)
  }, [])

  const hideToast = useCallback(() => {
    setToast(null)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      {toast && (
        <Toast
          message={toast.message}
          action={toast.action}
          duration={toast.duration}
          onClose={hideToast}
        />
      )}
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return context
}
