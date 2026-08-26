import * as React from 'react';

import { cn } from '@/lib/utils';

function AppPageShell({
  className,
  ...props
}: React.ComponentProps<'section'>) {
  return (
    <section
      className={cn('min-h-0 min-w-0 bg-muted/70 text-foreground', className)}
      {...props}
    />
  );
}

export { AppPageShell };
