import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import Button from '@/components/button/Button';
import LoaderForComponent from '@/components/loaderForComponent/LoaderForComponent';
import useRole from '@/hooks/useRole';
import {
  createCalendarActivity,
  getCalendarItems,
  getMeetingUnitProjectFocus,
  getOfficeProjectModerators,
} from '../../services/officeMeetings.service';
import { getMeetingUnitsOverview } from '../../services/meetingUnitProjects.service';
import { OfficeUnitTreeSelect } from '../../components/OfficeUnitTreeSelect';
import type {
  CalendarActivityPayload,
  CalendarItem,
} from '../../types/officeMeetings.types';
import './calendarWorkspace.css';

type CalendarScope = 'person' | 'unit' | 'project';

const typeLabel: Record<CalendarItem['type'], string> = {
  MEETING: 'Reunion',
  ACTIVITY: 'Actividad',
  COMMITMENT: 'Compromiso',
};

const toDateTimeLocal = (date: Date) => {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
};

const formatDate = (value?: string | null) =>
  value
    ? new Date(value).toLocaleString('es-PE', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'Sin fecha';

export const CalendarWorkspace = () => {
  const queryClient = useQueryClient();
  const { hasAccess: isModuleMod } = useRole('MOD', 'grupos');
  const [scope, setScope] = useState<CalendarScope>('person');
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<number | ''>('');
  const [showForm, setShowForm] = useState(false);
  const [activityForm, setActivityForm] = useState({
    title: '',
    description: '',
    startAt: toDateTimeLocal(new Date()),
    endAt: '',
    allDay: false,
  });

  const overviewQuery = useQuery({
    queryKey: ['meeting-units-overview'],
    queryFn: getMeetingUnitsOverview,
  });

  const units = overviewQuery.data?.data ?? [];
  const effectiveUnitId = selectedUnitId || units[0]?.id || '';

  const projectsQuery = useQuery({
    queryKey: ['meeting-unit-project-focus', effectiveUnitId],
    queryFn: () => getMeetingUnitProjectFocus(effectiveUnitId),
    enabled: !!effectiveUnitId,
  });

  const moderatorsQuery = useQuery({
    queryKey: ['office-project-moderators', effectiveUnitId],
    queryFn: () => getOfficeProjectModerators(effectiveUnitId),
    enabled: !!effectiveUnitId,
  });

  const calendarQuery = useQuery({
    queryKey: [
      'office-calendar',
      scope,
      effectiveUnitId,
      selectedProjectId || undefined,
    ],
    queryFn: () =>
      getCalendarItems({
        scope,
        unitId: scope === 'person' ? undefined : effectiveUnitId,
        projectId:
          scope === 'project' && selectedProjectId
            ? selectedProjectId
            : undefined,
      }),
    enabled: scope === 'person' || !!effectiveUnitId,
  });

  const canManageCurrentUnit =
    isModuleMod || Boolean(moderatorsQuery.data?.canManageCurrentUnit);

  const activeProjects = useMemo(
    () =>
      (projectsQuery.data ?? []).filter(
        item => item.status === 'ACTIVE' && item.isCurrent
      ),
    [projectsQuery.data]
  );

  const createActivityMutation = useMutation({
    mutationFn: () => {
      const payload: CalendarActivityPayload = {
        unitId: effectiveUnitId,
        projectId:
          scope === 'project' && selectedProjectId ? selectedProjectId : null,
        title: activityForm.title.trim(),
        description: activityForm.description.trim() || null,
        startAt: new Date(activityForm.startAt).toISOString(),
        endAt: activityForm.endAt
          ? new Date(activityForm.endAt).toISOString()
          : null,
        allDay: activityForm.allDay,
      };
      return createCalendarActivity(payload);
    },
    onSuccess: () => {
      setShowForm(false);
      setActivityForm({
        title: '',
        description: '',
        startAt: toDateTimeLocal(new Date()),
        endAt: '',
        allDay: false,
      });
      queryClient.invalidateQueries({ queryKey: ['office-calendar'] });
    },
  });

  const items = calendarQuery.data ?? [];

  if (overviewQuery.isLoading) return <LoaderForComponent />;

  return (
    <main className="cal-page">
      <header className="cal-header">
        <div>
          <span>Oficinas y Reuniones</span>
          <h1>Calendario</h1>
          <p>
            Reuniones, actividades y compromisos por persona, unidad o proyecto.
          </p>
        </div>
        {canManageCurrentUnit && (
          <Button
            text="Nueva actividad"
            icon="plus"
            color="primary"
            onClick={() => setShowForm(value => !value)}
          />
        )}
      </header>

      <section className="cal-filters">
        {(['person', 'unit', 'project'] as CalendarScope[]).map(item => (
          <button
            type="button"
            key={item}
            className={scope === item ? 'is-active' : ''}
            onClick={() => setScope(item)}
          >
            {item === 'person'
              ? 'Mi calendario'
              : item === 'unit'
              ? 'Unidad'
              : 'Proyecto'}
          </button>
        ))}
        {scope !== 'person' && (
          <OfficeUnitTreeSelect
            units={units}
            value={effectiveUnitId}
            onValueChange={value => {
              setSelectedUnitId(value);
              setSelectedProjectId('');
            }}
            triggerClassName="flex min-h-9 min-w-56 items-center justify-between rounded-md border border-[var(--border)] bg-white px-3 text-left text-sm text-[var(--text)]"
          />
        )}
        {scope === 'project' && (
          <select
            value={selectedProjectId}
            onChange={event =>
              setSelectedProjectId(
                event.target.value ? Number(event.target.value) : ''
              )
            }
          >
            <option value="">Selecciona proyecto</option>
            {activeProjects.map(focus => (
              <option value={focus.projectId} key={focus.id || focus.projectId}>
                {focus.project.name || focus.project.contract.projectShortName}
              </option>
            ))}
          </select>
        )}
      </section>

      {showForm && canManageCurrentUnit && (
        <section className="cal-form">
          <label>
            Titulo
            <input
              value={activityForm.title}
              onChange={event =>
                setActivityForm(current => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              placeholder="Ej. Revision administrativa semanal"
            />
          </label>
          <label>
            Inicio
            <input
              type="datetime-local"
              value={activityForm.startAt}
              onChange={event =>
                setActivityForm(current => ({
                  ...current,
                  startAt: event.target.value,
                }))
              }
            />
          </label>
          <label>
            Fin
            <input
              type="datetime-local"
              value={activityForm.endAt}
              onChange={event =>
                setActivityForm(current => ({
                  ...current,
                  endAt: event.target.value,
                }))
              }
            />
          </label>
          <label className="cal-formWide">
            Descripcion
            <textarea
              value={activityForm.description}
              onChange={event =>
                setActivityForm(current => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              placeholder="Notas o contexto de la actividad..."
            />
          </label>
          <label className="cal-check">
            <input
              type="checkbox"
              checked={activityForm.allDay}
              onChange={event =>
                setActivityForm(current => ({
                  ...current,
                  allDay: event.target.checked,
                }))
              }
            />
            Todo el dia
          </label>
          <Button
            text={createActivityMutation.isPending ? 'Guardando...' : 'Crear'}
            color="primary"
            disabled={
              !activityForm.title.trim() || createActivityMutation.isPending
            }
            onClick={() => createActivityMutation.mutate()}
          />
        </section>
      )}

      <section className="cal-list">
        {calendarQuery.isLoading && <LoaderForComponent />}
        {items.map(item => (
          <article
            className={`cal-item is-${item.type.toLowerCase()}`}
            key={`${item.type}-${item.sourceId}`}
          >
            <div className="cal-itemIcon">
              {item.type === 'MEETING' ? (
                <CalendarDays size={18} />
              ) : item.type === 'ACTIVITY' ? (
                <Clock size={18} />
              ) : (
                <CheckCircle2 size={18} />
              )}
            </div>
            <div>
              <span>{typeLabel[item.type]}</span>
              <h2>{item.title}</h2>
              <p>
                {item.unit.name}
                {item.project?.name ? ` / ${item.project.name}` : ''}
              </p>
            </div>
            <div className="cal-date">
              <BriefcaseBusiness size={14} />
              {formatDate(item.startAt)}
            </div>
          </article>
        ))}
        {!calendarQuery.isLoading && !items.length && (
          <p className="cal-empty">
            Sin eventos para los filtros seleccionados.
          </p>
        )}
      </section>
    </main>
  );
};
