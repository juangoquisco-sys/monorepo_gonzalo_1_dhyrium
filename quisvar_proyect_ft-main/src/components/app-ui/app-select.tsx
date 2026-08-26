import * as React from 'react';

import { Label } from '../ui/label';
import { cn } from '@/lib/utils';

type AppSelectProps<T> = Omit<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  'children'
> & {
  data?: T[];
  extractValue: (item: T) => string | number;
  renderTextField: (item: T) => React.ReactNode;
  label?: string;
  placeholder?: string;
  containerClassName?: string;
};

const AppSelectInner = <T,>(
  {
    className,
    containerClassName,
    data,
    extractValue,
    id,
    label,
    name,
    placeholder = 'Seleccionar',
    renderTextField,
    ...props
  }: AppSelectProps<T>,
  ref: React.ForwardedRef<HTMLSelectElement>
) => {
  const selectId = id ?? name;

  return (
    <div className={cn('grid w-full gap-1.5', containerClassName)}>
      {label && <Label htmlFor={selectId}>{label}</Label>}
      <select
        ref={ref}
        id={selectId}
        name={name}
        className={cn(
          'h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        {...props}
      >
        <option value="">{placeholder}</option>
        {data?.map(item => (
          <option key={extractValue(item)} value={extractValue(item)}>
            {renderTextField(item)}
          </option>
        ))}
      </select>
    </div>
  );
};

const AppSelect = React.forwardRef(AppSelectInner) as <T>(
  props: AppSelectProps<T> & { ref?: React.ForwardedRef<HTMLSelectElement> }
) => ReturnType<typeof AppSelectInner>;

export { AppSelect };
