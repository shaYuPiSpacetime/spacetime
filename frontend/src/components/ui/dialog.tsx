import * as React from 'react';
import { XIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  layer?: 'default' | 'nested' | 'confirmation';
  closeOnEscape?: boolean;
  lockBodyScroll?: boolean;
}

const layerClasses = {
  default: 'z-50',
  nested: 'z-[70]',
  confirmation: 'z-[80]',
};

function Dialog({
  open,
  onClose,
  children,
  className,
  layer = 'default',
  closeOnEscape = true,
  lockBodyScroll = true,
}: DialogProps) {
  React.useEffect(() => {
    if (!lockBodyScroll) return undefined;
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [lockBodyScroll, open]);

  React.useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (open && closeOnEscape) document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [closeOnEscape, open, onClose]);

  if (!open) return null;

  return (
    <div className={cn('fixed inset-0 flex items-center justify-center', layerClasses[layer])}>
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div
        className={cn(
          'relative z-[1] max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-lg border bg-card p-6 shadow-lg',
          className,
        )}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100"
        >
          <XIcon className="h-4 w-4" />
        </button>
        {children}
      </div>
    </div>
  );
}

function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)} {...props} />;
}

function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn('text-lg font-semibold leading-none tracking-tight', className)} {...props} />;
}

function DialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-muted-foreground', className)} {...props} />;
}

export { Dialog, DialogHeader, DialogTitle, DialogDescription };
