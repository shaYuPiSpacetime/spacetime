import * as React from 'react';
import { ChevronDownIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const Select = React.forwardRef<HTMLDivElement, SelectProps>(
  ({ options, value, onChange, placeholder, className, disabled }, ref) => {
    const [open, setOpen] = React.useState(false);
    const [selected, setSelected] = React.useState(value ?? '');
    const containerRef = React.useRef<HTMLDivElement>(null);

    React.useImperativeHandle(ref, () => containerRef.current!);

    React.useEffect(() => {
      if (value !== undefined) setSelected(value);
    }, [value]);

    React.useEffect(() => {
      function handleClickOutside(e: MouseEvent) {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setOpen(false);
        }
      }
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedLabel = options.find((o) => o.value === selected)?.label ?? placeholder;

    return (
      <div ref={containerRef} className={cn('relative', className)}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen(!open)}
          className={cn(
            'flex h-9 w-full items-center justify-between rounded-md border border-input bg-card px-3 text-sm shadow-sm',
            'focus:outline-none focus:ring-1 focus:ring-ring',
            'disabled:cursor-not-allowed disabled:opacity-50',
            selected ? 'text-foreground' : 'text-muted-foreground',
          )}
        >
          <span className="truncate">{selectedLabel ?? placeholder}</span>
          <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </button>

        {open && (
          <div className="absolute z-50 mt-1 w-full rounded-md border bg-card shadow-md">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                className={cn(
                  'w-full px-3 py-2 text-left text-sm hover:bg-muted',
                  option.value === selected && 'bg-primary/10 text-primary',
                )}
                onClick={() => {
                  setSelected(option.value);
                  onChange?.(option.value);
                  setOpen(false);
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  },
);
Select.displayName = 'Select';

export { Select };
export type { SelectOption, SelectProps };
