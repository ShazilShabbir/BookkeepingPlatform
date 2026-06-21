import { useEffect, useCallback, forwardRef } from 'react';
import clsx from 'clsx';

type Size = 'sm' | 'md' | 'lg' | 'xl' | 'full';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: Size;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

const sizeStyles: Record<Size, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-2xl',
};

export const Modal = forwardRef<HTMLDivElement, ModalProps>(
  ({ open, onClose, title, description, size = 'md', children, footer, className }, ref) => {
    const handleKeyDown = useCallback(
      (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      },
      [onClose],
    );

    useEffect(() => {
      if (open) {
        document.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';
      }
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
      };
    }, [open, handleKeyDown]);

    if (!open) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/40 animate-fade-in" onClick={onClose} />
        <div
          ref={ref}
          className={clsx(
            'relative bg-white rounded-2xl shadow-modal border border-surface-200 w-full animate-scale-in',
            'max-h-[85vh] flex flex-col',
            sizeStyles[size],
            className,
          )}
        >
          {(title || description) && (
            <div className="flex items-start justify-between p-6 pb-0">
              <div className="flex-1 min-w-0">
                {title && <h3 className="text-lg font-semibold text-surface-900">{title}</h3>}
                {description && <p className="text-sm text-surface-500 mt-1">{description}</p>}
              </div>
              <button
                onClick={onClose}
                className="p-2.5 sm:p-1.5 rounded-lg hover:bg-surface-100 text-surface-400 shrink-0 ml-4 -mr-1.5 -mt-1.5 min-w-10 min-h-10 sm:min-w-0 sm:min-h-0 flex items-center justify-center"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {!title && !description && (
            <div className="absolute top-4 right-4 z-10">
              <button
                onClick={onClose}
                className="p-2.5 sm:p-1.5 rounded-lg hover:bg-surface-100 text-surface-400 min-w-10 min-h-10 sm:min-w-0 sm:min-h-0 flex items-center justify-center"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {children && <div className="p-6 overflow-y-auto">{children}</div>}

          {footer && (
            <div className="p-6 pt-0 mt-auto">
              <div className="border-t border-surface-200 pt-4">{footer}</div>
            </div>
          )}
        </div>
      </div>
    );
  },
);

Modal.displayName = 'Modal';
