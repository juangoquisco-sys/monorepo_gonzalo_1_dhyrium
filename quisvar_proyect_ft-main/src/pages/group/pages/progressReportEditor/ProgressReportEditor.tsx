import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  ArrowLeft,
  Check,
  Eraser,
  Layers,
  Plus,
  RotateCcw,
  Settings,
  Trash2,
  User,
  Users,
} from 'lucide-react';
import Button from '@/components/button/Button';
import LoaderForComponent from '@/components/loaderForComponent/LoaderForComponent';
import useRole from '@/hooks/useRole';
import type { RootState } from '@/store/store.types';
import {
  getOfficeProjectModerators,
  getProgressReport,
  getReportIndexTemplates,
  markProgressReportReady,
  saveProgressReportAsTemplate,
  updateProgressReport,
} from '../../services/officeMeetings.service';
import type {
  ProgressReportItem,
  ProgressReportItemSource,
  ProgressReportItemStatus,
  ReportIndexTemplateScope,
} from '../../types/officeMeetings.types';
import './progressReportEditor.css';

type EditableProgressReportItem = ProgressReportItem & {
  rowKey: string;
};

const statusOptions: {
  value: ProgressReportItemStatus;
  label: string;
}[] = [
  { value: 'NOT_STARTED', label: 'Sin iniciar' },
  { value: 'IN_PROGRESS', label: 'En avance' },
  { value: 'IN_REVIEW', label: 'En revision' },
  { value: 'WAITING_ASITEC', label: 'En ASITEC' },
  { value: 'COMPLETED', label: 'Completado' },
  { value: 'BLOCKED', label: 'Bloqueado' },
];

const sourceLabel: Record<ProgressReportItemSource, string> = {
  PROJECT_ONLY: 'Proyecto',
  ASITEC: 'ASITEC',
  REUSABLE_TEMPLATE: 'Plantilla',
  CUSTOM: 'Personalizado',
};

const presenterOptions = [
  { value: 'USER', label: 'Persona', icon: User },
  { value: 'TEAM', label: 'Equipo', icon: Users },
  { value: 'GROUP', label: 'Grupo', icon: Layers },
] as const;

const createRowKey = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const withRowKey = (
  item: ProgressReportItem,
  index: number
): EditableProgressReportItem => ({
  ...item,
  rowKey: item.id ?? `${index}-${createRowKey()}`,
});

const getDefaultItem = (): EditableProgressReportItem => ({
  rowKey: createRowKey(),
  name: 'Nuevo item de avance',
  source: 'CUSTOM',
  status: 'IN_PROGRESS',
  progress: 0,
  observations: '',
});

const ProgressReportEditor = () => {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const sessionUserId = useSelector((state: RootState) => state.userSession.id);
  const { hasAccess: isModuleMod } = useRole('MOD', 'grupos');
  const [items, setItems] = useState<EditableProgressReportItem[]>([]);
  const [title, setTitle] = useState('');
  const [presenterType, setPresenterType] = useState<'USER' | 'TEAM' | 'GROUP'>(
    'USER'
  );
  const [participantUserIds, setParticipantUserIds] = useState<number[]>([]);
  const [observations, setObservations] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateScope, setTemplateScope] =
    useState<ReportIndexTemplateScope>('PERSONAL');

  const reportQuery = useQuery({
    queryKey: ['progress-reports', reportId],
    queryFn: () => getProgressReport(reportId!),
    enabled: !!reportId,
  });

  const indexTemplatesQuery = useQuery({
    queryKey: ['report-index-templates', reportQuery.data?.unitId],
    queryFn: () =>
      getReportIndexTemplates({ unitId: reportQuery.data?.unitId }),
    enabled: !!reportQuery.data?.unitId,
  });

  const membersQuery = useQuery({
    queryKey: ['office-project-moderators', reportQuery.data?.unitId],
    queryFn: () => getOfficeProjectModerators(reportQuery.data!.unitId),
    enabled: !!reportQuery.data?.unitId,
  });

  useEffect(() => {
    if (!reportQuery.data) return;
    setTitle(reportQuery.data.title ?? '');
    setPresenterType(reportQuery.data.presenterType);
    setObservations(reportQuery.data.observations ?? '');
    setParticipantUserIds(
      reportQuery.data.participants?.length
        ? reportQuery.data.participants.map(participant => participant.userId)
        : reportQuery.data.presenterUserId
        ? [reportQuery.data.presenterUserId]
        : sessionUserId
        ? [sessionUserId]
        : []
    );
    setItems(
      reportQuery.data.items.length
        ? reportQuery.data.items.map(withRowKey)
        : [getDefaultItem()]
    );
  }, [reportQuery.data, sessionUserId]);

  const averageProgress = useMemo(() => {
    if (!items.length) return 0;
    return Math.round(
      items.reduce((acc, item) => acc + Number(item.progress || 0), 0) /
        items.length
    );
  }, [items]);

  const payload = {
    title,
    presenterType,
    presenterUserId:
      presenterType === 'USER'
        ? reportQuery.data?.presenterUserId || sessionUserId
        : null,
    participantUserIds: presenterType === 'TEAM' ? participantUserIds : [],
    overallProgress: averageProgress,
    observations,
    status: 'DRAFT' as const,
    items: items.map((item, index) => ({
      name: item.name,
      source: item.source,
      status: item.status,
      progress: Number(item.progress || 0),
      observations: item.observations,
      responsible: item.responsible,
      order: index,
    })),
  };

  const saveMutation = useMutation({
    mutationFn: () => updateProgressReport(reportId!, payload),
    onSuccess: data => {
      queryClient.setQueryData(['progress-reports', reportId], data);
      queryClient.invalidateQueries({ queryKey: ['progress-reports'] });
    },
  });

  const readyMutation = useMutation({
    mutationFn: async () => {
      await updateProgressReport(reportId!, payload);
      return markProgressReportReady(reportId!);
    },
    onSuccess: data => {
      queryClient.setQueryData(['progress-reports', reportId], data);
      queryClient.invalidateQueries({ queryKey: ['progress-reports'] });
      navigate('/grupos/mis-informes');
    },
  });

  const saveTemplateMutation = useMutation({
    mutationFn: () =>
      saveProgressReportAsTemplate(reportId!, {
        name: templateName,
        scope: templateScope,
        unitId: templateScope === 'UNIT' ? reportQuery.data?.unitId : null,
      }),
    onSuccess: () => {
      setTemplateName('');
      setSaveTemplateOpen(false);
      queryClient.invalidateQueries({ queryKey: ['report-index-templates'] });
    },
  });

  const updateItem = (
    index: number,
    key: keyof ProgressReportItem,
    value: string | number
  ) => {
    setItems(current =>
      current.map((item, currentIndex) =>
        currentIndex === index ? { ...item, [key]: value } : item
      )
    );
  };

  const addCustomRow = () =>
    setItems(current => [...current, getDefaultItem()]);

  const removeRow = (index: number) => {
    setItems(current =>
      current.filter((_, currentIndex) => currentIndex !== index)
    );
  };

  const clearRows = () => setItems([]);

  const importIndex = () => {
    const template = indexTemplatesQuery.data?.find(
      item => item.id === selectedTemplateId
    );
    if (!template) return;
    setItems(current => {
      const names = new Set(current.map(item => item.name.toLowerCase()));
      const rows = template.items
        .filter(item => !names.has(item.name.toLowerCase()))
        .sort((first, second) => first.order - second.order)
        .map(item => ({
          rowKey: createRowKey(),
          name: item.name,
          source: item.source,
          status: item.defaultStatus,
          progress: item.defaultProgress,
          observations: item.defaultObservations ?? '',
        }));
      return [...current, ...rows];
    });
  };

  const toggleParticipant = (userId: number) => {
    setParticipantUserIds(current =>
      current.includes(userId)
        ? current.filter(currentId => currentId !== userId)
        : [...current, userId]
    );
  };

  if (reportQuery.isLoading) return <LoaderForComponent />;

  const report = reportQuery.data;
  if (!report) return null;

  const members = membersQuery.data?.memberships ?? [];
  const canManageOffice =
    isModuleMod || Boolean(membersQuery.data?.canManageCurrentUnit);
  const indexTemplates = indexTemplatesQuery.data ?? [];

  return (
    <main className="pre-page">
      <header className="pre-header">
        <div className="pre-title">
          <button
            type="button"
            onClick={() => navigate('/grupos/mis-informes')}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1>Preparar informe de avance</h1>
            <p>
              {report.project.name} /{' '}
              {report.project.contract.projectShortName ||
                report.project.contract.cui}
            </p>
          </div>
        </div>
        <div className="pre-actions">
          <Button
            text="Guardar borrador"
            color="grayLigth"
            textColor="secondary"
            size="sm"
            disabled={saveMutation.isPending || readyMutation.isPending}
            onClick={() => saveMutation.mutate()}
          />
          <Button
            text="Marcar listo para reunion"
            color="primary"
            size="sm"
            leftIcon={<Check size={17} />}
            disabled={saveMutation.isPending || readyMutation.isPending}
            onClick={() => readyMutation.mutate()}
          />
        </div>
      </header>

      {report.status === 'READY' && (
        <p className="pre-readyWarning">
          Este informe ya esta listo. Si cambias el tipo de presentador, volvera
          a borrador para evitar duplicados.
        </p>
      )}

      <section className="pre-layout">
        <article className="pre-matrix">
          <div className="pre-matrixHeader">
            <div>
              <Layers size={16} />
              <h2>Matriz del informe</h2>
              <span>Avance promedio: {averageProgress}%</span>
            </div>
            <div>
              <Button
                text="Fila personalizada"
                color="grayLigth"
                textColor="secondary"
                leftIcon={<Plus size={15} />}
                onClick={addCustomRow}
              />
              <Button
                text="Limpiar todo"
                color="grayLigth"
                textColor="danger"
                leftIcon={<Eraser size={15} />}
                disabled={!items.length}
                onClick={clearRows}
              />
              <div className="pre-importIndex">
                <select
                  value={selectedTemplateId}
                  onChange={event => setSelectedTemplateId(event.target.value)}
                >
                  <option value="">Seleccionar indice</option>
                  {indexTemplates.map(template => (
                    <option value={template.id} key={template.id}>
                      {template.name} ({template.scope})
                    </option>
                  ))}
                </select>
              </div>
              <Button
                text="Importar indice"
                color="secondary"
                leftIcon={<RotateCcw size={15} />}
                disabled={!selectedTemplateId}
                onClick={importIndex}
              />
            </div>
          </div>

          <div className="pre-table">
            <div className="pre-row is-head">
              <span>Actividad / item</span>
              <span>Fuente</span>
              <span>Estado</span>
              <span>Avance</span>
              <span>Observaciones</span>
              <span>Acciones</span>
            </div>
            {items.map((item, index) => (
              <div className="pre-row" key={item.rowKey}>
                <input
                  value={item.name}
                  onChange={event =>
                    updateItem(index, 'name', event.target.value)
                  }
                />
                <b className={`pre-source is-${item.source.toLowerCase()}`}>
                  {sourceLabel[item.source]}
                </b>
                <select
                  value={item.status}
                  onChange={event =>
                    updateItem(
                      index,
                      'status',
                      event.target.value as ProgressReportItemStatus
                    )
                  }
                >
                  {statusOptions.map(option => (
                    <option value={option.value} key={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <label className="pre-progressInput">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={item.progress}
                    onChange={event =>
                      updateItem(index, 'progress', Number(event.target.value))
                    }
                  />
                  %
                </label>
                <input
                  value={item.observations ?? ''}
                  onChange={event =>
                    updateItem(index, 'observations', event.target.value)
                  }
                  placeholder="Observacion breve"
                />
                <button
                  type="button"
                  className="pre-deleteRow"
                  aria-label={`Eliminar fila ${item.name || index + 1}`}
                  title="Eliminar fila"
                  onClick={() => removeRow(index)}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
            {!items.length && (
              <div className="pre-emptyRows">
                <p>No hay filas en la matriz.</p>
                <button type="button" onClick={addCustomRow}>
                  Crear fila personalizada
                </button>
              </div>
            )}
          </div>
        </article>

        <aside className="pre-settings">
          <div className="pre-settingsTitle">
            <Settings size={16} />
            <h2>Configuracion del informe</h2>
          </div>
          <section>
            <h3>Nombre del borrador</h3>
            <input
              className="pre-titleInput"
              value={title}
              onChange={event => setTitle(event.target.value)}
              placeholder="Ej. Avance semanal - especialidad sanitaria"
            />
            <small className="pre-projectHint">
              Proyecto: {report.project.name}
            </small>
          </section>
          <section>
            <h3>Presentador</h3>
            <div className="pre-presenterGrid">
              {presenterOptions.map(option => {
                const Icon = option.icon;
                return (
                  <button
                    type="button"
                    key={option.value}
                    className={
                      presenterType === option.value ? 'is-active' : ''
                    }
                    disabled={option.value === 'GROUP' && !canManageOffice}
                    onClick={() => {
                      if (option.value === 'GROUP' && !canManageOffice) return;
                      setPresenterType(option.value);
                    }}
                  >
                    <Icon size={18} />
                    {option.label}
                  </button>
                );
              })}
            </div>
          </section>
          {presenterType === 'TEAM' && (
            <section>
              <h3>Integrantes del equipo</h3>
              <div className="pre-memberList">
                {members.map(member => {
                  const profile = member.user.profile;
                  const fullName = profile
                    ? `${profile.firstName} ${profile.lastName}`
                    : member.user.email || `Usuario ${member.userId}`;
                  return (
                    <label
                      className="pre-memberOption"
                      key={member.id}
                      title={fullName}
                    >
                      <input
                        type="checkbox"
                        checked={participantUserIds.includes(member.userId)}
                        onChange={() => toggleParticipant(member.userId)}
                      />
                      <span>{fullName}</span>
                    </label>
                  );
                })}
                {!members.length && (
                  <p className="pre-muted">Esta oficina no tiene miembros.</p>
                )}
              </div>
            </section>
          )}
          {presenterType === 'GROUP' && (
            <section className="pre-metrics">
              <h3>Informe de oficina</h3>
              <p>
                <span>Oficina</span>
                <b>{report.unit.name}</b>
              </p>
            </section>
          )}
          <section>
            <h3>Observacion general</h3>
            <textarea
              value={observations}
              onChange={event => setObservations(event.target.value)}
              placeholder="Resumen o bloqueos principales"
            />
          </section>
          <section className="pre-metrics">
            <h3>Metricas actuales</h3>
            <p>
              <span>CUI</span>
              <b>{report.project.contract.cui}</b>
            </p>
            <p>
              <span>Items</span>
              <b>{items.length}</b>
            </p>
            <p>
              <span>Estado</span>
              <b>{report.status === 'READY' ? 'Listo' : 'Borrador'}</b>
            </p>
          </section>
          <section className="pre-templateSave">
            <h3>Reutilizar matriz</h3>
            {!saveTemplateOpen ? (
              <button type="button" onClick={() => setSaveTemplateOpen(true)}>
                Guardar matriz como indice
              </button>
            ) : (
              <>
                <input
                  value={templateName}
                  onChange={event => setTemplateName(event.target.value)}
                  placeholder="Nombre del indice"
                />
                <div className="pre-scopeGrid">
                  <button
                    type="button"
                    className={templateScope === 'PERSONAL' ? 'is-active' : ''}
                    onClick={() => setTemplateScope('PERSONAL')}
                  >
                    Personal
                  </button>
                  <button
                    type="button"
                    className={templateScope === 'UNIT' ? 'is-active' : ''}
                    disabled={!canManageOffice}
                    onClick={() => setTemplateScope('UNIT')}
                  >
                    Oficina
                  </button>
                  <button
                    type="button"
                    className={templateScope === 'GLOBAL' ? 'is-active' : ''}
                    disabled={!isModuleMod}
                    onClick={() => setTemplateScope('GLOBAL')}
                  >
                    Global
                  </button>
                </div>
                <Button
                  text="Guardar indice"
                  color="primary"
                  full
                  disabled={
                    !templateName.trim() || saveTemplateMutation.isPending
                  }
                  onClick={() => saveTemplateMutation.mutate()}
                />
              </>
            )}
          </section>
        </aside>
      </section>
    </main>
  );
};

export default ProgressReportEditor;
