import { useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CalendarRange,
  Check,
  Download,
  Image as ImageIcon,
  Share2,
  UsersRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import {
  downloadFiles,
  shareFilesWithDownloadFallback,
} from '@/utils/shareFiles';
import type { DutyDialogHandleGetter } from '../../dutyRotations.dialogs';
import { dutyRotationQueryKeys } from '../../dutyRotations.queries';
import {
  getShareableDutyUserName,
  groupDutyPlanningAssignments,
  type DutyPlanningOccurrence,
} from '../../dutyPlanningGroups';
import { addDutyDays, formatDutyDisplayDate } from '../../dutyRotations.utils';
import type { ValidDutyRotation } from '../../models/dutyRotations.types';
import { getDutyAssignments } from '../../services/dutyRotations.service';
import DutyPlanningSharePages from '../planning/DutyPlanningSharePages';

interface ShareDutyPlanningDialogProps {
  duty: ValidDutyRotation;
  currentDate: string;
  getDialogHandle: DutyDialogHandleGetter;
}

type SelectionMode = 'NEXT' | 'UPCOMING' | 'CUSTOM';

const defaultUpcoming = (occurrences: DutyPlanningOccurrence[]) => {
  const selected: DutyPlanningOccurrence[] = [];
  let assignmentCount = 0;
  for (const occurrence of occurrences.slice(0, 8)) {
    if (selected.length && assignmentCount + occurrence.assignments.length > 30)
      break;
    selected.push(occurrence);
    assignmentCount += occurrence.assignments.length;
  }
  return selected;
};

const resolveSelection = (
  occurrences: DutyPlanningOccurrence[],
  mode: SelectionMode,
  customKeys: Set<string>
) => {
  if (mode === 'NEXT') return occurrences.slice(0, 1);
  if (mode === 'UPCOMING') return defaultUpcoming(occurrences);
  return occurrences.filter(occurrence =>
    customKeys.has(occurrence.occurrenceKey)
  );
};

const partitionSharePages = (
  occurrences: DutyPlanningOccurrence[],
  distributed: boolean
) => {
  if (distributed) return occurrences.map(occurrence => [occurrence]);
  const pages: DutyPlanningOccurrence[][] = [];
  let page: DutyPlanningOccurrence[] = [];
  let pageAssignments = 0;
  occurrences.forEach(occurrence => {
    if (page.length && pageAssignments + occurrence.assignments.length > 30) {
      pages.push(page);
      page = [];
      pageAssignments = 0;
    }
    page.push(occurrence);
    pageAssignments += occurrence.assignments.length;
  });
  if (page.length) pages.push(page);
  return pages;
};

const canvasToPng = (canvas: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error('No se pudo convertir la planificación a PNG'));
    }, 'image/png');
  });

const waitForRender = () =>
  new Promise<void>(resolve =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  );

const fileSafeName = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'rotacion';

const ShareDutyPlanningDialog = ({
  currentDate,
  duty,
  getDialogHandle,
}: ShareDutyPlanningDialogProps) => {
  const distributed = duty.assignmentStrategy === 'DISTRIBUTE_PARTICIPANTS';
  const [mode, setMode] = useState<SelectionMode>(
    distributed ? 'NEXT' : 'UPCOMING'
  );
  const [customKeys, setCustomKeys] = useState<Set<string>>(new Set());
  const [captureOccurrences, setCaptureOccurrences] = useState<
    DutyPlanningOccurrence[]
  >([]);
  const [generatedAt, setGeneratedAt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const captureRootRef = useRef<HTMLDivElement>(null);
  const horizonEnd = addDutyDays(currentDate, 60);
  const assignmentsQuery = useQuery({
    queryKey: [
      ...dutyRotationQueryKeys.assignments,
      'share',
      duty.id,
      currentDate,
      horizonEnd,
    ],
    queryFn: () =>
      getDutyAssignments({
        dutyId: duty.id,
        dateFrom: currentDate,
        dateTo: horizonEnd,
      }),
  });
  const occurrences = useMemo(
    () => groupDutyPlanningAssignments(assignmentsQuery.data ?? []),
    [assignmentsQuery.data]
  );
  const selectedOccurrences = useMemo(
    () => resolveSelection(occurrences, mode, customKeys),
    [customKeys, mode, occurrences]
  );
  const capturePages = useMemo(
    () => partitionSharePages(captureOccurrences, distributed),
    [captureOccurrences, distributed]
  );

  const toggleOccurrence = (occurrenceKey: string) => {
    setCustomKeys(current => {
      const next = new Set(current);
      if (next.has(occurrenceKey)) next.delete(occurrenceKey);
      else if (next.size < 8) next.add(occurrenceKey);
      return next;
    });
  };

  const createFiles = async () => {
    const refreshed = await assignmentsQuery.refetch();
    const latestOccurrences = groupDutyPlanningAssignments(
      refreshed.data ?? []
    );
    const latestSelection = resolveSelection(
      latestOccurrences,
      mode,
      customKeys
    );
    if (!latestSelection.length) {
      throw new Error(
        'Selecciona al menos una jornada con turnos materializados'
      );
    }
    const hasMissingName = latestSelection.some(occurrence =>
      occurrence.assignments.some(
        assignment =>
          assignment.status !== 'OPEN_POOL' &&
          !getShareableDutyUserName(assignment.assignedUser)
      )
    );
    if (hasMissingName) {
      throw new Error(
        'Hay una persona sin nombre completo. Corrige su perfil antes de compartir.'
      );
    }

    setGeneratedAt(
      new Intl.DateTimeFormat('es-PE', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'America/Lima',
      }).format(new Date())
    );
    setCaptureOccurrences(latestSelection);
    await document.fonts?.ready;
    await waitForRender();
    const pageElements = Array.from(
      captureRootRef.current?.querySelectorAll<HTMLElement>(
        '[data-duty-share-page]'
      ) ?? []
    );
    if (!pageElements.length) {
      throw new Error('No se pudo preparar la imagen de planificación');
    }

    const baseName = `rotacion-${fileSafeName(duty.name)}-${currentDate}`;
    const { default: html2canvas } = await import('html2canvas');
    const files: File[] = [];
    for (const [index, pageElement] of pageElements.entries()) {
      const canvas = await html2canvas(pageElement, {
        backgroundColor: '#f8fafc',
        scale: 1.5,
        useCORS: true,
        width: 1080,
        windowWidth: 1080,
        windowHeight: pageElement.scrollHeight,
      });
      const blob = await canvasToPng(canvas);
      files.push(
        new File(
          [blob],
          `${baseName}${pageElements.length > 1 ? `-${index + 1}` : ''}.png`,
          { type: 'image/png' }
        )
      );
    }
    return files;
  };

  const runGeneration = async (action: 'DOWNLOAD' | 'SHARE') => {
    try {
      setIsGenerating(true);
      getDialogHandle()?.block('Espera a que se generen las imágenes');
      const files = await createFiles();
      if (action === 'DOWNLOAD') {
        downloadFiles(files);
        SnackbarUtilities.success(
          files.length === 1
            ? 'Imagen descargada'
            : `${files.length} imágenes descargadas`
        );
        return;
      }
      const result = await shareFilesWithDownloadFallback({
        files,
        title: `Planificación · ${duty.name}`,
        message: `Próximas rotaciones de ${duty.name}. Las imágenes fueron generadas desde la planificación vigente.`,
      });
      if (result === 'DOWNLOADED') {
        SnackbarUtilities.warning(
          'El navegador no puede adjuntar archivos directamente. Se descargaron los PNG para enviarlos por WhatsApp.'
        );
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      SnackbarUtilities.error(
        error instanceof Error
          ? error.message
          : 'No se pudo generar la planificación'
      );
    } finally {
      getDialogHandle()?.unblock();
      setIsGenerating(false);
    }
  };

  return (
    <div className="dutyRotations-shareDialog">
      <div className="dutyRotations-shareIntro">
        <ImageIcon aria-hidden="true" />
        <div>
          <strong>Una imagen limpia para el grupo del equipo</strong>
          <p>
            Incluye jornadas, zonas, indicaciones y nombres completos. No
            incluye correos, documentos ni estados internos.
          </p>
        </div>
      </div>

      <div
        className="dutyRotations-shareModes"
        role="group"
        aria-label="Jornadas a compartir"
      >
        <button
          type="button"
          className={mode === 'NEXT' ? 'is-selected' : undefined}
          onClick={() => setMode('NEXT')}
        >
          <CalendarRange aria-hidden="true" />
          <span>
            <strong>Próxima jornada</strong>
            <small>La fecha más cercana</small>
          </span>
          {mode === 'NEXT' ? <Check aria-hidden="true" /> : null}
        </button>
        {!distributed ? (
          <button
            type="button"
            className={mode === 'UPCOMING' ? 'is-selected' : undefined}
            onClick={() => setMode('UPCOMING')}
          >
            <UsersRound aria-hidden="true" />
            <span>
              <strong>Próximas rotaciones</strong>
              <small>Hasta 8 jornadas o 30 turnos</small>
            </span>
            {mode === 'UPCOMING' ? <Check aria-hidden="true" /> : null}
          </button>
        ) : null}
        <button
          type="button"
          className={mode === 'CUSTOM' ? 'is-selected' : undefined}
          onClick={() => {
            if (!customKeys.size && occurrences[0]) {
              setCustomKeys(new Set([occurrences[0].occurrenceKey]));
            }
            setMode('CUSTOM');
          }}
        >
          <CalendarRange aria-hidden="true" />
          <span>
            <strong>Elegir jornadas</strong>
            <small>Máximo 8 fechas</small>
          </span>
          {mode === 'CUSTOM' ? <Check aria-hidden="true" /> : null}
        </button>
      </div>

      {assignmentsQuery.isLoading ? (
        <p className="dutyRotations-shareState">Consultando próximos turnos…</p>
      ) : assignmentsQuery.isError ? (
        <p className="dutyRotations-shareState is-error">
          No se pudieron consultar los turnos. Intenta nuevamente.
        </p>
      ) : !occurrences.length ? (
        <p className="dutyRotations-shareState">
          Esta actividad no tiene próximas jornadas para compartir.
        </p>
      ) : mode === 'CUSTOM' ? (
        <div className="dutyRotations-shareOccurrenceList">
          {occurrences.slice(0, 12).map(occurrence => (
            <label key={occurrence.occurrenceKey}>
              <Checkbox
                checked={customKeys.has(occurrence.occurrenceKey)}
                disabled={
                  !customKeys.has(occurrence.occurrenceKey) &&
                  customKeys.size >= 8
                }
                onCheckedChange={() =>
                  toggleOccurrence(occurrence.occurrenceKey)
                }
              />
              <span>
                <strong>
                  {formatDutyDisplayDate(occurrence.periodStart)}
                  {occurrence.periodStart !== occurrence.periodEnd
                    ? ` – ${formatDutyDisplayDate(occurrence.periodEnd)}`
                    : ''}
                </strong>
                <small>{occurrence.assignments.length} asignaciones</small>
              </span>
            </label>
          ))}
        </div>
      ) : null}

      <p className="dutyRotations-shareSelectionSummary">
        {selectedOccurrences.length
          ? `${selectedOccurrences.length} ${
              selectedOccurrences.length === 1 ? 'jornada' : 'jornadas'
            } seleccionada(s)`
          : 'Selecciona una jornada para continuar'}
      </p>

      <div className="dutyRotations-shareActions">
        <Button variant="outline" onClick={() => getDialogHandle()?.close()}>
          Cerrar
        </Button>
        <Button
          variant="outline"
          disabled={isGenerating || !selectedOccurrences.length}
          onClick={() => runGeneration('DOWNLOAD')}
        >
          <Download aria-hidden="true" /> Descargar PNG
        </Button>
        <Button
          disabled={isGenerating || !selectedOccurrences.length}
          onClick={() => runGeneration('SHARE')}
        >
          <Share2 aria-hidden="true" />
          {isGenerating ? 'Preparando…' : 'Compartir'}
        </Button>
      </div>

      <DutyPlanningSharePages
        ref={captureRootRef}
        duty={duty}
        pages={capturePages}
        distributed={distributed}
        generatedAt={generatedAt}
      />
    </div>
  );
};

export default ShareDutyPlanningDialog;
