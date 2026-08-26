import { Check, PlusCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Separator } from '../ui/separator';
import { cn } from '@/lib/utils';

export interface DataTableFacetOption {
  label: string;
  value: string;
  count?: number;
}

interface DataTableFacetedFilterProps {
  title: string;
  values?: string[];
  options: DataTableFacetOption[];
  onChange: (values?: string[]) => void;
  searchable?: boolean;
}

export const DataTableFacetedFilter = ({
  title,
  values,
  options,
  onChange,
  searchable = false,
}: DataTableFacetedFilterProps) => {
  const [query, setQuery] = useState('');
  const selectedValues = useMemo(() => new Set(values || []), [values]);
  const selectedOptions = options.filter(option =>
    selectedValues.has(option.value)
  );
  const visibleOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return options;
    return options.filter(option =>
      option.label.toLowerCase().includes(normalizedQuery)
    );
  }, [options, query]);
  const shouldUseCompactSummary = title.toLowerCase() === 'usuario';
  const summary =
    shouldUseCompactSummary && selectedOptions.length > 1
      ? `${selectedOptions.length} seleccionados`
      : selectedOptions.map(option => option.label).join(', ');
  const summaryTitle = selectedOptions.map(option => option.label).join(', ');

  const toggleValue = (value: string) => {
    const nextValues = new Set(selectedValues);
    if (nextValues.has(value)) {
      nextValues.delete(value);
    } else {
      nextValues.add(value);
    }
    const next = Array.from(nextValues);
    onChange(next.length ? next : undefined);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 gap-2 border-dashed"
        >
          <PlusCircle className="size-4" />
          {title}
          {selectedOptions.length > 0 && (
            <>
              <Separator orientation="vertical" className="mx-1 h-4" />
              <Badge
                variant="secondary"
                className="!w-auto !shrink justify-start overflow-hidden rounded-sm px-1.5"
                title={summaryTitle}
              >
                <span className="min-w-0 max-w-36 truncate text-left">
                  {summary}
                </span>
              </Badge>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-64 p-2"
        align="start"
        onWheel={event => event.stopPropagation()}
      >
        <div className="space-y-2">
          {searchable && (
            <Input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder={`Buscar ${title.toLowerCase()}...`}
              className="h-8"
            />
          )}
          <div className="max-h-64 overflow-y-auto pr-1">
            <div className="space-y-1 pr-1">
              <button
                type="button"
                className={cn(
                  'flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted',
                  selectedOptions.length === 0 && 'bg-muted text-secondary'
                )}
                onClick={() => onChange(undefined)}
              >
                Todos
                {selectedOptions.length === 0 && <Check className="size-4" />}
              </button>
              {visibleOptions.map(option => {
                const selected = selectedValues.has(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    className={cn(
                      'flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted',
                      selected && 'bg-muted text-secondary'
                    )}
                    onClick={() => toggleValue(option.value)}
                  >
                    <span
                      className="min-w-0 flex-1 truncate"
                      title={option.label}
                    >
                      {option.label}
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      {option.count !== undefined && (
                        <span className="text-xs text-muted-foreground">
                          {option.count}
                        </span>
                      )}
                      {selected && <Check className="size-4" />}
                    </span>
                  </button>
                );
              })}
              {visibleOptions.length === 0 && (
                <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                  Sin resultados
                </div>
              )}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
