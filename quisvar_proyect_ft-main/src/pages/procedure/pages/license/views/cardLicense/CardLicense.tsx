import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import './CardLicense.css';
import { Subscription } from 'rxjs';
import { isOpenCardLicense$ } from '@/services/sharingSubject';
import { useForm } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import Input from '@/components/Input/Input';
import TextArea from '@/components/textArea/TextArea';
import Modal from '@/components/portal/Modal';
import Button from '@/components/button/Button';
import CloseIcon from '@/components/closeIcon/CloseIcon';
import Select from '@/components/select/Select';
import { axiosInstance } from '@/services/axiosInstance';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store/store.types';
import type { DataLicense, licenseList } from '@/types/types';
import { SocketContext } from '@/context/SocketContex';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import useRole from '@/hooks/useRole';
import { useLicenseUsers } from '../../../../hooks/useProcedureUserOptions';
import { FaUserLarge, FaUsers } from 'react-icons/fa6';
interface CardLicenseProps {
  onSave?: () => void;
}

type RequestReason =
  | 'Salida de campo'
  | 'Tramite documentario'
  | 'Licencia personal'
  | 'Otros';

type ProjectOption = {
  id: number;
  name: string;
};

type UserProjectTaskResponse = {
  data: {
    projectId?: number;
    name: string;
  }[];
};

type RequestMode = 'single' | 'recurring';
type RequestOwnerMode = 'self' | 'user';
type RecurrenceOccurrence = {
  startDate: string;
  untilDate: string;
};

const WEEK_DAYS = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];

const formatLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const CardLicense = ({ onSave }: CardLicenseProps) => {
  const { id: userSessionId } = useSelector(
    (state: RootState) => state.userSession
  );
  const { hasAccess: canManageLicenses } = useRole(
    'MOD',
    'tramites',
    'salidas'
  );
  const socket = useContext(SocketContext);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState<RequestReason | ''>('');
  const [ownerMode, setOwnerMode] = useState<RequestOwnerMode>('self');
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [requestMode, setRequestMode] = useState<RequestMode>('single');
  const [resolutionFile, setResolutionFile] = useState<File | null>(null);
  const [resolutionFileName, setResolutionFileName] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [isConfirmingClose, setIsConfirmingClose] = useState(false);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [recurringStartDate, setRecurringStartDate] = useState('');
  const [recurringEndDate, setRecurringEndDate] = useState('');
  const [recurringStartTime, setRecurringStartTime] = useState('');
  const [recurringEndTime, setRecurringEndTime] = useState('');
  const [calendarMonth, setCalendarMonth] = useState(
    formatLocalDate(new Date()).slice(0, 7)
  );
  const [selectedCustomDates, setSelectedCustomDates] = useState<string[]>([]);
  const [isDraggingDates, setIsDraggingDates] = useState(false);
  const [dateDragMode, setDateDragMode] = useState<'add' | 'remove'>('add');
  const [recurrenceOccurrences, setRecurrenceOccurrences] = useState<
    RecurrenceOccurrence[]
  >([]);
  const formRef = useRef<HTMLFormElement>(null);
  const closeConfirmRef = useRef<HTMLDivElement>(null);
  const handleIsOpen = useRef<Subscription>(new Subscription());
  const [data, setData] = useState<licenseList>();
  const [isFree, setIsFree] = useState<string | undefined>('');
  const formattedDate = (value: string) => {
    const parts = value.split(':');
    const result = parts.slice(0, 2).join(':');
    return result;
  };

  const formatDateTimeInput = (value?: string | Date) => {
    if (!value) return '';
    return formattedDate(String(value));
  };

  const getRecurrenceOccurrencesFromData = (license?: licenseList) => {
    if (!license?.recurrenceRule) return [];
    try {
      const parsed = JSON.parse(license.recurrenceRule) as {
        occurrences?: RecurrenceOccurrence[];
      };
      return (parsed.occurrences ?? [])
        .filter(item => item.startDate && item.untilDate)
        .map(item => ({
          startDate: formatDateTimeInput(item.startDate),
          untilDate: formatDateTimeInput(item.untilDate),
        }));
    } catch {
      return [];
    }
  };
  // console.log(data);

  const {
    handleSubmit,
    register,
    reset,
    setValue,
    getValues,
    watch,
    // formState: { errors },
  } = useForm<DataLicense>();
  const startDateValue = watch('startDate');
  const canCreateForUser = Boolean(canManageLicenses) && !data && !isFree;
  const { data: users = [] } = useLicenseUsers({
    enabled: isOpen && canCreateForUser,
  });
  const targetUserId =
    ownerMode === 'user' && selectedUserIds[0]
      ? selectedUserIds[0]
      : userSessionId;
  const selectedUsers = users.filter(user => selectedUserIds.includes(user.id));
  const currentUser = users.find(user => user.id === userSessionId);
  const approvalLabel =
    ownerMode === 'user'
      ? `Aprobada por ${currentUser?.name ?? 'usuario MOD actual'}`
      : 'Aprobacion pendiente';
  const requesterLabel =
    ownerMode === 'user'
      ? selectedUsers.length === 1
        ? selectedUsers[0].name
        : `${selectedUsers.length} usuarios seleccionados`
      : 'Solicitud personal';
  const hasResolution =
    requestMode === 'single' || Boolean(resolutionFile || resolutionFileName);
  const canFillPermissionDetails = requestMode === 'single' || hasResolution;
  const projectOwnerId =
    ownerMode === 'user'
      ? selectedUserIds[0]
        ? selectedUserIds[0]
        : null
      : userSessionId;
  const filteredUsers = users
    .filter(user => !selectedUserIds.includes(user.id))
    .filter(user => {
      const query = userSearch.trim().toLowerCase();
      if (!query) return true;
      const userName = user.name ?? '';
      return (
        userName.toLowerCase().includes(query) ||
        String(user.dni ?? '').includes(query)
      );
    })
    .slice(0, 8);

  const resetWizard = () => {
    reset({});
    setSelectedValue('');
    setOwnerMode('self');
    setSelectedUserIds([]);
    setUserSearch('');
    setRequestMode('single');
    setResolutionFile(null);
    setResolutionFileName('');
    setCurrentStep(1);
    setIsConfirmingClose(false);
    setRecurringStartDate('');
    setRecurringEndDate('');
    setRecurringStartTime('');
    setRecurringEndTime('');
    setCalendarMonth(formatLocalDate(new Date()).slice(0, 7));
    setSelectedCustomDates([]);
    setRecurrenceOccurrences([]);
  };

  useEffect(() => {
    handleIsOpen.current = isOpenCardLicense$.getSubject.subscribe(value => {
      if (value.isOpen && !value.data && !value.type) resetWizard();
      setIsOpen(value.isOpen);
      setData(value.data);
      setIsFree(value.type);
    });
    return () => {
      handleIsOpen.current.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const handleMouseUp = () => setIsDraggingDates(false);
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  useEffect(() => {
    if (!isConfirmingClose) return;
    requestAnimationFrame(() => {
      formRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      closeConfirmRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  }, [isConfirmingClose]);

  useEffect(() => {
    if (!isOpen || isFree) return;
    if (!projectOwnerId) {
      setProjects([]);
      return;
    }
    axiosInstance
      .get<UserProjectTaskResponse>(`/subtasks/report-user/${projectOwnerId}`, {
        params: {
          limit: 200,
          page: 0,
        },
        headers: {
          noLoader: true,
        },
      })
      .then(res => {
        const userProjects = res.data.data.reduce<ProjectOption[]>(
          (acc, item) => {
            if (
              !item.projectId ||
              acc.some(project => project.id === item.projectId)
            ) {
              return acc;
            }
            acc.push({
              id: item.projectId,
              name: item.name,
            });
            return acc;
          },
          []
        );
        setProjects(userProjects);
      });
  }, [isFree, isOpen, projectOwnerId]);

  useEffect(() => {
    if (data) {
      const storedOccurrences = getRecurrenceOccurrencesFromData(data);
      const isRecurringData =
        Boolean(data.isRecurringParent) && storedOccurrences.length > 0;
      setCurrentStep(1);
      setRequestMode(isRecurringData ? 'recurring' : 'single');
      setValue('startDate', formatDateTimeInput(data?.startDate));
      setValue('untilDate', formatDateTimeInput(data?.untilDate));
      setValue('reason', data.reason ?? '');
      setRecurrenceOccurrences(storedOccurrences);
      setResolutionFile(null);
      setResolutionFileName(data.departureFile ?? '');
      setSelectedCustomDates(
        storedOccurrences.map(item => item.startDate.slice(0, 10))
      );
      if (storedOccurrences[0]) {
        setCalendarMonth(storedOccurrences[0].startDate.slice(0, 7));
        setRecurringStartTime(storedOccurrences[0].startDate.slice(11, 16));
        setRecurringEndTime(storedOccurrences[0].untilDate.slice(11, 16));
      }
      if (data.type === 'PERMISO') setSelectedValue('Licencia personal');
      if (data.type === 'SALIDA') {
        if (data.reason?.startsWith('Salida de campo')) {
          setSelectedValue('Salida de campo');
        } else if (data.reason?.startsWith('Tramite documentario')) {
          setSelectedValue('Tramite documentario');
          setValue(
            'reason',
            data.reason.replace('Tramite documentario - ', '')
          );
        } else if (data.reason?.startsWith('Otros')) {
          setSelectedValue('Otros');
          setValue('reason', data.reason.replace('Otros - ', ''));
        } else {
          setSelectedValue('Otros');
        }
      } else if (data.reason?.startsWith('Licencia personal')) {
        setValue('reason', data.reason.replace('Licencia personal - ', ''));
      }
    }
  }, [data, setValue]);

  const showModal = () => {
    resetWizard();
    setIsOpen(false);
  };

  const hasDraft = () => {
    const values = getValues();
    return Boolean(
      selectedValue ||
        ownerMode === 'user' ||
        selectedUserIds.length > 0 ||
        userSearch ||
        requestMode === 'recurring' ||
        resolutionFile ||
        resolutionFileName ||
        values.reason ||
        values.projectId ||
        values.startDate ||
        values.untilDate ||
        recurringStartDate ||
        recurringEndDate ||
        recurringStartTime ||
        recurringEndTime ||
        selectedCustomDates.length > 0 ||
        recurrenceOccurrences.length > 0
    );
  };

  const handleCloseRequest = () => {
    if (data || isFree || !hasDraft()) {
      showModal();
      return;
    }
    setIsConfirmingClose(true);
  };

  const buildReason = (values: DataLicense) => {
    if (selectedValue === 'Salida de campo') {
      const project = projects.find(
        item => item.id === Number(values.projectId)
      );
      if (!project && data?.reason?.startsWith('Salida de campo')) {
        return data.reason;
      }
      return project
        ? `Salida de campo - Proyecto: ${project.name}`
        : 'Salida de campo';
    }
    if (selectedValue === 'Tramite documentario') {
      return `Tramite documentario - ${values.reason}`;
    }
    if (selectedValue === 'Licencia personal') {
      return `Licencia personal - ${values.reason}`;
    }
    if (selectedValue === 'Otros') return `Otros - ${values.reason}`;
    return values.reason;
  };

  const getPermissionDetail = () => {
    const values = getValues();
    if (selectedValue === 'Salida de campo') {
      return (
        projects.find(item => item.id === Number(values.projectId))?.name ??
        'Proyecto no seleccionado'
      );
    }
    if (selectedValue === 'Tramite documentario') {
      return values.reason || 'Tramite no detallado';
    }
    if (selectedValue === 'Licencia personal') {
      return values.reason || 'Motivo no detallado';
    }
    if (selectedValue === 'Otros') return values.reason || 'Sin detalle';
    return 'Sin detalle';
  };

  const formatReviewDate = (value?: string) => {
    if (!value) return 'Sin definir';
    return new Intl.DateTimeFormat('es-PE', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(new Date(value));
  };

  const getResolutionDisplayName = () => {
    if (resolutionFile) return resolutionFile.name;
    if (!resolutionFileName) return '';
    return (
      resolutionFileName.split('/').at(-1)?.split('$$').at(-1) ??
      resolutionFileName
    );
  };

  const validateResolutionFile = (file: File) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    const allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png'];
    const extension = file.name.split('.').at(-1)?.toLowerCase() ?? '';
    if (
      !allowedTypes.includes(file.type) &&
      !allowedExtensions.includes(extension)
    ) {
      SnackbarUtilities.error('Suba una resolucion en PDF, JPG o PNG');
      return false;
    }
    if (file.size > 10 * 1024 * 1024) {
      SnackbarUtilities.error('La resolucion no debe superar 10 MB');
      return false;
    }
    return true;
  };

  const handleResolutionFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!validateResolutionFile(file)) {
      event.target.value = '';
      return;
    }
    setResolutionFile(file);
    setResolutionFileName('');
  };

  const buildLicenseFormData = (payload: Record<string, unknown>) => {
    const formData = new FormData();
    Object.entries(payload).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      formData.append(
        key,
        typeof value === 'object' ? JSON.stringify(value) : String(value)
      );
    });
    if (resolutionFile) formData.append('resolution', resolutionFile);
    return formData;
  };

  const addSelectedUser = (userId: number) => {
    if (selectedUserIds.includes(userId)) return;
    setSelectedUserIds(prev => [...prev, userId]);
    setUserSearch('');
    setValue('projectId', '');
  };

  const removeSelectedUser = (userId: number) => {
    setSelectedUserIds(prev => prev.filter(id => id !== userId));
    setValue('projectId', '');
  };

  const onSubmit: SubmitHandler<DataLicense> = values => {
    if (!data) {
      if (isFree === 'free') {
        const sendFree = {
          reason: values.reason,
          startDate: values.startDate,
          untilDate: values.untilDate,
          supervisorId: userSessionId,
          type: 'PERMISO',
        };
        axiosInstance.post(`license/free`, sendFree).then(() => {
          setIsOpen(false);
          resetWizard();
          onSave?.();
        });
      } else {
        if (!selectedValue)
          return SnackbarUtilities.error('Seleccione el tipo de permiso');
        if (ownerMode === 'user' && selectedUserIds.length === 0) {
          return SnackbarUtilities.error('Seleccione al menos un usuario');
        }
        if (selectedValue === 'Salida de campo' && !values.projectId)
          return SnackbarUtilities.error('Seleccione el proyecto');
        if (requestMode === 'recurring' && recurrenceOccurrences.length === 0) {
          return SnackbarUtilities.error(
            'Confirme al menos una fecha seleccionada'
          );
        }
        if (requestMode === 'recurring' && !hasResolution) {
          return SnackbarUtilities.error(
            'Suba la resolucion antes de continuar'
          );
        }
        if (requestMode === 'single') {
          if (isPastDateTime(values.startDate)) {
            return SnackbarUtilities.error(
              'La salida no puede ser menor a la hora actual'
            );
          }
          if (values.untilDate <= values.startDate) {
            return SnackbarUtilities.error(
              'El retorno debe ser mayor a la salida'
            );
          }
        }
        if (requestMode === 'recurring' && !validateOccurrences()) return;
        const send = {
          reason: buildReason(values),
          startDate:
            requestMode === 'recurring'
              ? recurrenceOccurrences[0].startDate
              : values.startDate,
          untilDate:
            requestMode === 'recurring'
              ? recurrenceOccurrences[recurrenceOccurrences.length - 1]
                  .untilDate
              : values.untilDate,
          type: selectedValue === 'Licencia personal' ? 'PERMISO' : 'SALIDA',
          recurrence:
            requestMode === 'recurring'
              ? {
                  enabled: true,
                  occurrences: recurrenceOccurrences,
                }
              : undefined,
          departureFile:
            requestMode === 'recurring' && !resolutionFile
              ? resolutionFileName
              : undefined,
        };
        const shouldAutoApprove = canCreateForUser && ownerMode === 'user';
        const payload = {
          usersId: targetUserId,
          usersIds:
            ownerMode === 'user' && selectedUserIds.length > 1
              ? selectedUserIds
              : undefined,
          supervisorId: shouldAutoApprove ? userSessionId : undefined,
          autoApprove: shouldAutoApprove,
          ...send,
        };
        axiosInstance
          .post(
            `license`,
            requestMode === 'recurring'
              ? buildLicenseFormData(payload)
              : payload
          )
          .then(() => {
            setIsOpen(false);
            resetWizard();
            onSave?.();
            if (shouldAutoApprove) socket.emit('client:action-button');
          });
      }
    } else {
      if (!selectedValue)
        return SnackbarUtilities.error('Seleccione el tipo de permiso');
      if (
        selectedValue === 'Salida de campo' &&
        !values.projectId &&
        !data.reason?.startsWith('Salida de campo')
      )
        return SnackbarUtilities.error('Seleccione el proyecto');
      if (requestMode === 'recurring') {
        if (!hasResolution) {
          return SnackbarUtilities.error(
            'Suba la resolucion antes de continuar'
          );
        }
        if (recurrenceOccurrences.length === 0) {
          return SnackbarUtilities.error(
            'Confirme al menos una fecha seleccionada'
          );
        }
        if (!validateOccurrences()) return;
      }
      if (requestMode === 'single') {
        if (isPastDateTime(values.startDate)) {
          return SnackbarUtilities.error(
            'La salida no puede ser menor a la hora actual'
          );
        }
        if (values.untilDate <= values.startDate) {
          return SnackbarUtilities.error(
            'El retorno debe ser mayor a la salida'
          );
        }
      }
      const updateLicense = {
        reason: buildReason(values),
        startDate:
          requestMode === 'recurring'
            ? recurrenceOccurrences[0].startDate
            : values.startDate,
        untilDate:
          requestMode === 'recurring'
            ? recurrenceOccurrences[recurrenceOccurrences.length - 1].untilDate
            : values.untilDate,
        type: selectedValue === 'Licencia personal' ? 'PERMISO' : 'SALIDA',
        usersId: userSessionId,
        feedback: data.feedback,
        status: 'PROCESO',
        recurrence:
          requestMode === 'recurring'
            ? {
                enabled: true,
                occurrences: recurrenceOccurrences,
              }
            : undefined,
        departureFile:
          requestMode === 'recurring' && !resolutionFile
            ? resolutionFileName || data.departureFile
            : undefined,
      };
      axiosInstance
        .patch(
          `/license/${data.id}`,
          requestMode === 'recurring'
            ? buildLicenseFormData(updateLicense)
            : updateLicense
        )
        .then(() => {
          setIsOpen(false);
          resetWizard();
          onSave?.();
          socket.emit('client:action-button');
        });
    }
  };

  const formatDateAndHours = () => {
    const today = new Date();
    const desplazamientoZonaHoraria = today.getTimezoneOffset();
    const fechaSinZonaHoraria = new Date(
      today.getTime() - desplazamientoZonaHoraria * 60000
    );
    return fechaSinZonaHoraria.toISOString().slice(0, 16);
  };

  const todayLocalDate = () => formatDateAndHours().slice(0, 10);

  const isPastLocalDate = (date: string) => date < todayLocalDate();

  const isPastDateTime = (dateTime: string) => dateTime < formatDateAndHours();

  const validateOccurrences = () => {
    if (recurrenceOccurrences.some(item => isPastDateTime(item.startDate))) {
      SnackbarUtilities.error('La salida no puede ser menor a la hora actual');
      return false;
    }
    if (recurrenceOccurrences.some(item => item.untilDate <= item.startDate)) {
      SnackbarUtilities.error('Cada retorno debe ser mayor a su salida');
      return false;
    }
    return true;
  };

  const handleWizardSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    if (!isFree && currentStep < 3) {
      event.preventDefault();
      event.stopPropagation();
      handleNextStep();
      return;
    }
    handleSubmit(onSubmit)(event);
  };

  const handleReasonChange = (value: RequestReason) => {
    setSelectedValue(value);
    setValue('reason', '');
    setValue('projectId', '');
  };

  const validateStep = () => {
    const values = getValues();
    if (currentStep === 1) {
      if (
        canCreateForUser &&
        ownerMode === 'user' &&
        selectedUserIds.length === 0
      ) {
        SnackbarUtilities.error('Seleccione al menos un usuario');
        return false;
      }
      if (requestMode === 'recurring' && !hasResolution) {
        SnackbarUtilities.error('Suba la resolucion antes de continuar');
        return false;
      }
      if (!selectedValue) {
        SnackbarUtilities.error('Seleccione el tipo de permiso');
        return false;
      }
      if (selectedValue === 'Salida de campo' && !values.projectId) {
        SnackbarUtilities.error('Seleccione el proyecto');
        return false;
      }
      if (
        ['Tramite documentario', 'Licencia personal', 'Otros'].includes(
          selectedValue
        ) &&
        !values.reason
      ) {
        SnackbarUtilities.error('Complete el detalle del permiso');
        return false;
      }
    }
    if (currentStep === 2) {
      if (requestMode === 'single') {
        if (!values.startDate || !values.untilDate) {
          SnackbarUtilities.error('Complete la salida y retorno');
          return false;
        }
        if (isPastDateTime(values.startDate)) {
          SnackbarUtilities.error(
            'La salida no puede ser menor a la hora actual'
          );
          return false;
        }
        if (values.untilDate <= values.startDate) {
          SnackbarUtilities.error('El retorno debe ser mayor a la salida');
          return false;
        }
      }
      if (requestMode === 'recurring') {
        if (recurrenceOccurrences.length === 0) {
          SnackbarUtilities.error('Confirme al menos una fecha seleccionada');
          return false;
        }
        if (!validateOccurrences()) return false;
      }
    }
    return true;
  };

  const handleNextStep = () => {
    if (!validateStep()) return;
    setCurrentStep(prev => Math.min(prev + 1, 3));
  };

  const handlePreviousStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const calendarDays = useMemo(() => {
    const [year, month] = calendarMonth.split('-').map(Number);
    const firstDate = new Date(year, month - 1, 1);
    const lastDate = new Date(year, month, 0);
    const leadingEmptyDays = (firstDate.getDay() + 6) % 7;
    const days: (string | null)[] = Array.from(
      { length: leadingEmptyDays },
      () => null
    );
    for (let day = 1; day <= lastDate.getDate(); day += 1) {
      days.push(formatLocalDate(new Date(year, month - 1, day)));
    }
    return days;
  }, [calendarMonth]);

  const applyCustomDate = (date: string, mode: 'add' | 'remove') => {
    if (isPastLocalDate(date)) return;
    setSelectedCustomDates(prev => {
      const exists = prev.includes(date);
      if (mode === 'add' && !exists) return [...prev, date].sort();
      if (mode === 'remove' && exists)
        return prev.filter(item => item !== date);
      return prev;
    });
  };

  const handleDateMouseDown = (date: string) => {
    if (isPastLocalDate(date)) {
      SnackbarUtilities.error('No puede seleccionar fechas anteriores a hoy');
      return;
    }
    const mode = selectedCustomDates.includes(date) ? 'remove' : 'add';
    setDateDragMode(mode);
    setIsDraggingDates(true);
    applyCustomDate(date, mode);
  };

  const handleDateMouseEnter = (date: string) => {
    if (!isDraggingDates) return;
    applyCustomDate(date, dateDragMode);
  };

  const generateRecurringDates = () => {
    if (!recurringStartTime || !recurringEndTime) {
      return SnackbarUtilities.error('Complete las horas de salida y retorno');
    }
    if (selectedCustomDates.length === 0) {
      return SnackbarUtilities.error('Seleccione al menos un dia');
    }
    const selectedDates = [...selectedCustomDates].sort();
    if (selectedDates.some(isPastLocalDate)) {
      return SnackbarUtilities.error('Quite las fechas anteriores a hoy');
    }
    const firstDate = new Date(`${selectedDates[0]}T00:00`);
    const lastDate = new Date(
      `${selectedDates[selectedDates.length - 1]}T00:00`
    );
    const diffDays =
      (lastDate.getTime() - firstDate.getTime()) / (24 * 60 * 60 * 1000);
    if (diffDays > 31) {
      return SnackbarUtilities.error('La seleccion no puede superar 1 mes');
    }
    const nextOccurrences = selectedDates.map(date => ({
      startDate: `${date}T${recurringStartTime}`,
      untilDate: `${date}T${recurringEndTime}`,
    }));
    if (
      nextOccurrences.some(occurrence => isPastDateTime(occurrence.startDate))
    ) {
      return SnackbarUtilities.error(
        'La salida no puede ser menor a la hora actual'
      );
    }
    if (
      nextOccurrences.some(
        occurrence => occurrence.untilDate <= occurrence.startDate
      )
    ) {
      return SnackbarUtilities.error('El retorno debe ser mayor a la salida');
    }
    if (nextOccurrences.length === 0) {
      return SnackbarUtilities.error('No hay fechas para generar');
    }
    setRecurrenceOccurrences(nextOccurrences);
  };

  const updateOccurrence = (
    index: number,
    key: keyof RecurrenceOccurrence,
    value: string
  ) => {
    if (key === 'startDate' && isPastDateTime(value)) {
      SnackbarUtilities.error('La salida no puede ser menor a la hora actual');
      return;
    }
    setRecurrenceOccurrences(prev =>
      prev.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        if (key === 'untilDate' && value <= item.startDate) {
          SnackbarUtilities.error('El retorno debe ser mayor a la salida');
          return item;
        }
        if (key === 'startDate' && item.untilDate <= value) {
          return { ...item, startDate: value, untilDate: value };
        }
        return { ...item, [key]: value };
      })
    );
  };

  return (
    <Modal size={50} isOpenProp={isOpen}>
      <form
        ref={formRef}
        onSubmit={handleWizardSubmit}
        className="card-generate-report"
        autoComplete="off"
      >
        {!isFree && (
          <div className="cl-options">
            <div className="cl-span cl-selected">
              <img src="/svg/cl-route.svg" />
              <h2 className="clo-text cl-color">SOLICITUD</h2>
            </div>
          </div>
        )}
        <div className="report-title">
          <h2 className="r-title">
            {!isFree ? 'TIPO DE PERMISO :' : 'Asignar dia libre para todos'}
          </h2>
        </div>
        <CloseIcon onClick={handleCloseRequest} />
        {isConfirmingClose && (
          <div className="cl-close-confirm" ref={closeConfirmRef}>
            <div>
              <h3>¿Descartar esta solicitud?</h3>
              <p>Los datos ingresados se perderan.</p>
            </div>
            <div className="cl-close-confirm-actions">
              <button type="button" onClick={() => setIsConfirmingClose(false)}>
                Seguir editando
              </button>
              <button type="button" onClick={showModal}>
                Descartar
              </button>
            </div>
          </div>
        )}
        {!isFree && (
          <div className="cl-stepper">
            <span
              className={`${currentStep > 1 ? 'cl-step-done' : ''} ${
                currentStep === 1 ? 'cl-step-current' : ''
              }`}
            >
              1. Motivo
            </span>
            <span
              className={`${currentStep > 2 ? 'cl-step-done' : ''} ${
                currentStep === 2 ? 'cl-step-current' : ''
              }`}
            >
              2. Fecha y hora
            </span>
            <span className={currentStep === 3 ? 'cl-step-current' : ''}>
              3. Revisar
            </span>
          </div>
        )}
        {!isFree ? (
          <div className="cl-permission-options">
            {currentStep === 1 && (
              <>
                {canCreateForUser && (
                  <div className="cl-owner-mode">
                    <div className="cl-owner-heading">
                      <div>
                        <h3>¿Para quien es la solicitud?</h3>
                        <p>
                          Use solicitud personal para usted o registre un
                          permiso aprobado para otro usuario.
                        </p>
                      </div>
                    </div>
                    <div className="cl-owner-options">
                      <button
                        type="button"
                        className={
                          ownerMode === 'self' ? 'cl-owner-option-active' : ''
                        }
                        onClick={() => {
                          setOwnerMode('self');
                          setSelectedUserIds([]);
                          setUserSearch('');
                          setValue('projectId', '');
                        }}
                      >
                        <span className="cl-owner-option-title">
                          <FaUserLarge aria-hidden="true" />
                          <strong>Solicitud personal</strong>
                        </span>
                        <span>Seguira el flujo normal de aprobacion.</span>
                      </button>
                      <button
                        type="button"
                        className={
                          ownerMode === 'user' ? 'cl-owner-option-active' : ''
                        }
                        onClick={() => setOwnerMode('user')}
                      >
                        <span className="cl-owner-option-title">
                          <FaUsers aria-hidden="true" />
                          <strong>Solicitud para usuarios</strong>
                        </span>
                        <span>
                          Agregue uno o varios usuarios. Quedara aprobada por
                          usted.
                        </span>
                      </button>
                    </div>
                    {ownerMode === 'user' && (
                      <div className="cl-user-picker">
                        <label>
                          <span>Buscar usuario:</span>
                          <input
                            type="search"
                            value={userSearch}
                            onChange={event =>
                              setUserSearch(event.target.value)
                            }
                            placeholder="Nombre o DNI"
                          />
                        </label>
                        <div className="cl-user-results">
                          {filteredUsers.map(user => (
                            <button
                              key={user.id}
                              type="button"
                              onClick={() => addSelectedUser(user.id)}
                            >
                              <strong>{user.name}</strong>
                              <span>DNI {user.dni || '---'}</span>
                            </button>
                          ))}
                          {filteredUsers.length === 0 && (
                            <p>No hay usuarios disponibles con ese filtro.</p>
                          )}
                        </div>
                        <div className="cl-user-selected">
                          <strong>
                            {selectedUsers.length === 0
                              ? 'Sin usuarios seleccionados'
                              : `${selectedUsers.length} usuario${
                                  selectedUsers.length === 1 ? '' : 's'
                                } seleccionado${
                                  selectedUsers.length === 1 ? '' : 's'
                                }`}
                          </strong>
                          {selectedUsers.length > 0 && (
                            <div>
                              {selectedUsers.map(user => (
                                <span key={user.id}>
                                  {user.name}
                                  <button
                                    type="button"
                                    onClick={() => removeSelectedUser(user.id)}
                                    title={`Quitar ${user.name}`}
                                  >
                                    x
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
            {currentStep === 1 && (
              <div className="cl-request-mode">
                <div>
                  <h3>
                    {requestMode === 'recurring'
                      ? 'Solicitud para varios dias'
                      : 'Solicitud simple'}
                  </h3>
                  <p>
                    {requestMode === 'recurring'
                      ? 'Elija varios dias con el mismo motivo dentro de un maximo de 1 mes.'
                      : 'Una fecha y una hora. Es la opcion habitual.'}
                  </p>
                </div>
                {!data && (
                  <button
                    type="button"
                    className={
                      requestMode === 'recurring' ? 'cl-link-active' : ''
                    }
                    onClick={() =>
                      setRequestMode(
                        requestMode === 'recurring' ? 'single' : 'recurring'
                      )
                    }
                  >
                    {requestMode === 'recurring'
                      ? 'Usar solicitud simple'
                      : 'Necesito varios dias'}
                  </button>
                )}
              </div>
            )}
            {currentStep === 1 && requestMode === 'recurring' && (
              <div
                className={`cl-resolution-card${
                  hasResolution ? ' cl-resolution-ready' : ''
                }`}
              >
                <div className="cl-resolution-copy">
                  <h3>Adjunte la resolucion</h3>
                  <p>
                    Para varios dias, primero cargue el documento donde figuran
                    las fechas y horarios autorizados.
                  </p>
                </div>
                <div className="cl-resolution-actions">
                  <label>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                      onChange={handleResolutionFile}
                    />
                    {hasResolution
                      ? 'Reemplazar resolucion'
                      : 'Subir resolucion'}
                  </label>
                  {hasResolution && (
                    <button
                      type="button"
                      onClick={() => {
                        setResolutionFile(null);
                        setResolutionFileName('');
                      }}
                    >
                      Quitar
                    </button>
                  )}
                </div>
                <div className="cl-resolution-status">
                  <strong>
                    {hasResolution
                      ? getResolutionDisplayName()
                      : 'Documento requerido para varios dias'}
                  </strong>
                  <span>PDF, JPG o PNG. Maximo 10 MB.</span>
                </div>
              </div>
            )}
            {currentStep === 1 && canFillPermissionDetails && (
              <>
                <div className="cl-label">
                  <Input
                    type="radio"
                    value="Salida de campo"
                    classNameMain="attendanceList-radio"
                    checked={selectedValue === 'Salida de campo'}
                    onChange={() => handleReasonChange('Salida de campo')}
                  />
                  <h1 className="cl-text">Salida de campo</h1>
                </div>
                {selectedValue === 'Salida de campo' && (
                  <Select
                    {...register('projectId')}
                    data={projects}
                    extractValue={project => project.id}
                    renderTextField={project => project.name}
                    placeholder="Seleccione el proyecto"
                    placeholderDisabled
                    required
                  />
                )}
                <div className="cl-label">
                  <Input
                    type="radio"
                    value="Tramite documentario"
                    classNameMain="attendanceList-radio"
                    checked={selectedValue === 'Tramite documentario'}
                    onChange={() => handleReasonChange('Tramite documentario')}
                  />
                  <h1 className="cl-text">Tramite documentario</h1>
                </div>
                {selectedValue === 'Tramite documentario' && (
                  <Input
                    placeholder="Que tipo de tramite es"
                    {...register('reason')}
                    required
                  />
                )}
                <div className="cl-label">
                  <Input
                    type="radio"
                    value="Licencia personal"
                    classNameMain="attendanceList-radio"
                    checked={selectedValue === 'Licencia personal'}
                    onChange={() => handleReasonChange('Licencia personal')}
                  />
                  <h1 className="cl-text">Licencia personal</h1>
                </div>
                {selectedValue === 'Licencia personal' && (
                  <TextArea
                    {...register('reason')}
                    name="reason"
                    placeholder="Motivo del permiso"
                    required
                  />
                )}
                <div className="cl-label">
                  <Input
                    type="radio"
                    value="Otros"
                    classNameMain="attendanceList-radio"
                    checked={selectedValue === 'Otros'}
                    onChange={() => handleReasonChange('Otros')}
                  />
                  <h1 className="cl-text">Otros</h1>
                </div>
                {selectedValue === 'Otros' && (
                  <Input
                    placeholder="Especifique"
                    {...register('reason')}
                    required
                  />
                )}
              </>
            )}
            {currentStep === 2 && requestMode === 'recurring' && (
              <div className="cl-recurring-panel">
                <div className="cl-recurring-header">
                  <div>
                    <h3>Dias y horarios del permiso</h3>
                    <p>
                      Marque dias sueltos o arrastre sobre varios dias del
                      calendario.
                    </p>
                  </div>
                  <span>{recurrenceOccurrences.length} fechas</span>
                </div>
                <div className="cl-recurring-grid">
                  <Input
                    label="Mes:"
                    type="month"
                    value={calendarMonth}
                    min={formatDateAndHours().slice(0, 7)}
                    onChange={event => {
                      setCalendarMonth(event.target.value);
                      setSelectedCustomDates([]);
                      setRecurrenceOccurrences([]);
                    }}
                  />
                  <Input
                    label="Hora salida:"
                    type="time"
                    value={recurringStartTime}
                    onChange={event =>
                      setRecurringStartTime(event.target.value)
                    }
                  />
                  <Input
                    label="Hora retorno:"
                    type="time"
                    value={recurringEndTime}
                    onChange={event => setRecurringEndTime(event.target.value)}
                  />
                </div>
                <div
                  className="cl-calendar"
                  aria-label="Calendario de varios dias"
                >
                  <div className="cl-calendar-week">
                    {WEEK_DAYS.map(day => (
                      <span key={day}>{day}</span>
                    ))}
                  </div>
                  <div className="cl-calendar-grid">
                    {calendarDays.map((date, index) => {
                      if (!date) {
                        return (
                          <span
                            className="cl-calendar-empty"
                            key={`empty-${index}`}
                          />
                        );
                      }
                      const isDisabled = isPastLocalDate(date);
                      const isSelected = selectedCustomDates.includes(date);
                      return (
                        <button
                          key={date}
                          type="button"
                          disabled={isDisabled}
                          title={
                            isDisabled
                              ? 'Fecha no disponible'
                              : 'Seleccione este dia'
                          }
                          className={`cl-calendar-day${
                            isSelected ? ' cl-calendar-day-selected' : ''
                          }${isDisabled ? ' cl-calendar-day-disabled' : ''}`}
                          onMouseDown={event => {
                            event.preventDefault();
                            if (!isDisabled) handleDateMouseDown(date);
                          }}
                          onMouseEnter={() => {
                            if (!isDisabled) handleDateMouseEnter(date);
                          }}
                        >
                          {Number(date.slice(-2))}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="cl-recurrence-confirm">
                  <div>
                    <strong>
                      {selectedCustomDates.length === 0
                        ? 'Seleccione los dias del permiso'
                        : `${selectedCustomDates.length} dia${
                            selectedCustomDates.length === 1 ? '' : 's'
                          } seleccionado${
                            selectedCustomDates.length === 1 ? '' : 's'
                          }`}
                    </strong>
                    <p>
                      Use el horario base para todos los dias. Luego podra
                      ajustar horarios distintos si alguna fecha lo necesita.
                    </p>
                  </div>
                  <button
                    className="cl-generate-recurrence"
                    type="button"
                    onClick={generateRecurringDates}
                  >
                    Confirmar dias seleccionados
                  </button>
                </div>
                {recurrenceOccurrences.length > 0 && (
                  <div className="cl-occurrence-editor">
                    <div className="cl-occurrence-heading">
                      <div>
                        <strong>Ajustar horarios por dia</strong>
                        <p>
                          Opcional: cambie solo las fechas que tendran un
                          horario diferente.
                        </p>
                      </div>
                      <span>{recurrenceOccurrences.length} fechas listas</span>
                    </div>
                    <div className="cl-occurrence-columns">
                      <span>Item</span>
                      <span>Salida</span>
                      <span>Retorno</span>
                    </div>
                    <div className="cl-occurrence-list">
                      {recurrenceOccurrences.map((occurrence, index) => (
                        <div
                          className="cl-occurrence-item"
                          key={`${occurrence.startDate}-${index}`}
                        >
                          <span>{index + 1}</span>
                          <Input
                            type="datetime-local"
                            value={occurrence.startDate}
                            min={formatDateAndHours()}
                            onChange={event =>
                              updateOccurrence(
                                index,
                                'startDate',
                                event.target.value
                              )
                            }
                          />
                          <Input
                            type="datetime-local"
                            value={occurrence.untilDate}
                            min={occurrence.startDate}
                            onChange={event =>
                              updateOccurrence(
                                index,
                                'untilDate',
                                event.target.value
                              )
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {currentStep === 3 && (
              <div className="cl-review-panel">
                <h3>Revise su solicitud</h3>
                {canCreateForUser && (
                  <div>
                    <span>Solicitante</span>
                    <strong>{requesterLabel}</strong>
                  </div>
                )}
                {canCreateForUser &&
                  ownerMode === 'user' &&
                  selectedUsers.length > 1 && (
                    <div className="cl-review-users">
                      <span>Usuarios</span>
                      <ul>
                        {selectedUsers.slice(0, 5).map(user => (
                          <li key={user.id}>{user.name}</li>
                        ))}
                        {selectedUsers.length > 5 && (
                          <li>+ {selectedUsers.length - 5} usuarios mas</li>
                        )}
                      </ul>
                    </div>
                  )}
                {canCreateForUser && (
                  <div>
                    <span>Aprobacion</span>
                    <strong>{approvalLabel}</strong>
                  </div>
                )}
                <div>
                  <span>Solicitud</span>
                  <strong>
                    {requestMode === 'recurring' ? 'Varios dias' : 'Simple'}
                  </strong>
                </div>
                <div>
                  <span>Permiso</span>
                  <strong>{selectedValue || 'Sin seleccionar'}</strong>
                </div>
                <div>
                  <span>Detalle</span>
                  <strong>{getPermissionDetail()}</strong>
                </div>
                <div>
                  <span>Fechas</span>
                  <strong>
                    {requestMode === 'recurring'
                      ? `${recurrenceOccurrences.length} fechas`
                      : 'Una sola fecha'}
                  </strong>
                </div>
                {requestMode === 'recurring' && (
                  <div>
                    <span>Resolucion</span>
                    <strong>
                      {getResolutionDisplayName() || 'Sin archivo'}
                    </strong>
                  </div>
                )}
                {requestMode === 'single' ? (
                  <>
                    <div>
                      <span>Salida</span>
                      <strong>{formatReviewDate(getValues().startDate)}</strong>
                    </div>
                    <div>
                      <span>Retorno</span>
                      <strong>{formatReviewDate(getValues().untilDate)}</strong>
                    </div>
                  </>
                ) : (
                  <div className="cl-review-occurrences">
                    <span>Programacion</span>
                    <ul>
                      {recurrenceOccurrences
                        .slice(0, 5)
                        .map((occurrence, index) => (
                          <li key={`${occurrence.startDate}-${index}`}>
                            <strong>
                              {formatReviewDate(occurrence.startDate)}
                            </strong>
                            <small>
                              Retorno: {formatReviewDate(occurrence.untilDate)}
                            </small>
                          </li>
                        ))}
                      {recurrenceOccurrences.length > 5 && (
                        <li>
                          <strong>
                            + {recurrenceOccurrences.length - 5} fechas mas
                          </strong>
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <>
            <h3 className="input-label">Motivo del permiso:</h3>
            <TextArea {...register('reason')} name="reason" />
          </>
        )}
        {(isFree || (currentStep === 2 && requestMode === 'single')) && (
          <div className="col-input">
            <Input
              label="Fecha y hora de salida:"
              {...register('startDate')}
              name="startDate"
              type="datetime-local"
              min={formatDateAndHours()}
              required
            />
            <Input
              label="Fecha y hora de retorno:"
              {...register('untilDate')}
              name="untilDate"
              type="datetime-local"
              min={startDateValue || formatDateAndHours()}
              required
            />
          </div>
        )}
        {isFree ? (
          <Button type="submit" text="Enviar" />
        ) : (
          <div className="cl-wizard-footer">
            <button type="button" onClick={handleCloseRequest}>
              Cancelar
            </button>
            {currentStep > 1 && (
              <button type="button" onClick={handlePreviousStep}>
                Atras
              </button>
            )}
            {currentStep < 3 ? (
              <button
                type="button"
                onClick={event => {
                  event.preventDefault();
                  event.stopPropagation();
                  handleNextStep();
                }}
              >
                Continuar
              </button>
            ) : (
              <button type="submit">
                {ownerMode === 'user' && selectedUsers.length > 1
                  ? `Enviar ${selectedUsers.length} solicitudes`
                  : 'Enviar solicitud'}
              </button>
            )}
          </div>
        )}
      </form>
    </Modal>
  );
};

export default CardLicense;
