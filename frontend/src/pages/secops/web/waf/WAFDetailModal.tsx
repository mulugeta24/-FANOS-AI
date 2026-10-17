import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface WAFDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export const WAFDetailModal: React.FC<WAFDetailModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-3xl',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div
        className={`w-full ${maxWidth} bg-[#0c121e] border border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3.5 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
          <h3 className="text-sm font-bold text-white tracking-wide">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-fanos-dim hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};
