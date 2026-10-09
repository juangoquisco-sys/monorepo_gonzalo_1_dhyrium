import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Fingerprint, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { AppButton } from '@/components/app-ui/app-button';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import { attendanceCallConfigService } from './services/attendanceCallConfig.service';
import {
  WEEKDAYS,
  WEEKDAY_LABELS,
  type AttendanceCallConfig,
  type AttendanceWeekday,
} from './attendanceCallConfig.types';
import type { AttendanceCaptureMode } from '@/pages/attendance/attendance.types';

const CALL_CONFIG_QUERY_KEY = ['attendance-call-config'] as const;

type DraftCall = {
  position: number;
  title: string;
  captureStartTime: string;
  captureEndTime: string;
  captureMode: AttendanceCaptureMode;
};

const emptyDraft = (position: number): DraftCall => ({
  position,
  title: '',
  captureStartTime: '07:00',
  captureEndTime: '07:15',
  captureMode: 'BIOMETRIC',
});

const TimeInput = ({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) => (
  <input
    type="time"
    value={value}
    disabled={disabled}
    onChange={event => onChange(event.target.value)}
    className="w-28 rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground disabled:opacity-60"
  />
);

const AttendanceCallConfigPage = () => {
  const queryClient = useQueryClient();
  const configQuery = useQuery({
    queryKey: CALL_CONFIG_QUERY_KEY,
    queryFn: () => attendanceCallConfigService.list(),
  });
  const configs = useMemo(
    () => configQuery.data ?? [],
    [configQuery.data]
  );
  const [newDraft, setNewDraft] = useState<DraftCall | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<DraftCall | null>(null);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: CALL_CONFIG_QUERY_KEY });

  const upsertMutation = useMutation({
    mutationFn: ({
      position,
      draft,
    }: {
      position: number;
      draft: DraftCall;
    }) =>
      attendanceCallConfigService.upsert(position, {
        title: draft.title.trim(),
        captureStartTime: draft.captureStartTime,
        captureEndTime: draft.captureEndTime,
        captureMode: draft.captureMode,
      }),
    onSuccess: async () => {
      await invalidate();
      setNewDraft(null);
      setEditingId(null);
      setEditDraft(null);
    },
    onError: () => {
      SnackbarUtilities.error(
        'No se pudo guardar el llamado. Verifique los horarios ingresados.'
      );
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) => attendanceCallConfigService.remove(id),
    onSuccess: invalidate,
    onError: () =>
      SnackbarUtilities.error('No se pudo desactivar el llamado.'),
  });

  const toggleWeekdaySkipMutation = useMutation({
    mutationFn: ({
      config,
      weekday,
    }: {
      config: AttendanceCallConfig;
      weekday: AttendanceWeekday;
    }) => {
      const existing = config.weekdayOverrides.find(
        override => override.weekday === weekday
      );
      const nextSkip = !(existing?.skip ?? false);
      return attendanceCallConfigService.upsertWeekdayOverride(
        config.id,
        weekday,
        { skip: nextSkip }
      );
    },
    onSuccess: invalidate,
    onError: () =>
      SnackbarUtilities.error('No se pudo actualizar la excepción del día.'),
  });

  const nextPosition = (configs.at(-1)?.position ?? 0) + 1;

  const startCreate = () => setNewDraft(emptyDraft(nextPosition));
  const startEdit = (config: AttendanceCallConfig) => {
    setEditingId(config.id);
    setEditDraft({
      position: config.position,
      title: config.title,
      captureStartTime: config.captureStartTime,
      captureEndTime: config.captureEndTime,
      captureMode: config.captureMode,
    });
  };

  const saveNew = () => {
    if (!newDraft) return;
    if (!newDraft.title.trim()) {
      SnackbarUtilities.error('El título del llamado es obligatorio.');
      return;
    }
    upsertMutation.mutate({ position: newDraft.position, draft: newDraft });
  };

  const saveEdit = () => {
    if (!editDraft) return;
    if (!editDraft.title.trim()) {
      SnackbarUtilities.error('El título del llamado es obligatorio.');
      return;
    }
    upsertMutation.mutate({ position: editDraft.position, draft: editDraft });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      <div>
        <h1 className="text-lg font-semibold text-foreground">
          Configuración de llamados de asistencia
        </h1>
        <p className="text-sm text-muted-foreground">
          Define los llamados diarios y sus horarios de captura de huella.
          Los llamados se abren y cierran automáticamente a la hora
          configurada. Marca un día en gris para omitir ese llamado ese día
          de la semana (por ejemplo, sábados sin tercer llamado).
        </p>
      </div>

      {configQuery.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="animate-spin" size={16} /> Cargando
          configuración...
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[46rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">Título</th>
                <th className="px-3 py-2">Inicio</th>
                <th className="px-3 py-2">Cierre</th>
                <th className="px-3 py-2">Modo</th>
                <th className="px-3 py-2">Excepciones por día</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {configs.map(config => {
                const isEditing = editingId === config.id;
                const draft = isEditing ? editDraft : null;
                return (
                  <tr key={config.id} className="border-b border-border/60">
                    <td className="px-3 py-2 align-top font-medium text-foreground">
                      {config.position}
                    </td>
                    <td className="px-3 py-2 align-top">
                      {isEditing && draft ? (
                        <input
                          value={draft.title}
                          onChange={event =>
                            setEditDraft({ ...draft, title: event.target.value })
                          }
                          className="w-40 rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground"
                        />
                      ) : (
                        <span className="font-medium text-foreground">
                          {config.title}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 align-top">
                      {isEditing && draft ? (
                        <TimeInput
                          value={draft.captureStartTime}
                          onChange={value =>
                            setEditDraft({ ...draft, captureStartTime: value })
                          }
                        />
                      ) : (
                        config.captureStartTime
                      )}
                    </td>
                    <td className="px-3 py-2 align-top">
                      {isEditing && draft ? (
                        <TimeInput
                          value={draft.captureEndTime}
                          onChange={value =>
                            setEditDraft({ ...draft, captureEndTime: value })
                          }
                        />
                      ) : (
                        config.captureEndTime
                      )}
                    </td>
                    <td className="px-3 py-2 align-top">
                      {isEditing && draft ? (
                        <select
                          value={draft.captureMode}
                          onChange={event =>
                            setEditDraft({
                              ...draft,
                              captureMode: event.target
                                .value as AttendanceCaptureMode,
                            })
                          }
                          className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground"
                        >
                          <option value="BIOMETRIC">Huella</option>
                          <option value="MANUAL">Manual</option>
                        </select>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          {config.captureMode === 'BIOMETRIC' ? (
                            <Fingerprint size={12} />
                          ) : null}
                          {config.captureMode === 'BIOMETRIC'
                            ? 'Huella'
                            : 'Manual'}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <div className="flex flex-wrap gap-1">
                        {WEEKDAYS.map(weekday => {
                          const override = config.weekdayOverrides.find(
                            item => item.weekday === weekday
                          );
                          const isSkipped = override?.skip ?? false;
                          return (
                            <button
                              key={weekday}
                              type="button"
                              title={
                                isSkipped
                                  ? `Omitido los ${WEEKDAY_LABELS[weekday]}`
                                  : `Se realiza los ${WEEKDAY_LABELS[weekday]}`
                              }
                              disabled={toggleWeekdaySkipMutation.isPending}
                              onClick={() =>
                                toggleWeekdaySkipMutation.mutate({
                                  config,
                                  weekday,
                                })
                              }
                              className={`grid size-7 place-items-center rounded-md border text-[0.65rem] font-semibold transition-colors ${
                                isSkipped
                                  ? 'border-border bg-muted text-muted-foreground line-through'
                                  : 'border-primary/40 bg-primary/10 text-primary'
                              }`}
                            >
                              {WEEKDAY_LABELS[weekday][0]}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-3 py-2 align-top">
                      {isEditing ? (
                        <div className="flex gap-1">
                          <AppButton
                            className="h-7 px-2 text-xs"
                            onClick={saveEdit}
                            disabled={upsertMutation.isPending}
                          >
                            Guardar
                          </AppButton>
                          <AppButton
                            variant="outline"
                            className="h-7 px-2 text-xs"
                            onClick={() => {
                              setEditingId(null);
                              setEditDraft(null);
                            }}
                          >
                            Cancelar
                          </AppButton>
                        </div>
                      ) : (
                        <div className="flex gap-1">
                          <button
                            type="button"
                            title="Editar llamado"
                            onClick={() => startEdit(config)}
                            className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            title="Desactivar llamado"
                            disabled={removeMutation.isPending}
                            onClick={() => removeMutation.mutate(config.id)}
                            className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}

              {newDraft ? (
                <tr className="bg-muted/20">
                  <td className="px-3 py-2 align-top font-medium text-foreground">
                    {newDraft.position}
                  </td>
                  <td className="px-3 py-2 align-top">
                    <input
                      autoFocus
                      value={newDraft.title}
                      placeholder="Título del llamado"
                      onChange={event =>
                        setNewDraft({ ...newDraft, title: event.target.value })
                      }
                      className="w-40 rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground"
                    />
                  </td>
                  <td className="px-3 py-2 align-top">
                    <TimeInput
                      value={newDraft.captureStartTime}
                      onChange={value =>
                        setNewDraft({ ...newDraft, captureStartTime: value })
                      }
                    />
                  </td>
                  <td className="px-3 py-2 align-top">
                    <TimeInput
                      value={newDraft.captureEndTime}
                      onChange={value =>
                        setNewDraft({ ...newDraft, captureEndTime: value })
                      }
                    />
                  </td>
                  <td className="px-3 py-2 align-top">
                    <select
                      value={newDraft.captureMode}
                      onChange={event =>
                        setNewDraft({
                          ...newDraft,
                          captureMode: event.target
                            .value as AttendanceCaptureMode,
                        })
                      }
                      className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground"
                    >
                      <option value="BIOMETRIC">Huella</option>
                      <option value="MANUAL">Manual</option>
                    </select>
                  </td>
                  <td className="px-3 py-2 align-top text-xs text-muted-foreground">
                    Se configura tras crear el llamado
                  </td>
                  <td className="px-3 py-2 align-top">
                    <div className="flex gap-1">
                      <AppButton
                        className="h-7 px-2 text-xs"
                        onClick={saveNew}
                        disabled={upsertMutation.isPending}
                      >
                        Guardar
                      </AppButton>
                      <AppButton
                        variant="outline"
                        className="h-7 px-2 text-xs"
                        onClick={() => setNewDraft(null)}
                      >
                        Cancelar
                      </AppButton>
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}

      {!newDraft ? (
        <AppButton
          variant="outline"
          className="gap-1 text-xs"
          onClick={startCreate}
        >
          <Plus size={14} /> Agregar llamado
        </AppButton>
      ) : null}
    </div>
  );
};

export default AttendanceCallConfigPage;
