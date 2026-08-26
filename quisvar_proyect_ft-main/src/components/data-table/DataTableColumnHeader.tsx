import { ArrowDown, ArrowUp, ChevronsUpDown, EyeOff } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Column } from '@tanstack/react-table';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface DataTableColumnHeaderProps<TData, TValue> {
  column: Column<TData, TValue>;
  title: string;
  className?: string;
  sortKey?: string;
  activeSortBy?: string;
  sortDir?: 'asc' | 'desc';
  onSortChange?: (sortDir: 'asc' | 'desc') => void;
  menuContent?: ReactNode;
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
  sortKey,
  activeSortBy,
  sortDir,
  onSortChange,
  menuContent,
}: DataTableColumnHeaderProps<TData, TValue>) {
  const hasRemoteSort = Boolean(sortKey && onSortChange);

  if (!hasRemoteSort && !column.getCanSort()) {
    return <div className={cn(className)}>{title}</div>;
  }

  const sorted = hasRemoteSort
    ? activeSortBy === sortKey
      ? sortDir
      : false
    : column.getIsSorted();
  const setAscending = () => {
    if (onSortChange) {
      onSortChange('asc');
      return;
    }
    column.toggleSorting(false);
  };
  const setDescending = () => {
    if (onSortChange) {
      onSortChange('desc');
      return;
    }
    column.toggleSorting(true);
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="-ml-2 h-8 gap-1 px-2 data-[state=open]:bg-muted"
          >
            <span>{title}</span>
            {sorted === 'desc' ? (
              <ArrowDown className="size-3.5" />
            ) : sorted === 'asc' ? (
              <ArrowUp className="size-3.5" />
            ) : (
              <ChevronsUpDown className="size-3.5" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-36">
          <DropdownMenuItem onClick={setAscending}>
            <ArrowUp className="size-4 text-muted-foreground" />
            Asc
          </DropdownMenuItem>
          <DropdownMenuItem onClick={setDescending}>
            <ArrowDown className="size-4 text-muted-foreground" />
            Desc
          </DropdownMenuItem>
          {menuContent && (
            <>
              <DropdownMenuSeparator />
              {menuContent}
            </>
          )}
          {column.getCanHide() && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => column.toggleVisibility(false)}>
                <EyeOff className="size-4 text-muted-foreground" />
                Hide
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
