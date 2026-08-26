import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  Check,
  Clock3,
  FileText,
  CircleHelp,
  Search,
  UserPlus,
  X,
} from 'lucide-react';
import { useSelector } from 'react-redux';
import { axiosInstance } from '@/services/axiosInstance';
import useRole from '@/hooks/useRole';
import type { RootState } from '@/store/store.types';
import { useProductionBonusUsers } from '../../hooks/useProcedureUserOptions';
import './ProductionBonusPage.css';

type ProductionBonusType =
  | 'HORAS_EXTRA'
  | 'DOMINGO'
  | 'MADRUGADA'
  | 'CORRIDO'
  | 'OTRO';

type ProductionBonusStatus =
  | 'ASIGNADO'
  | 'EN_CURSO'
  | 'PROCESO'
  | 'APROBADO'
  | 'RECHAZADO'
  | 'OBSERVADO'
  | 'PENDIENTE_VALIDACION'
  | 'VALIDADO'
  | 'ANULADO'
  | 'LIQUIDADO';

type BonusPerson = {
  id: number;
  profile?: {
    firstName: string;
    lastName: string;
    dni: string;
  };
};

type ProductionBonus = {
  id: string;
  userId: number;
  origin: 'ASSIGNED_BY_MANAGER' | 'REQUESTED_BY_USER' | 'REGISTERED_BY_ADMIN';
  type: ProductionBonusType;
  status: ProductionBonusStatus;
  reason: string;
  feedback?: string | null;
  validationFeedback?: string | null;
  startDate: string;
  endDate: string;
  assignedHours?: number;
  requestedHours?: number;
  approvedHours?: number;
  executedHours?: number;
  validatedHours?: number;
  createdAt: string;
  user: BonusPerson;
  assignedBy?: BonusPerson | null;
  requestedBy?: BonusPerson | null;
  validatedBy?: BonusPerson | null;
};

type BonusSummary = {
  assigned: number;
  inValidation: number;
  regularizations: number;
  validated: number;
  liquidated: number;
};

type BonusResponse = {
  items: ProductionBonus[];
  total: number;
  page: number;
  pageSize: number;
  summary: BonusSummary;
};

const TYPE_LABEL: Record<ProductionBonusType, string> = {
  HORAS_EXTRA: 'Horas extra',
  DOMINGO: 'Domingo',
  MADRUGADA: 'Amanecida',
  CORRIDO: 'Jornada extendida',
  OTRO: 'Otro',
};

const STATUS_LABEL: Record<ProductionBonusStatus, string> = {
  ASIGNADO: 'Asignado',
  EN_CURSO: 'En curso',
  PROCESO: 'Regularizacion pendiente',
  APROBADO: 'Regularizacion aprobada',
  RECHAZADO: 'Rechazado',
  OBSERVADO: 'Observado',
  PENDIENTE_VALIDACION: 'Por validar',
  VALIDADO: 'Validado',
  ANULADO: 'Anulado',
  LIQUIDADO: 'Liquidado',
};

const STATUS_OPTIONS_BY_VIEW: Record<
  'mine' | 'assignments' | 'regularizations' | 'validation' | 'report',
  ProductionBonusStatus[]
> = {
  mine: [
    'ASIGNADO',
    'PENDIENTE_VALIDACION',
    'VALIDADO',
    'LIQUIDADO',
    'RECHAZADO',
  ],
  assignments: ['ASIGNADO', 'PENDIENTE_VALIDACION', 'VALIDADO', 'ANULADO'],
  regularizations: ['PROCESO', 'APROBADO', 'RECHAZADO', 'OBSERVADO'],
  validation: ['PENDIENTE_VALIDACION', 'VALIDADO'],
  report: ['VALIDADO', 'LIQUIDADO'],
};

const todayInput = () => new Date().toISOString().slice(0, 16);

const addHoursInput = (hours: number) => {
  const date = new Date();
  date.setHours(date.getHours() + hours);
  return date.toISOString().slice(0, 16);
};

const personName = (person?: BonusPerson | null) => {
  if (!person?.profile) return '---';
  return `${person.profile.firstName} ${person.profile.lastName}`;
};

type UserPickerOption = {
  id: number;
  name: string;
  dni: string;
};

const userOptionName = (user: UserPickerOption) => `${user.name} - ${user.dni}`;

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('es-PE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
    .format(new Date(value))
    .replace('.', '');

const getHours = (startDate: string, endDate: string) => {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 0;
  return Math.round(((end - start) / 3_600_000) * 100) / 100;
};

const isSundayInput = (value: string) => {
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.getDay() === 0;
};

const nextSundayInput = (baseValue: string) => {
  const date = new Date(baseValue || new Date());
  const diff = (7 - date.getDay()) % 7;
  date.setDate(date.getDate() + diff);
  return date.toISOString().slice(0, 16);
};

const moveRangeToSunday = (startDate: string, endDate: string) => {
  const currentStart = new Date(startDate);
  const currentEnd = new Date(endDate);
  const duration =
    !Number.isNaN(currentStart.getTime()) &&
    !Number.isNaN(currentEnd.getTime()) &&
    currentEnd > currentStart
      ? currentEnd.getTime() - currentStart.getTime()
      : 2 * 3_600_000;
  const nextStart = new Date(nextSundayInput(startDate));
  const nextEnd = new Date(nextStart.getTime() + duration);

  return {
    startDate: nextStart.toISOString().slice(0, 16),
    endDate: nextEnd.toISOString().slice(0, 16),
  };
};

const withAmanecidaNote = (value: string, restUntil?: string) => {
  if (!restUntil) return value;
  const note = `Descanso compensatorio autorizado hasta las ${restUntil}.`;
  return value ? `${value}\n${note}` : note;
};

const HelpTooltip = ({
  text,
  align = 'center',
}: {
  text: string;
  align?: 'center' | 'left' | 'right';
}) => (
  <span className={`bonus-help bonus-help-${align}`}>
    <CircleHelp size={15} />
    <span className="bonus-help-text">{text}</span>
  </span>
);

export const ProductionBonusPage = () => {
  const { id: currentUserId } = useSelector(
    (state: RootState) => state.userSession
  );
  const { hasAccess: isMod } = useRole('MOD', 'tramites', 'bono-produccion');
  const { data: users = [] } = useProductionBonusUsers({ enabled: isMod });
  const [activeView, setActiveView] = useState<
    'mine' | 'assignments' | 'regularizations' | 'validation' | 'report'
  >(isMod ? 'assignments' : 'mine');
  const [items, setItems] = useState<ProductionBonus[]>([]);
  const [summary, setSummary] = useState<BonusSummary>({
    assigned: 0,
    inValidation: 0,
    regularizations: 0,
    validated: 0,
    liquidated: 0,
  });
  const [total, setTotal] = useState(0);
  const [searchName, setSearchName] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [showRegularizeForm, setShowRegularizeForm] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [assignmentForm, setAssignmentForm] = useState({
    type: 'HORAS_EXTRA' as ProductionBonusType,
    reason: '',
    startDate: todayInput(),
    endDate: addHoursInput(2),
    restUntil: '',
    feedback: '',
  });
  const [regularizationForm, setRegularizationForm] = useState({
    type: 'HORAS_EXTRA' as ProductionBonusType,
    reason: '',
    startDate: todayInput(),
    endDate: addHoursInput(2),
    restUntil: '',
  });
  const [validationValues, setValidationValues] = useState<
    Record<string, string>
  >({});

  const derivedStatus = useMemo(() => {
    if (statusFilter) return statusFilter;
    if (activeView === 'regularizations') return 'PROCESO';
    if (activeView === 'validation') return 'PENDIENTE_VALIDACION';
    if (activeView === 'report') return 'VALIDADO';
    return '';
  }, [activeView, statusFilter]);
  const statusOptions = STATUS_OPTIONS_BY_VIEW[activeView];

  const fetchData = () => {
    const params = new URLSearchParams();
    params.set('page', '1');
    params.set('pageSize', '20');
    if (!isMod || activeView === 'mine') params.set('mine', 'true');
    if (derivedStatus) params.set('status', derivedStatus);
    if (typeFilter) params.set('type', typeFilter);
    if (searchName.trim()) params.set('searchName', searchName.trim());

    axiosInstance
      .get<BonusResponse>(`/production-bonus?${params.toString()}`)
      .then(res => {
        setItems(res.data.items);
        setTotal(res.data.total);
        setSummary(res.data.summary);
      });
  };

  useEffect(() => {
    fetchData();
  }, [activeView, derivedStatus, typeFilter]);

  const filteredUsers = useMemo(() => {
    const search = userSearch.trim().toLowerCase();
    if (!search) return users.slice(0, 80);

    return users
      .filter(user => {
        const value = `${user.name} ${user.dni}`.toLowerCase();
        return value.includes(search);
      })
      .slice(0, 80);
  }, [users, userSearch]);
  const selectedUsers = useMemo(
    () => users.filter(user => selectedUserIds.includes(user.id)),
    [users, selectedUserIds]
  );
  const assignmentHours = getHours(
    assignmentForm.startDate,
    assignmentForm.endDate
  );
  const regularizationHours = getHours(
    regularizationForm.startDate,
    regularizationForm.endDate
  );
  const activeType = showAssignForm
    ? assignmentForm.type
    : regularizationForm.type;
  const activeStartDate = showAssignForm
    ? assignmentForm.startDate
    : regularizationForm.startDate;
  const sundayInvalid =
    activeType === 'DOMINGO' && !isSundayInput(activeStartDate);

  const submitAssignment = (event: React.FormEvent) => {
    event.preventDefault();
    const { restUntil, ...payload } = assignmentForm;
    axiosInstance
      .post('/production-bonus/assign', {
        ...payload,
        feedback: withAmanecidaNote(
          assignmentForm.feedback,
          assignmentForm.type === 'MADRUGADA' ? restUntil : undefined
        ),
        usersIds: selectedUserIds,
      })
      .then(() => {
        setShowAssignForm(false);
        setSelectedUserIds([]);
        setUserSearch('');
        setAssignmentForm({
          type: 'HORAS_EXTRA',
          reason: '',
          startDate: todayInput(),
          endDate: addHoursInput(2),
          restUntil: '',
          feedback: '',
        });
        fetchData();
      });
  };

  const submitRegularization = (event: React.FormEvent) => {
    event.preventDefault();
    const { restUntil, ...payload } = regularizationForm;
    axiosInstance
      .post('/production-bonus/regularize', {
        ...payload,
        reason: withAmanecidaNote(
          regularizationForm.reason,
          regularizationForm.type === 'MADRUGADA' ? restUntil : undefined
        ),
        userId: currentUserId,
        requestedHours: regularizationHours,
      })
      .then(() => {
        setShowRegularizeForm(false);
        setRegularizationForm({
          type: 'HORAS_EXTRA',
          reason: '',
          startDate: todayInput(),
          endDate: addHoursInput(2),
          restUntil: '',
        });
        fetchData();
      });
  };

  const updateStatus = (
    bonus: ProductionBonus,
    status: ProductionBonusStatus
  ) => {
    axiosInstance
      .patch(`/production-bonus/status/${bonus.id}`, { status })
      .then(fetchData);
  };

  const validateBonus = (bonus: ProductionBonus) => {
    const value = Number(
      validationValues[bonus.id] ||
        bonus.executedHours ||
        bonus.approvedHours ||
        bonus.assignedHours ||
        bonus.requestedHours
    );
    axiosInstance
      .patch(`/production-bonus/validate/${bonus.id}`, {
        validatedHours: value,
        executedHours: value,
        validationFeedback: 'Validado desde Bono por produccion',
      })
      .then(fetchData);
  };

  const toggleUser = (userId: number) => {
    setSelectedUserIds(value =>
      value.includes(userId)
        ? value.filter(id => id !== userId)
        : [...value, userId]
    );
  };

  const changeView = (
    view: 'mine' | 'assignments' | 'regularizations' | 'validation' | 'report'
  ) => {
    setActiveView(view);
    setStatusFilter('');
  };

  const renderFormOverlay = () => {
    if (!showAssignForm && !showRegularizeForm) return null;
    const isAssignment = showAssignForm;
    return (
      <div className="bonus-modal-backdrop">
        <form
          className="bonus-modal"
          onSubmit={isAssignment ? submitAssignment : submitRegularization}
        >
          <div className="bonus-modal-header">
            <div>
              <strong className="bonus-title-with-help">
                {isAssignment
                  ? 'Asignar bono por produccion'
                  : 'Regularizar bono'}
              </strong>
              <span>
                {isAssignment
                  ? 'Autoriza a uno o varios trabajadores para laborar fuera de horario.'
                  : 'Registra un trabajo extraordinario ya realizado y deja sustento para revision.'}
              </span>
            </div>
            <button
              type="button"
              className="bonus-icon-btn"
              title="Cerrar"
              onClick={() => {
                setShowAssignForm(false);
                setShowRegularizeForm(false);
                setUserSearch('');
              }}
            >
              <X size={18} />
            </button>
          </div>

          {isAssignment && (
            <div className="bonus-field">
              <label>
                Trabajadores
                <HelpTooltip text="Selecciona una o varias personas. Cada trabajador tendrá su propio registro para validar horas por separado." />
              </label>
              <div className="bonus-user-search-panel">
                <div className="bonus-user-search">
                  <Search size={16} />
                  <input
                    value={userSearch}
                    onChange={event => setUserSearch(event.target.value)}
                    placeholder="Buscar trabajador por nombre, apellido o DNI"
                  />
                  {userSearch && (
                    <button
                      type="button"
                      className="bonus-user-search-clear"
                      aria-label="Limpiar busqueda"
                      onClick={() => setUserSearch('')}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                <span>
                  {filteredUsers.length} resultados visibles
                  {selectedUserIds.length > 0 &&
                    ` · ${selectedUserIds.length} seleccionados`}
                </span>
              </div>
              {selectedUsers.length > 0 && (
                <div className="bonus-selected-users">
                  {selectedUsers.map(user => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => toggleUser(user.id)}
                      title="Quitar trabajador"
                    >
                      <Check size={13} />
                      <span>{userOptionName(user)}</span>
                      <X size={13} />
                    </button>
                  ))}
                </div>
              )}
              <div className="bonus-user-picker">
                {filteredUsers.length === 0 ? (
                  <div className="bonus-user-empty">
                    No se encontraron trabajadores con ese texto.
                  </div>
                ) : (
                  filteredUsers.map(user => (
                    <button
                      key={user.id}
                      type="button"
                      className={
                        selectedUserIds.includes(user.id)
                          ? 'bonus-user-option is-selected'
                          : 'bonus-user-option'
                      }
                      onClick={() => toggleUser(user.id)}
                      title={userOptionName(user)}
                    >
                      {selectedUserIds.includes(user.id) && <Check size={14} />}
                      <span>{userOptionName(user)}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          <div className="bonus-form-grid">
            <div className="bonus-field">
              <label>
                Tipo
                <HelpTooltip text="Clasifica el caso principal: horas extra, domingo, amanecida, jornada extendida u otro." />
              </label>
              <select
                value={
                  isAssignment ? assignmentForm.type : regularizationForm.type
                }
                onChange={event =>
                  isAssignment
                    ? setAssignmentForm({
                        ...assignmentForm,
                        ...(event.target.value === 'DOMINGO'
                          ? moveRangeToSunday(
                              assignmentForm.startDate,
                              assignmentForm.endDate
                            )
                          : {}),
                        type: event.target.value as ProductionBonusType,
                      })
                    : setRegularizationForm({
                        ...regularizationForm,
                        ...(event.target.value === 'DOMINGO'
                          ? moveRangeToSunday(
                              regularizationForm.startDate,
                              regularizationForm.endDate
                            )
                          : {}),
                        type: event.target.value as ProductionBonusType,
                      })
                }
              >
                {Object.entries(TYPE_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="bonus-field">
              <label>
                Inicio
                <HelpTooltip text="Fecha y hora en que empieza el periodo extraordinario asignado o regularizado." />
              </label>
              <input
                type="datetime-local"
                value={
                  isAssignment
                    ? assignmentForm.startDate
                    : regularizationForm.startDate
                }
                onChange={event =>
                  isAssignment
                    ? setAssignmentForm({
                        ...assignmentForm,
                        startDate: event.target.value,
                      })
                    : setRegularizationForm({
                        ...regularizationForm,
                        startDate: event.target.value,
                      })
                }
              />
            </div>
            <div className="bonus-field">
              <label>
                Fin
                <HelpTooltip text="Fecha y hora en que termina el periodo. Puede cruzar medianoche si se trata de amanecida o jornada extendida." />
              </label>
              <input
                type="datetime-local"
                value={
                  isAssignment
                    ? assignmentForm.endDate
                    : regularizationForm.endDate
                }
                onChange={event =>
                  isAssignment
                    ? setAssignmentForm({
                        ...assignmentForm,
                        endDate: event.target.value,
                      })
                    : setRegularizationForm({
                        ...regularizationForm,
                        endDate: event.target.value,
                      })
                }
              />
            </div>
          </div>

          {activeType === 'DOMINGO' && (
            <div
              className={
                sundayInvalid
                  ? 'bonus-context-note is-warning'
                  : 'bonus-context-note'
              }
            >
              <CalendarClock size={16} />
              <span>
                {sundayInvalid
                  ? 'Para el tipo Domingo, la fecha de inicio debe caer domingo.'
                  : 'Tipo Domingo confirmado: la fecha de inicio cae domingo.'}
              </span>
            </div>
          )}

          {activeType === 'MADRUGADA' && (
            <div className="bonus-context-note">
              <Clock3 size={16} />
              <span>
                Amanecida puede incluir descanso compensatorio posterior, como
                autorizacion para descansar hasta las 10:00.
              </span>
              <input
                type="time"
                value={
                  isAssignment
                    ? assignmentForm.restUntil
                    : regularizationForm.restUntil
                }
                onChange={event =>
                  isAssignment
                    ? setAssignmentForm({
                        ...assignmentForm,
                        restUntil: event.target.value,
                      })
                    : setRegularizationForm({
                        ...regularizationForm,
                        restUntil: event.target.value,
                      })
                }
                aria-label="Descanso compensatorio autorizado hasta"
              />
            </div>
          )}

          <div className="bonus-field">
            <label>
              Motivo
              <HelpTooltip text="Describe la necesidad operativa. En regularizaciones, explica por qué se trabajó sin asignación previa." />
            </label>
            <textarea
              rows={3}
              value={
                isAssignment ? assignmentForm.reason : regularizationForm.reason
              }
              onChange={event =>
                isAssignment
                  ? setAssignmentForm({
                      ...assignmentForm,
                      reason: event.target.value,
                    })
                  : setRegularizationForm({
                      ...regularizationForm,
                      reason: event.target.value,
                    })
              }
              placeholder="Describe la necesidad operativa o el sustento."
              required
            />
          </div>

          {isAssignment && (
            <div className="bonus-field">
              <label>
                Observacion interna
                <HelpTooltip text="Nota opcional para el rol autorizado. Ayuda a explicar condiciones, autorizacion o contexto de la asignacion." />
              </label>
              <input
                value={assignmentForm.feedback}
                onChange={event =>
                  setAssignmentForm({
                    ...assignmentForm,
                    feedback: event.target.value,
                  })
                }
                placeholder="Opcional"
              />
            </div>
          )}

          <div className="bonus-form-summary">
            <Clock3 size={18} />
            <span>
              {isAssignment ? assignmentHours : regularizationHours || 0} horas
              estimadas
            </span>
            {isAssignment && (
              <span>{selectedUserIds.length} trabajadores seleccionados</span>
            )}
          </div>

          <div className="bonus-modal-actions">
            <button
              type="button"
              className="bonus-secondary-btn"
              onClick={() => {
                setShowAssignForm(false);
                setShowRegularizeForm(false);
                setUserSearch('');
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bonus-primary-btn"
              disabled={
                (isAssignment && selectedUserIds.length === 0) || sundayInvalid
              }
            >
              <Check size={16} />
              {isAssignment ? 'Asignar' : 'Enviar regularizacion'}
            </button>
          </div>
        </form>
      </div>
    );
  };

  return (
    <section className="production-bonus-page">
      <header className="bonus-toolbar">
        <div>
          <h2 className="bonus-title-with-help">
            Bono por produccion
            <HelpTooltip
              align="right"
              text={
                isMod
                  ? 'Módulo para autorizar, controlar y validar trabajo fuera de horario.'
                  : 'Aquí ves tus bonos asignados y el historial que te corresponde.'
              }
            />
          </h2>
          <p>
            Control de amanecidas, domingos, jornadas extendidas y horas extra.
          </p>
        </div>
        <div className="bonus-toolbar-actions">
          <button
            type="button"
            className="bonus-secondary-btn"
            onClick={() => setShowRegularizeForm(true)}
          >
            <FileText size={16} />
            Regularizar
          </button>
          {isMod && (
            <button
              type="button"
              className="bonus-primary-btn"
              onClick={() => setShowAssignForm(true)}
            >
              <UserPlus size={16} />
              Asignar bono
            </button>
          )}
        </div>
      </header>

      <div className="bonus-summary-grid">
        <div className="bonus-summary-item">
          <CalendarClock size={18} />
          <span>Asignados</span>
          <strong>{summary.assigned}</strong>
        </div>
        <div className="bonus-summary-item">
          <AlertTriangle size={18} />
          <span>Por validar</span>
          <strong>{summary.inValidation}</strong>
        </div>
        <div className="bonus-summary-item">
          <FileText size={18} />
          <span>Regularizaciones</span>
          <strong>{summary.regularizations}</strong>
        </div>
        <div className="bonus-summary-item">
          <Check size={18} />
          <span>Validados</span>
          <strong>{summary.validated}</strong>
        </div>
      </div>

      <div className="bonus-view-tabs">
        <button
          className={activeView === 'mine' ? 'is-active' : ''}
          onClick={() => changeView('mine')}
          type="button"
        >
          Mis bonos
          <HelpTooltip text="Tu historial y asignaciones propias." />
        </button>
        {isMod && (
          <>
            <button
              className={activeView === 'assignments' ? 'is-active' : ''}
              onClick={() => changeView('assignments')}
              type="button"
            >
              Asignaciones
              <HelpTooltip text="Autoriza trabajo fuera de horario para uno o varios usuarios." />
            </button>
            <button
              className={activeView === 'regularizations' ? 'is-active' : ''}
              onClick={() => changeView('regularizations')}
              type="button"
            >
              Regularizaciones
              <HelpTooltip text="Casos cargados después de haber trabajado." />
            </button>
            <button
              className={activeView === 'validation' ? 'is-active' : ''}
              onClick={() => changeView('validation')}
              type="button"
            >
              Validacion
              <HelpTooltip text="Confirma horas reales trabajadas." />
            </button>
            <button
              className={activeView === 'report' ? 'is-active' : ''}
              onClick={() => changeView('report')}
              type="button"
            >
              Reporte
              <HelpTooltip text="Consolidado de registros validados." />
            </button>
          </>
        )}
      </div>

      <div className="bonus-filters">
        {isMod && activeView !== 'mine' && (
          <label className="bonus-search">
            <Search size={16} />
            <input
              value={searchName}
              onChange={event => setSearchName(event.target.value)}
              onKeyDown={event => event.key === 'Enter' && fetchData()}
              placeholder="Buscar por nombre o DNI"
            />
            <HelpTooltip text="Filtra la bandeja por nombre, apellido o DNI del trabajador." />
          </label>
        )}
        <select
          value={statusFilter}
          onChange={event => setStatusFilter(event.target.value)}
        >
          <option value="">Estado sugerido</option>
          {statusOptions.map(value => (
            <option key={value} value={value}>
              {STATUS_LABEL[value]}
            </option>
          ))}
        </select>
        <HelpTooltip text="Muestra solo estados utiles para la pestaña actual." />
        <select
          value={typeFilter}
          onChange={event => setTypeFilter(event.target.value)}
        >
          <option value="">Todos los tipos</option>
          {Object.entries(TYPE_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <HelpTooltip text="Filtra por el tipo principal: horas extra, domingo, amanecida o jornada extendida." />
        <button
          type="button"
          className="bonus-secondary-btn"
          onClick={fetchData}
        >
          <Search size={16} />
          Buscar
        </button>
      </div>

      <div className="bonus-table-shell">
        <div className="bonus-result-count">{total} resultados</div>
        <div className="bonus-table">
          <div className="bonus-table-head">
            <span>Solicitante</span>
            <span>Tipo</span>
            <span>Periodo</span>
            <span>Horas</span>
            <span>Estado</span>
            <span>Observacion</span>
            <span>Accion</span>
          </div>
          {items.length === 0 ? (
            <div className="bonus-empty">
              <CalendarClock size={24} />
              <strong>No hay registros para mostrar</strong>
              <span>
                {isMod
                  ? 'Asigna un bono o ajusta los filtros.'
                  : 'Cuando un rol autorizado te asigne un bono aparecera aqui.'}
              </span>
            </div>
          ) : (
            items.map(item => (
              <div className="bonus-row" key={item.id}>
                <span data-label="Solicitante">{personName(item.user)}</span>
                <span data-label="Tipo">{TYPE_LABEL[item.type]}</span>
                <span data-label="Periodo">
                  {formatDateTime(item.startDate)} -{' '}
                  {formatDateTime(item.endDate)}
                </span>
                <span data-label="Horas">
                  <strong>
                    {item.validatedHours ??
                      item.executedHours ??
                      item.assignedHours ??
                      item.requestedHours ??
                      0}
                  </strong>
                  <small>
                    {item.validatedHours ? 'validadas' : 'estimadas'}
                  </small>
                </span>
                <span data-label="Estado">
                  <strong
                    className={`bonus-status bonus-status-${item.status.toLowerCase()}`}
                  >
                    {STATUS_LABEL[item.status]}
                  </strong>
                </span>
                <span data-label="Observacion">
                  {item.validationFeedback || item.feedback || item.reason}
                </span>
                <span className="bonus-row-actions" data-label="Accion">
                  {isMod && item.status === 'PROCESO' && (
                    <>
                      <button
                        type="button"
                        title="Aprobar regularizacion"
                        onClick={() => updateStatus(item, 'APROBADO')}
                      >
                        <Check size={14} />
                        <HelpTooltip
                          align="left"
                          text="Aprueba la regularización para que pueda pasar a validación de horas."
                        />
                      </button>
                      <button
                        type="button"
                        title="Rechazar regularizacion"
                        onClick={() => updateStatus(item, 'RECHAZADO')}
                      >
                        <X size={14} />
                        <HelpTooltip
                          align="left"
                          text="Rechaza la regularización. El registro queda cerrado como no reconocido."
                        />
                      </button>
                    </>
                  )}
                  {isMod &&
                    ['ASIGNADO', 'APROBADO', 'PENDIENTE_VALIDACION'].includes(
                      item.status
                    ) && (
                      <>
                        <input
                          type="number"
                          min="0"
                          step="0.25"
                          title="Horas validadas"
                          value={validationValues[item.id] ?? ''}
                          placeholder={String(
                            item.assignedHours || item.approvedHours || ''
                          )}
                          onChange={event =>
                            setValidationValues({
                              ...validationValues,
                              [item.id]: event.target.value,
                            })
                          }
                        />
                        <HelpTooltip
                          align="left"
                          text="Ingresa las horas reales reconocidas. Puedes usar decimales: 1.5, 2.25, etc."
                        />
                        <button
                          type="button"
                          title="Validar horas"
                          onClick={() => validateBonus(item)}
                        >
                          <Check size={14} />
                          <HelpTooltip
                            align="left"
                            text="Confirma las horas reconocidas. Desde aquí el bono queda listo para reporte."
                          />
                        </button>
                      </>
                    )}
                  {isMod && item.status === 'VALIDADO' && (
                    <button
                      type="button"
                      title="Marcar liquidado"
                      onClick={() => updateStatus(item, 'LIQUIDADO')}
                    >
                      <FileText size={14} />
                      <HelpTooltip
                        align="left"
                        text="Marca el registro como liquidado. Después ya no debe editarse desde el flujo normal."
                      />
                    </button>
                  )}
                  {isMod &&
                    !['LIQUIDADO', 'ANULADO', 'RECHAZADO'].includes(
                      item.status
                    ) && (
                      <button
                        type="button"
                        title="Anular"
                        onClick={() => updateStatus(item, 'ANULADO')}
                      >
                        <X size={14} />
                        <HelpTooltip
                          align="left"
                          text="Anula el bono si ya no corresponde reconocerlo o fue asignado por error."
                        />
                      </button>
                    )}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {renderFormOverlay()}
    </section>
  );
};
