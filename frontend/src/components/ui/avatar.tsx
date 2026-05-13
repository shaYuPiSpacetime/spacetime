import * as React from 'react';
import { cn } from '@/lib/utils';

const Avatar = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { src?: string; alt?: string; fallback?: string }>(
  ({ className, src, alt, fallback, ...props }, ref) => {
    const [error, setError] = React.useState(false);

    return (
      <div
        ref={ref}
        className={cn('relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted', className)}
        {...props}
      >
        {src && !error ? (
          <img
            src={src}
            alt={alt ?? ''}
            className="h-full w-full object-cover"
            onError={() => setError(true)}
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-xs font-medium text-muted-foreground">
            {fallback ?? '?'}
          </span>
        )}
      </div>
    );
  },
);
Avatar.displayName = 'Avatar';

export { Avatar };
