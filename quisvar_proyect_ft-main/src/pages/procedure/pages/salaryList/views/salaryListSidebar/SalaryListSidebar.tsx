import './salaryListSidebar.css';
import {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import SalarySidebarItemCreated from '../../components/salarySidebarItem/SalarySidebarItemCreated';
import LoaderOnly from '@/components/loaderOnly/LoaderOnly';
import { FiEdit2, FiPlus, FiTrash2, FiX } from 'react-icons/fi';
import usePayrollList from '../../../../hooks/usePayrollList';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { TypePayroll } from '../../pages/interface/payroll.types';
import { axiosInstance } from '@/services/axiosInstance';
import { isOpenButtonDelete$ } from '@/services/sharingSubject';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const PAYROLL_PHASES = [
  { label: 'Solicitudes del personal', value: 'REQUESTS' },
  { label: 'Elaboración de planilla', value: 'ELABORATION' },
  { label: 'Con conformidad', value: TypePayroll.APPROVED },
  { label: 'Por pagar', value: TypePayroll.UNPAID },
] as const;

const PAYROLL_BASE_PATH = '/centro-de-usuarios/planillas';

const MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const padDatePart = (value: number) => String(value).padStart(2, '0');

const dateInputFromValue = (value?: string | Date | null) => {
  if (!value) return '';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value));
};

const toLimaBoundary = (date: string, edge: 'start' | 'end') => {
  const time = edge === 'start' ? '00:00:00.000' : '23:59:59.999';
  return `${date}T${time}-05:00`;
};

const SalaryListSidebar = () => {
  const { salaryId } = useParams();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const isRequests = location.pathname.includes('/recepcion');
  const isElaboration = location.pathname.includes('/elaboracion');
  const isMayBridge =
    location.pathname.startsWith(`${PAYROLL_BASE_PATH}/puente-mayo`) ||
    location.pathname.startsWith(
      '/tramites/tramite-de-pago/planilla/puente-mayo'
    );
  const currentTypePayroll = (searchParams.get('typePayroll') ??
    TypePayroll.UNAPPROVED) as TypePayroll;

  const navigate = useNavigate();
  const {
    usePayrollListQuery,
    newPad,
    handleFinish,
    handleNewSalary,
    newSalary,
    latestPayroll,
  } = usePayrollList({});
  const selectedPayroll = usePayrollListQuery.data?.find(
    payroll => String(payroll.id) === String(salaryId)
  );
  const activePayrollId = salaryId || latestPayroll?.id;
  const getPayrollPath = (payrollId: string | number) =>
    `${PAYROLL_BASE_PATH}/${payrollId}?typePayroll=${TypePayroll.UNAPPROVED}`;
  const getCurrentPhasePath = (payrollId: string | number) => {
    if (isRequests) return `${PAYROLL_BASE_PATH}/${payrollId}/recepcion`;
    if (isElaboration || isMayBridge)
      return `${PAYROLL_BASE_PATH}/${payrollId}/elaboracion`;
    return getPayrollPath(payrollId);
  };
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPeriodStart, setEditPeriodStart] = useState('');
  const [editPeriodEnd, setEditPeriodEnd] = useState('');
  const currentYear = useMemo(() => new Date().getFullYear(), []);

  useEffect(() => {
    if (latestPayroll && !salaryId) {
      navigate(
        isRequests || isElaboration || isMayBridge
          ? getCurrentPhasePath(latestPayroll.id)
          : `${PAYROLL_BASE_PATH}/${latestPayroll.id}/recepcion`,
        { replace: true }
      );
    }
  }, [
    isElaboration,
    isMayBridge,
    isRequests,
    latestPayroll,
    navigate,
    salaryId,
  ]);

  useEffect(() => {
    if (!selectedPayroll || !isEditOpen) return;
    setEditName(selectedPayroll.name);
    setEditPeriodStart(dateInputFromValue(selectedPayroll.periodStart));
    setEditPeriodEnd(dateInputFromValue(selectedPayroll.periodEnd));
  }, [isEditOpen, selectedPayroll]);

  const handleSelectPayroll = (payrollId: string) => {
    if (!payrollId) return;
    navigate(getCurrentPhasePath(payrollId));
  };

  const handleDeletePayroll = async () => {
    if (!selectedPayroll) return;
    await axiosInstance.delete(`/payrolls/${selectedPayroll.id}`);
    SnackbarUtilities.success('La planilla fue eliminada exitosamente');
    const refreshed = await usePayrollListQuery.refetch();
    const nextPayroll = refreshed.data?.find(
      payroll => payroll.id !== selectedPayroll.id
    );
    if (nextPayroll) {
      navigate(getPayrollPath(nextPayroll.id));
    } else {
      navigate(PAYROLL_BASE_PATH);
    }
  };

  const handleOpenButtonDelete = () => {
    if (!selectedPayroll) {
      SnackbarUtilities.warning('Seleccione una planilla para eliminar');
      return;
    }
    isOpenButtonDelete$.setSubject = {
      isOpen: true,
      function: handleDeletePayroll,
    };
  };

  const updatePayrollMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPayroll) throw new Error('Seleccione una planilla');
      const { data } = await axiosInstance.patch(
        `/payrolls/${selectedPayroll.id}`,
        {
          name: editName,
          periodStart: toLimaBoundary(editPeriodStart, 'start'),
          periodEnd: toLimaBoundary(editPeriodEnd, 'end'),
        }
      );
      return data;
    },
    onSuccess: async () => {
      SnackbarUtilities.success('Planilla actualizada');
      setIsEditOpen(false);
      await usePayrollListQuery.refetch();
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
    },
    onError: error => {
      SnackbarUtilities.error(
        error instanceof Error
          ? error.message
          : 'No se pudo actualizar la planilla'
      );
    },
  });

  const handleOpenEdit = () => {
    if (!selectedPayroll) {
      SnackbarUtilities.warning('Seleccione una planilla para editar');
      return;
    }
    setEditName(selectedPayroll.name);
    setEditPeriodStart(dateInputFromValue(selectedPayroll.periodStart));
    setEditPeriodEnd(dateInputFromValue(selectedPayroll.periodEnd));
    setIsEditOpen(true);
  };

  const handleSubmitEdit = (event: FormEvent) => {
    event.preventDefault();
    if (!editName.trim()) {
      SnackbarUtilities.warning('Ingrese un nombre para la planilla');
      return;
    }
    if (!editPeriodStart || !editPeriodEnd) {
      SnackbarUtilities.warning('Ingrese el lapso completo de la planilla');
      return;
    }
    updatePayrollMutation.mutate();
  };

  const handleMonthShortcut = (monthIndex: number) => {
    const start = `${currentYear}-${padDatePart(monthIndex + 1)}-01`;
    const endDate = new Date(currentYear, monthIndex + 1, 0);
    const end = `${currentYear}-${padDatePart(monthIndex + 1)}-${padDatePart(
      endDate.getDate()
    )}`;
    setEditPeriodStart(start);
    setEditPeriodEnd(end);
  };

  const handlePhaseClick = (phase: (typeof PAYROLL_PHASES)[number]) => {
    if (!activePayrollId) return;
    if (phase.value === 'REQUESTS') {
      navigate(`${PAYROLL_BASE_PATH}/${activePayrollId}/recepcion`);
      return;
    }
    if (phase.value === 'ELABORATION') {
      navigate(`${PAYROLL_BASE_PATH}/${activePayrollId}/elaboracion`);
      return;
    }
    navigate(
      `${PAYROLL_BASE_PATH}/${activePayrollId}?typePayroll=${phase.value}`
    );
  };

  const isPhaseActive = (phase: (typeof PAYROLL_PHASES)[number]) => {
    if (phase.value === 'REQUESTS') return isRequests;
    if (phase.value === 'ELABORATION') return isElaboration || isMayBridge;
    return (
      !isRequests &&
      !isElaboration &&
      !isMayBridge &&
      currentTypePayroll === phase.value
    );
  };

  return (
    <>
      <div className="salaryListSidebar">
        <div className="salaryListSidebar-selectBlock">
          <label htmlFor="salaryListSidebar-select">Planilla activa</label>
          <div className="salaryListSidebar-selectRow">
            <select
              id="salaryListSidebar-select"
              value={salaryId || ''}
              onChange={event => handleSelectPayroll(event.target.value)}
              disabled={usePayrollListQuery.isFetching}
            >
              <option value="" disabled>
                Seleccione planilla
              </option>
              {usePayrollListQuery.data?.map(salary => (
                <option key={salary.id} value={salary.id}>
                  {salary.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="salaryListSidebar-iconButton"
              title="Editar planilla"
              aria-label="Editar planilla"
              disabled={!selectedPayroll || usePayrollListQuery.isFetching}
              onClick={handleOpenEdit}
            >
              <FiEdit2 size={16} />
            </button>
            <button
              type="button"
              className="salaryListSidebar-deleteButton"
              title="Eliminar planilla seleccionada"
              aria-label="Eliminar planilla seleccionada"
              disabled={!selectedPayroll || usePayrollListQuery.isFetching}
              onClick={handleOpenButtonDelete}
            >
              <FiTrash2 size={16} />
            </button>
          </div>
        </div>
        <div
          className="salaryListSidebar-phases"
          aria-label="Fases de planilla"
        >
          {PAYROLL_PHASES.map(phase => (
            <button
              key={phase.value}
              type="button"
              className={`salaryListSidebar-phase ${
                isPhaseActive(phase) ? 'salaryListSidebar-phase-active' : ''
              }`}
              disabled={!activePayrollId}
              onClick={() => handlePhaseClick(phase)}
            >
              {phase.label}
            </button>
          ))}
        </div>
        {newSalary && (
          <SalarySidebarItemCreated
            handleClose={handleNewSalary}
            initValue={newPad}
            onSave={handleFinish}
          />
        )}
        {usePayrollListQuery.isFetching && <LoaderOnly left={7} top={1} />}
        <div className="salaryListSidebar-actions">
          <button
            type="button"
            className="salaryListSidebar-createIcon"
            title="Nueva planilla"
            aria-label="Nueva planilla"
            disabled={usePayrollListQuery.isFetching}
            onClick={handleNewSalary}
          >
            <FiPlus size={18} />
          </button>
        </div>
      </div>
      {isEditOpen && (
        <div className="salaryListSidebar-modalBackdrop">
          <form className="salaryListSidebar-modal" onSubmit={handleSubmitEdit}>
            <header>
              <h2>Editar planilla</h2>
              <button
                type="button"
                aria-label="Cerrar"
                onClick={() => setIsEditOpen(false)}
              >
                <FiX size={18} />
              </button>
            </header>
            <label>
              Nombre
              <input
                value={editName}
                onChange={event => setEditName(event.target.value)}
              />
            </label>
            <div className="salaryListSidebar-periodGrid">
              <label>
                Lapso desde
                <input
                  type="date"
                  value={editPeriodStart}
                  onChange={event => setEditPeriodStart(event.target.value)}
                />
              </label>
              <label>
                Lapso hasta
                <input
                  type="date"
                  value={editPeriodEnd}
                  onChange={event => setEditPeriodEnd(event.target.value)}
                />
              </label>
            </div>
            <div className="salaryListSidebar-months">
              {MONTHS.map((month, index) => (
                <button
                  key={month}
                  type="button"
                  onClick={() => handleMonthShortcut(index)}
                >
                  {month}
                </button>
              ))}
            </div>
            <footer>
              <button type="button" onClick={() => setIsEditOpen(false)}>
                Cancelar
              </button>
              <button type="submit" disabled={updatePayrollMutation.isPending}>
                {updatePayrollMutation.isPending ? 'Guardando...' : 'Guardar'}
              </button>
            </footer>
          </form>
        </div>
      )}
    </>
  );
};

export default SalaryListSidebar;
