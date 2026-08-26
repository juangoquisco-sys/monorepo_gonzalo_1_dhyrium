import * as React from 'react';

import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { cn } from '@/lib/utils';

type AppInputProps = React.ComponentProps<'input'> & {
  label?: string;
  error?: string;
  helperText?: string;
  containerClassName?: string;
};

const AppInput = React.forwardRef<HTMLInputElement, AppInputProps>(
  function AppInput(
    { className, containerClassName, error, helperText, id, label, ...props },
    ref
  ) {
    const inputId = id ?? props.name;

    return (
      <div className={cn('grid w-full gap-1.5', containerClassName)}>
        {label && <Label htmlFor={inputId}>{label}</Label>}
        <Input
          ref={ref}
          id={inputId}
          aria-invalid={!!error}
          className={cn(error && 'border-danger ring-danger/20', className)}
          {...props}
        />
        {(error || helperText) && (
          <p
            className={cn(
              'text-xs text-muted-foreground',
              error && 'text-danger'
            )}
          >
            {error ?? helperText}
          </p>
        )}
      </div>
    );
  }
);

export { AppInput };
