import { Check, Copy } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import { copyTextToClipboard } from '@/utils/copyTextToClipboard';

const hasData = (value: unknown) => {
  if (value === null || value === undefined) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return true;
};

interface JsonViewerProps {
  title: string;
  value: unknown;
  emptyLabel?: string;
  maxHeightClassName?: string;
  className?: string;
}

export const JsonViewer = ({
  title,
  value,
  emptyLabel = 'Sin datos',
  maxHeightClassName = 'max-h-[60dvh]',
  className,
}: JsonViewerProps) => {
  const [copied, setCopied] = useState(false);
  const copiedTimeoutRef = useRef<number | null>(null);
  const jsonText = useMemo(() => JSON.stringify(value, null, 2), [value]);
  const hasValue = hasData(value);

  const clearCopiedTimeout = useCallback(() => {
    if (copiedTimeoutRef.current) {
      window.clearTimeout(copiedTimeoutRef.current);
      copiedTimeoutRef.current = null;
    }
  }, []);

  const copyJson = useCallback(async () => {
    try {
      await copyTextToClipboard(jsonText);
      setCopied(true);
      SnackbarUtilities.success(`${title} copiado`);
      clearCopiedTimeout();
      copiedTimeoutRef.current = window.setTimeout(() => {
        setCopied(false);
        copiedTimeoutRef.current = null;
      }, 1600);
    } catch {
      SnackbarUtilities.error(`No se pudo copiar ${title}`);
    }
  }, [clearCopiedTimeout, jsonText, title]);

  useEffect(() => clearCopiedTimeout, [clearCopiedTimeout]);

  return (
    <section className={cn('space-y-2', className)}>
      <h3 className="p-0 text-sm font-semibold text-secondary">{title}</h3>
      {!hasValue ? (
        <div className="rounded-md border border-dashed border-border bg-muted/50 px-3 py-4 text-sm text-muted-foreground">
          {emptyLabel}
        </div>
      ) : (
        <div
          className={cn(
            'relative overflow-auto overscroll-contain rounded-md border border-border bg-slate-950',
            maxHeightClassName
          )}
        >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="sticky right-2 top-2 z-10 float-right mr-2 mt-2 size-7 bg-slate-900/90 text-slate-300 shadow-sm backdrop-blur hover:bg-slate-800 hover:text-white"
            aria-label={`Copiar ${title}`}
            title={`Copiar ${title}`}
            onClick={copyJson}
          >
            {copied ? (
              <Check className="size-4" />
            ) : (
              <Copy className="size-4" />
            )}
          </Button>
          <pre className="min-w-full whitespace-pre-wrap break-words p-3 pr-12 text-xs leading-5 text-slate-100 [overflow-wrap:anywhere]">
            {jsonText}
          </pre>
        </div>
      )}
    </section>
  );
};
