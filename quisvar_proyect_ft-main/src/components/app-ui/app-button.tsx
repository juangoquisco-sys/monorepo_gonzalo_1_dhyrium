import * as React from 'react';

import { Button } from '../ui/button';
import { cn } from '@/lib/utils';

type AppButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger';

const variantMap = {
  primary: 'default',
  secondary: 'secondary',
  outline: 'outline',
  ghost: 'ghost',
  danger: 'destructive',
} as const;

type AppButtonProps = Omit<React.ComponentProps<typeof Button>, 'variant'> & {
  variant?: AppButtonVariant;
};

function AppButton({
  className,
  variant = 'primary',
  ...props
}: AppButtonProps) {
  return (
    <Button
      className={cn('font-semibold', className)}
      variant={variantMap[variant]}
      {...props}
    />
  );
}

export { AppButton };
