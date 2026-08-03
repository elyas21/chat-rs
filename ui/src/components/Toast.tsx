import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import type { ToastInfo } from '../types';

interface ToastProps {
  toast: ToastInfo | null;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  if (!toast) return null;

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  const icons = {
    success: <CheckCircle2 size={18} className="text-emerald-400" />,
    error: <AlertCircle size={18} className="text-rose-400" />,
    info: <Info size={18} className="text-cyan-400" />,
  };

  const bgStyles = {
    success: 'rgba(16, 185, 129, 0.15)',
    error: 'rgba(239, 68, 68, 0.15)',
    info: 'rgba(6, 182, 212, 0.15)',
  };

  const borderStyles = {
    success: '1px solid rgba(16, 185, 129, 0.3)',
    error: '1px solid rgba(239, 68, 68, 0.3)',
    info: '1px solid rgba(6, 182, 212, 0.3)',
  };

  return (
    <div
      className="animate-fade-in fixed bottom-6 right-6 z-[9999] flex items-center gap-3 px-4 py-3 rounded-xl backdrop-blur-md shadow-2xl text-sm font-medium max-w-md text-white"
      style={{
        background: bgStyles[toast.type] || bgStyles.info,
        border: borderStyles[toast.type] || borderStyles.info,
      }}
    >
      {icons[toast.type] || icons.info}
      <span className="flex-1">{toast.message}</span>
      <button
        onClick={onClose}
        className="text-white/60 hover:text-white transition-colors p-1"
      >
        <X size={16} />
      </button>
    </div>
  );
};
