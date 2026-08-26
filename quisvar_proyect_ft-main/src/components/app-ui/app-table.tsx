import * as React from 'react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { cn } from '@/lib/utils';

function AppTable({ className, ...props }: React.ComponentProps<typeof Table>) {
  return <Table className={cn('text-sm', className)} {...props} />;
}

export {
  AppTable,
  TableBody as AppTableBody,
  TableCell as AppTableCell,
  TableHead as AppTableHead,
  TableHeader as AppTableHeader,
  TableRow as AppTableRow,
};
