import { useEffect, useState } from 'react';
import { AppButton } from '@/components/app-ui/app-button';
import { AppInput } from '@/components/app-ui/app-input';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import {
  downloadExpedienteFoliation,
  generateExpedienteFoliation,
  getExpedienteFoliationStatus,
  reprintExpedientePages,
  type ExpedienteFoliationStatus,
  type ExpedienteRootType,
  type FoliationConfig,
  type FoliationPosition,
} from '@/pages/specialities/services/expedienteFoliation.service';

const DEFAULT_CONFIG: FoliationConfig = {
  position: 'TOP_RIGHT',
  marginX: 10,
  marginY: 10,
};

const POSITION_OPTIONS: Array<{ value: FoliationPosition; label: string }> = [
  { value: 'TOP_RIGHT', label: 'Superior derecha' },
  { value: 'TOP_LEFT', label: 'Superior izquierda' },
  { value: 'BOTTOM_RIGHT', label: 'Inferior derecha' },
  { value: 'BOTTOM_LEFT', label: 'Inferior izquierda' },
];

const parsePageNumbers = (value: string) =>
  [...new Set(value.split(',').map(part => Number(part.trim())).filter(Number.isInteger))]
    .filter(page => page > 0)
    .sort((left, right) => left - right);

interface ExpedienteFoliationDialogProps {
  rootType: ExpedienteRootType;
  rootId: number;
  rootName: string;
}

export default function ExpedienteFoliationDialog({
  rootType,
  rootId,
  rootName,
}: ExpedienteFoliationDialogProps) {
  const [status, setStatus] = useState<ExpedienteFoliationStatus | null>(null);
  const [config, setConfig] = useState<FoliationConfig>(DEFAULT_CONFIG);
  const [pageSelection, setPageSelection] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [reprinting, setReprinting] = useState(false);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const nextStatus = await getExpedienteFoliationStatus(rootType, rootId);
      setStatus(nextStatus);
      if (nextStatus.exists) {
        setConfig({
          position: nextStatus.position,
          marginX: nextStatus.marginX,
          marginY: nextStatus.marginY,
        });
      }
    } catch {
      SnackbarUtilities.error('No se pudo cargar el estado del expediente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStatus();
  }, [rootId, rootType]);

  const updateMargin = (key: 'marginX' | 'marginY', value: string) => {
    const parsed = Number(value);
    setConfig(current => ({
      ...current,
      [key]: Number.isInteger(parsed) ? parsed : 0,
    }));
  };

  const generate = async () => {
    setGenerating(true);
    try {
      await generateExpedienteFoliation(rootType, rootId, config);
      SnackbarUtilities.success('Expediente generado y foliado correctamente.');
      await loadStatus();
    } catch {
      SnackbarUtilities.error('No se pudo generar el expediente completo.');
    } finally {
      setGenerating(false);
    }
  };

  const download = async () => {
    try {
      await downloadExpedienteFoliation(rootType, rootId, `${rootName}.pdf`);
    } catch {
      SnackbarUtilities.error('No se pudo descargar el expediente.');
    }
  };

  const reprint = async () => {
    const pageNumbers = parsePageNumbers(pageSelection);
    if (!pageNumbers.length) {
      SnackbarUtilities.warning('Indique al menos una página separada por coma.');
      return;
    }
    setReprinting(true);
    try {
      await reprintExpedientePages(
        rootType,
        rootId,
        pageNumbers,
        `${rootName} - reimpresión.pdf`
      );
      SnackbarUtilities.success('Reimpresión lista.');
    } catch {
      SnackbarUtilities.error('No se pudo reimprimir las páginas seleccionadas.');
    } finally {
      setReprinting(false);
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground">Cargando…</p>;

  return (
    <div className="grid gap-5">
      <section className="grid gap-3 rounded-lg border border-border bg-muted/20 p-4">
        <div>
          <h3 className="text-sm font-semibold">Configuración de foliación</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {status?.exists
              ? 'Regenerar reemplaza la versión activa del expediente.'
              : 'Configure la ubicación del folio antes de generar el expediente.'}
          </p>
        </div>
        <label className="grid gap-1.5 text-sm font-medium">
          Ubicación del folio
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={config.position}
            disabled={generating}
            onChange={event =>
              setConfig(current => ({
                ...current,
                position: event.target.value as FoliationPosition,
              }))
            }
          >
            {POSITION_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <AppInput
            label="Margen horizontal (mm)"
            type="number"
            min={0}
            max={200}
            value={config.marginX}
            disabled={generating}
            onChange={event => updateMargin('marginX', event.target.value)}
          />
          <AppInput
            label="Margen vertical (mm)"
            type="number"
            min={0}
            max={200}
            value={config.marginY}
            disabled={generating}
            onChange={event => updateMargin('marginY', event.target.value)}
          />
        </div>
        <AppButton onClick={generate} disabled={generating}>
          {generating
            ? status?.exists
              ? 'Regenerando…'
              : 'Generando…'
            : status?.exists
            ? 'Regenerar expediente'
            : 'Generar expediente completo'}
        </AppButton>
      </section>

      {status?.exists && (
        <section className="grid gap-3 rounded-lg border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              {status.totalPages} páginas · generado{' '}
              {new Date(status.generatedAt).toLocaleString()}
            </p>
            <AppButton variant="outline" onClick={download}>
              Descargar completo
            </AppButton>
          </div>
          <AppInput
            label="Reimprimir páginas"
            helperText="Ingrese páginas físicas separadas por coma, por ejemplo: 1, 2, 15."
            value={pageSelection}
            disabled={reprinting}
            onChange={event => setPageSelection(event.target.value)}
          />
          <AppButton variant="secondary" onClick={reprint} disabled={reprinting}>
            {reprinting ? 'Reimprimiendo…' : 'Reimprimir selección'}
          </AppButton>
        </section>
      )}
    </div>
  );
}
