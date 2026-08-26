import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
} from 'react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { AppButton } from '@/components/app-ui/app-button';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import { createUuid } from '@/utils/createUuid';
import type { DutyDialogHandleGetter } from '../../dutyRotations.dialogs';
import { DutyRotationContractError } from '../../dutyRotations.contract';
import { dutyWeekdayOptions } from '../../dutyRotations.constants';
import {
  formatDutyDateInput,
  getDutyUserFullName,
} from '../../dutyRotations.utils';
import {
  dutyRotationQueryKeys,
  refetchDutyRotations,
} from '../../dutyRotations.queries';
import useDutyRotationUsers from '../../hooks/useDutyRotationUsers';
import type {
  DutyAssignmentStrategy,
  DutyDraft,
  DutyEvidencePolicy,
  DutyFrequency,
  DutyParticipantSource,
  DutyRoleOption,
  DutySlot,
  DutyWeekday,
  ValidDutyRotation,
} from '../../models/dutyRotations.types';
import {
  createDutyRotation,
  getDutyRotationRoles,
  previewDutyRotation,
  previewDutyRotationEdit,
  updateDutyRotation,
} from '../../services/dutyRotations.service';
import DutyFormActivityStep from './dutyForm/DutyFormActivityStep';
import DutyFormLiveSummary from './dutyForm/DutyFormLiveSummary';
import DutyFormParticipantsStep from './dutyForm/DutyFormParticipantsStep';
import DutyFormReviewStep from './dutyForm/DutyFormReviewStep';
import DutyFormScheduleStep from './dutyForm/DutyFormScheduleStep';
import DutyFormStepper from './dutyForm/DutyFormStepper';
import { dutyFormSteps, type DutyFormStep } from './dutyForm/dutyFormSteps';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const operationalWeekdays: DutyWeekday[] = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
];

const weekdaysByUtcDay: DutyWeekday[] = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
];

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const PREVIEW_DEBOUNCE_MS = 350;
const PERIOD_SLOT: DutySlot = { key: 'period', label: 'Periodo completo' };

const today = () => formatDutyDateInput(new Date());

const normalizeSlotKey = (label: string, index: number) => {
  const base = label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 54);
  return `${base || 'bloque'}-${index + 1}`;
};

const recurrenceWeekdays = (duty: ValidDutyRotation | null) => {
  const rule = duty?.recurrenceRule;
  if (rule?.frequency === 'DAILY' || rule?.frequency === 'WEEKLY') {
    return rule.weekdays;
  }
  return operationalWeekdays;
};

const initialSlots = (duty: ValidDutyRotation | null): DutySlot[] =>
  duty?.recurrenceRule.slots?.length
    ? duty.recurrenceRule.slots
    : [{ key: 'bloque-1', label: '' }];

const initialMonthDays = (duty: ValidDutyRotation | null) =>
  duty?.recurrenceRule.frequency === 'MONTHLY'
    ? duty.recurrenceRule.daysOfMonth.join(', ')
    : '1';

const isValidDateInput = (value: string) => {
  if (!DATE_ONLY_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
};

const weekdayFromDateInput = (value: string): DutyWeekday | null => {
  if (!isValidDateInput(value)) return null;
  return weekdaysByUtcDay[new Date(`${value}T00:00:00.000Z`).getUTCDay()];
};

const orderedWeekdayOptionsFrom = (weekStartsOn: DutyWeekday) => {
  const startIndex = dutyWeekdayOptions.findIndex(
    option => option.key === weekStartsOn
  );
  return [
    ...dutyWeekdayOptions.slice(startIndex),
    ...dutyWeekdayOptions.slice(0, startIndex),
  ];
};

const moveItem = <T,>(items: T[], from: number, to: number) => {
  if (to < 0 || to >= items.length || from === to) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
};

const hasErrors = (errors: Record<string, string | undefined>) =>
  Object.values(errors).some(Boolean);

const useDebouncedValue = <T,>(value: T, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedValue(value), delay);
    return () => window.clearTimeout(timeout);
  }, [delay, value]);

  return debouncedValue;
};

interface DutyFormDialogProps {
  duty: ValidDutyRotation | null;
  getDialogHandle: DutyDialogHandleGetter;
}

const DutyFormDialog = ({ duty, getDialogHandle }: DutyFormDialogProps) => {
  const queryClient = useQueryClient();
  const formBodyRef = useRef<HTMLDivElement>(null);
  const submissionStartedRef = useRef(false);
  const { activeUsers: users, usersQuery } = useDutyRotationUsers();
  const rolesQuery = useQuery({
    queryKey: dutyRotationQueryKeys.roles,
    queryFn: getDutyRotationRoles,
    staleTime: 5 * 60 * 1000,
  });

  const [requestKey] = useState(createUuid);
  const [currentStep, setCurrentStep] = useState<DutyFormStep>(
    duty ? 'review' : 'activity'
  );
  const [unlockedStepIndex, setUnlockedStepIndex] = useState(
    duty ? dutyFormSteps.length - 1 : 0
  );
  const [attemptedSteps, setAttemptedSteps] = useState<Set<DutyFormStep>>(
    () => new Set()
  );
  const [name, setName] = useState(duty?.name ?? '');
  const [description, setDescription] = useState(duty?.description ?? '');
  const [capabilityKey, setCapabilityKey] = useState(duty?.capabilityKey ?? '');
  const [accessWindowDays, setAccessWindowDays] = useState(
    String(duty?.accessWindowDays ?? 14)
  );
  const [frequency, setFrequency] = useState<DutyFrequency>(
    duty?.frequency ?? 'WEEKLY'
  );
  const [assignmentStrategy, setAssignmentStrategy] =
    useState<DutyAssignmentStrategy>(
      duty?.assignmentStrategy ?? 'ONE_OWNER_PER_PERIOD'
    );
  const [strategyWasChosen, setStrategyWasChosen] = useState(Boolean(duty));
  const [participantSource, setParticipantSource] =
    useState<DutyParticipantSource>(duty?.participantSource ?? 'EXPLICIT');
  const [evidencePolicy, setEvidencePolicy] = useState<DutyEvidencePolicy>(
    duty?.evidencePolicy ?? 'NONE'
  );
  const [validFrom, setValidFrom] = useState(
    duty?.validFrom.slice(0, 10) ?? today()
  );
  const [validUntil, setValidUntil] = useState(
    duty?.validUntil?.slice(0, 10) ?? ''
  );
  const [weekdays, setWeekdays] = useState<DutyWeekday[]>(
    recurrenceWeekdays(duty)
  );
  const [monthDays, setMonthDays] = useState(initialMonthDays(duty));
  const [slots, setSlots] = useState<DutySlot[]>(initialSlots(duty));
  const [participantIds, setParticipantIds] = useState<number[]>(
    duty?.participants.map(participant => participant.userId) ?? []
  );
  const [userSearch, setUserSearch] = useState('');
  const [selectedEffectiveFrom, setSelectedEffectiveFrom] = useState('');

  const parsedMonthDays = useMemo(
    () =>
      [
        ...new Set(
          monthDays
            .split(',')
            .map(value => Number(value.trim()))
            .filter(
              value => Number.isInteger(value) && value >= 1 && value <= 31
            )
        ),
      ].sort((first, second) => first - second),
    [monthDays]
  );

  const normalizedSlots = useMemo(() => {
    if (assignmentStrategy === 'ONE_OWNER_PER_PERIOD') return [PERIOD_SLOT];
    return slots
      .map((slot, index) => ({
        key: normalizeSlotKey(slot.label, index),
        label: slot.label.trim(),
        ...(slot.instructions?.trim()
          ? { instructions: slot.instructions.trim() }
          : {}),
        ...(assignmentStrategy === 'DISTRIBUTE_PARTICIPANTS' && slot.capacity
          ? { capacity: slot.capacity }
          : {}),
        ...(assignmentStrategy === 'DISTRIBUTE_PARTICIPANTS' &&
        slot.eligibleParticipantIds?.length
          ? { eligibleParticipantIds: slot.eligibleParticipantIds }
          : {}),
      }))
      .filter(slot => slot.label);
  }, [assignmentStrategy, slots]);

  const orderedWeekdayOptions =
    frequency === 'WEEKLY'
      ? orderedWeekdayOptionsFrom(weekdayFromDateInput(validFrom) ?? 'MONDAY')
      : dutyWeekdayOptions;
  const weekStartsLabel =
    frequency === 'WEEKLY'
      ? orderedWeekdayOptions[0]?.label.toLowerCase() ?? null
      : null;

  const draft = useMemo<DutyDraft>(() => {
    const recurrence: DutyDraft['recurrence'] =
      frequency === 'ONCE'
        ? { frequency, date: validFrom, slots: normalizedSlots }
        : frequency === 'MONTHLY'
        ? { frequency, daysOfMonth: parsedMonthDays, slots: normalizedSlots }
        : { frequency, weekdays, slots: normalizedSlots };

    return {
      name: name.trim(),
      description: description.trim() || null,
      capabilityKey: capabilityKey.trim() || null,
      accessWindowDays: capabilityKey ? Number(accessWindowDays) : 14,
      assignmentStrategy,
      participantSource,
      evidencePolicy,
      validFrom,
      validUntil: validUntil || null,
      recurrence,
      participantIds,
      excludedOccurrenceKeys: duty?.excludedOccurrenceKeys ?? [],
    };
  }, [
    accessWindowDays,
    assignmentStrategy,
    capabilityKey,
    description,
    duty?.excludedOccurrenceKeys,
    evidencePolicy,
    frequency,
    name,
    normalizedSlots,
    parsedMonthDays,
    participantIds,
    participantSource,
    validFrom,
    validUntil,
    weekdays,
  ]);

  const activityErrors = useMemo(
    () => ({
      name: name.trim() ? undefined : 'Escribe un nombre para la actividad.',
      accessWindowDays:
        !capabilityKey ||
        (Number.isInteger(Number(accessWindowDays)) &&
          Number(accessWindowDays) >= 0 &&
          Number(accessWindowDays) <= 365)
          ? undefined
          : 'Ingresa un número entero entre 0 y 365.',
    }),
    [accessWindowDays, capabilityKey, name]
  );

  const scheduleErrors = useMemo(() => {
    const remainderSlots = slots.filter(
      slot => slot.capacity?.mode === 'REMAINDER'
    ).length;
    const capacityMissing = slots.some(slot => !slot.capacity);
    return {
      validFrom: isValidDateInput(validFrom)
        ? undefined
        : 'Selecciona una fecha inicial válida.',
      validUntil:
        !validUntil ||
        (isValidDateInput(validUntil) &&
          isValidDateInput(validFrom) &&
          validUntil >= validFrom)
          ? undefined
          : 'La fecha final debe ser igual o posterior al inicio.',
      weekdays:
        frequency === 'ONCE' || frequency === 'MONTHLY' || weekdays.length > 0
          ? undefined
          : 'Selecciona al menos un día.',
      monthDays:
        frequency !== 'MONTHLY' || parsedMonthDays.length > 0
          ? undefined
          : 'Ingresa al menos un día válido entre 1 y 31.',
      slots:
        assignmentStrategy === 'ONE_OWNER_PER_PERIOD' ||
        (slots.length > 0 && slots.every(slot => slot.label.trim()))
          ? undefined
          : 'Asigna un nombre a cada bloque antes de continuar.',
      allocation:
        assignmentStrategy !== 'DISTRIBUTE_PARTICIPANTS' ||
        (!capacityMissing && remainderSlots === 1)
          ? undefined
          : 'La distribución necesita exactamente un grupo de personal restante y cupos en los demás grupos.',
    };
  }, [
    assignmentStrategy,
    frequency,
    parsedMonthDays.length,
    slots,
    validFrom,
    validUntil,
    weekdays.length,
  ]);

  const participantErrors = useMemo(() => {
    const fixedCapacity = slots.reduce(
      (total, slot) =>
        total + (slot.capacity?.mode === 'FIXED' ? slot.capacity.count : 0),
      0
    );
    return {
      participants: participantIds.length
        ? undefined
        : 'Agrega al menos una persona para generar la rotación.',
      allocation:
        assignmentStrategy !== 'DISTRIBUTE_PARTICIPANTS' ||
        fixedCapacity <= participantIds.length
          ? undefined
          : `Los cupos fijos requieren ${fixedCapacity} personas, pero solo hay ${participantIds.length}.`,
    };
  }, [assignmentStrategy, participantIds.length, slots]);

  const activityReady = !hasErrors(activityErrors);
  const scheduleReady = !hasErrors(scheduleErrors);
  const participantsReady = !hasErrors(participantErrors);
  const isDraftReady = activityReady && scheduleReady && participantsReady;
  const previewDraft = useDebouncedValue(draft, PREVIEW_DEBOUNCE_MS);
  const isPreviewDraftCurrent = previewDraft === draft;

  const previewQuery = useQuery({
    queryKey: [...dutyRotationQueryKeys.preview, previewDraft],
    queryFn: ({ signal }) => previewDutyRotation(previewDraft, signal),
    enabled: isDraftReady && isPreviewDraftCurrent,
    retry: false,
  });

  const currentPreview =
    isDraftReady && isPreviewDraftCurrent ? previewQuery.data : undefined;
  const previewIsUpdating =
    isDraftReady && (!isPreviewDraftCurrent || previewQuery.isFetching);

  const futureOccurrenceKeys = useMemo(() => {
    const currentDate = today();
    return [
      ...new Set(
        (currentPreview?.occurrences ?? [])
          .map(occurrence => occurrence.occurrenceKey)
          .filter(key => key > currentDate)
      ),
    ];
  }, [currentPreview]);
  const effectiveFrom = futureOccurrenceKeys.includes(selectedEffectiveFrom)
    ? selectedEffectiveFrom
    : futureOccurrenceKeys[0] ?? '';

  const impactQuery = useQuery({
    queryKey: [
      ...dutyRotationQueryKeys.preview,
      'edit',
      duty?.id,
      previewDraft,
      effectiveFrom,
    ],
    queryFn: ({ signal }) =>
      previewDutyRotationEdit(
        duty!.id,
        {
          draft: previewDraft,
          effectiveFrom,
          expectedVersion: duty!.configurationVersion,
          requestKey,
        },
        signal
      ),
    enabled: Boolean(
      duty && isDraftReady && isPreviewDraftCurrent && effectiveFrom
    ),
    retry: false,
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      duty
        ? updateDutyRotation(duty.id, {
            draft,
            effectiveFrom,
            expectedVersion: duty.configurationVersion,
            requestKey,
          })
        : createDutyRotation(draft, requestKey),
    onSuccess: async result => {
      await refetchDutyRotations(queryClient);
      SnackbarUtilities.success(
        duty
          ? `Actividad actualizada. ${
              result.reconciliation?.createdCount ?? 0
            } turno(s) regenerado(s).`
          : `Actividad creada. ${
              result.reconciliation?.createdCount ?? 0
            } turno(s) generado(s) automáticamente.`
      );
      getDialogHandle()?.close();
    },
    onError: error => {
      submissionStartedRef.current = false;
      SnackbarUtilities.error(
        error instanceof DutyRotationContractError
          ? error.message
          : 'No se pudo guardar la actividad. Revisa tu conexión e inténtalo nuevamente.'
      );
    },
  });

  const usersById = useMemo(
    () => new Map(users.map(user => [user.id, user])),
    [users]
  );
  const persistedUsersById = useMemo(
    () =>
      new Map(
        (duty?.participants ?? []).flatMap(participant =>
          participant.user
            ? [[participant.userId, participant.user] as const]
            : []
        )
      ),
    [duty?.participants]
  );
  const selectedUsers = useMemo(
    () =>
      participantIds.flatMap(userId => {
        const user = usersById.get(userId) ?? persistedUsersById.get(userId);
        return user ? [user] : [];
      }),
    [participantIds, persistedUsersById, usersById]
  );
  const availableUsers = useMemo(() => {
    const selectedIds = new Set(participantIds);
    const search = userSearch.trim().toLocaleLowerCase('es');
    return users.filter(user => {
      if (selectedIds.has(user.id)) return false;
      if (!search) return true;
      const searchableText = [
        getDutyUserFullName(user),
        user.email,
        user.role?.name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('es');
      return searchableText.includes(search);
    });
  }, [participantIds, userSearch, users]);

  const addUsersFromRole = (role: DutyRoleOption) => {
    const roleUserIds = users
      .filter(user => user.roleId === role.id)
      .map(user => user.id);
    setParticipantIds(current => [...new Set([...current, ...roleUserIds])]);
  };

  const applyActiveRoster = () => {
    const ids = users.map(user => user.id);
    const activeIds = new Set(ids);
    setParticipantIds(ids);
    setSlots(current =>
      current.map(slot => ({
        ...slot,
        eligibleParticipantIds: slot.eligibleParticipantIds?.filter(userId =>
          activeIds.has(userId)
        ),
      }))
    );
  };

  const changeParticipantSource = (next: DutyParticipantSource) => {
    setParticipantSource(next);
    if (next === 'ACTIVE_ELIGIBLE_SYNC') applyActiveRoster();
  };

  const changeFrequency = (next: DutyFrequency) => {
    setFrequency(next);
    if (!strategyWasChosen) {
      setAssignmentStrategy(
        next === 'WEEKLY' ? 'ONE_OWNER_PER_PERIOD' : 'ONE_OWNER_PER_SLOT'
      );
    }
  };

  const changeAssignmentStrategy = (next: DutyAssignmentStrategy) => {
    setStrategyWasChosen(true);
    setAssignmentStrategy(next);
    if (next !== 'DISTRIBUTE_PARTICIPANTS') return;
    setSlots(current =>
      current.map((slot, index) => ({
        ...slot,
        capacity:
          slot.capacity ??
          (index === current.length - 1
            ? { mode: 'REMAINDER' as const }
            : { mode: 'FIXED' as const, count: 1 }),
      }))
    );
  };

  const toggleWeekday = (weekday: DutyWeekday) => {
    setWeekdays(current =>
      current.includes(weekday)
        ? current.filter(item => item !== weekday)
        : [...current, weekday]
    );
  };

  const updateSlot = (index: number, label: string) => {
    setSlots(current =>
      current.map((slot, slotIndex) =>
        slotIndex === index ? { ...slot, label } : slot
      )
    );
  };

  const updateSlotInstructions = (index: number, instructions: string) => {
    setSlots(current =>
      current.map((slot, slotIndex) =>
        slotIndex === index ? { ...slot, instructions } : slot
      )
    );
  };

  const addSlot = () => {
    setSlots(current => [
      ...current,
      {
        key: `bloque-${current.length + 1}`,
        label: '',
        ...(assignmentStrategy === 'DISTRIBUTE_PARTICIPANTS'
          ? { capacity: { mode: 'FIXED' as const, count: 1 } }
          : {}),
      },
    ]);
  };

  const removeSlot = (index: number) => {
    setSlots(current => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const changeSlotCapacityMode = (
    index: number,
    mode: 'FIXED' | 'REMAINDER'
  ) => {
    setSlots(current =>
      current.map((slot, slotIndex) => {
        if (mode === 'REMAINDER') {
          if (slotIndex === index) {
            return { ...slot, capacity: { mode: 'REMAINDER' } };
          }
          if (slot.capacity?.mode === 'REMAINDER') {
            return { ...slot, capacity: { mode: 'FIXED', count: 1 } };
          }
          return slot;
        }
        return slotIndex === index
          ? { ...slot, capacity: { mode: 'FIXED', count: 1 } }
          : slot;
      })
    );
  };

  const changeSlotCapacityCount = (index: number, count: number) => {
    setSlots(current =>
      current.map((slot, slotIndex) =>
        slotIndex === index
          ? { ...slot, capacity: { mode: 'FIXED', count } }
          : slot
      )
    );
  };

  const removeParticipant = (userId: number) => {
    setParticipantIds(current => current.filter(id => id !== userId));
    setSlots(current =>
      current.map(slot => ({
        ...slot,
        eligibleParticipantIds: slot.eligibleParticipantIds?.filter(
          id => id !== userId
        ),
      }))
    );
  };

  const toggleSlotEligibility = (index: number, userId: number) => {
    setSlots(current =>
      current.map((slot, slotIndex) => {
        if (slotIndex !== index) return slot;
        const selected = slot.eligibleParticipantIds ?? [];
        return {
          ...slot,
          eligibleParticipantIds: selected.includes(userId)
            ? selected.filter(id => id !== userId)
            : [...selected, userId],
        };
      })
    );
  };

  const clearSlotEligibility = (index: number) => {
    setSlots(current =>
      current.map((slot, slotIndex) =>
        slotIndex === index
          ? { ...slot, eligibleParticipantIds: undefined }
          : slot
      )
    );
  };

  const stepErrors: Record<DutyFormStep, Record<string, string | undefined>> = {
    activity: activityErrors,
    schedule: scheduleErrors,
    participants: participantErrors,
    review: {},
  };

  const completedSteps = useMemo(() => {
    const completed = new Set<DutyFormStep>();
    if (activityReady) completed.add('activity');
    if (scheduleReady) completed.add('schedule');
    if (participantsReady) completed.add('participants');
    if (currentPreview?.occurrences.length) completed.add('review');
    return completed;
  }, [
    activityReady,
    currentPreview?.occurrences.length,
    participantsReady,
    scheduleReady,
  ]);

  const showStep = (step: DutyFormStep) => {
    setCurrentStep(step);
    formBodyRef.current?.scrollTo({ top: 0 });
  };

  const handleStepChange = (step: DutyFormStep) => {
    const targetIndex = dutyFormSteps.findIndex(item => item.id === step);
    if (targetIndex > unlockedStepIndex) return;
    showStep(step);
  };

  const markStepAttempted = (step: DutyFormStep) => {
    setAttemptedSteps(current => new Set(current).add(step));
  };

  const handleContinue = (event?: MouseEvent<HTMLButtonElement>) => {
    event?.preventDefault();
    markStepAttempted(currentStep);
    if (hasErrors(stepErrors[currentStep])) {
      SnackbarUtilities.error(
        'Revisa los campos señalados antes de continuar.'
      );
      return;
    }
    const currentIndex = dutyFormSteps.findIndex(
      step => step.id === currentStep
    );
    const nextStep = dutyFormSteps[currentIndex + 1];
    if (!nextStep) return;
    setUnlockedStepIndex(value => Math.max(value, currentIndex + 1));
    showStep(nextStep.id);
  };

  const handleBack = () => {
    const currentIndex = dutyFormSteps.findIndex(
      step => step.id === currentStep
    );
    const previousStep = dutyFormSteps[currentIndex - 1];
    if (previousStep) showStep(previousStep.id);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (currentStep !== 'review') {
      handleContinue();
      return;
    }
    if (submissionStartedRef.current) return;
    setAttemptedSteps(new Set(dutyFormSteps.map(step => step.id)));

    if (!activityReady) {
      showStep('activity');
      return;
    }
    if (!scheduleReady) {
      showStep('schedule');
      return;
    }
    if (!participantsReady) {
      showStep('participants');
      return;
    }
    if (!currentPreview?.occurrences.length) {
      SnackbarUtilities.error(
        'La configuración no produce ocurrencias completas.'
      );
      return;
    }
    if (duty && (!effectiveFrom || !impactQuery.data)) {
      SnackbarUtilities.error(
        'Espera la previsualización del impacto antes de guardar.'
      );
      return;
    }
    submissionStartedRef.current = true;
    saveMutation.mutate();
  };

  const currentStepIndex = dutyFormSteps.findIndex(
    step => step.id === currentStep
  );
  const visibleActivityErrors = attemptedSteps.has('activity')
    ? activityErrors
    : {};
  const visibleScheduleErrors = attemptedSteps.has('schedule')
    ? scheduleErrors
    : {};
  const previewError =
    isPreviewDraftCurrent && previewQuery.isError
      ? previewQuery.error
      : impactQuery.isError
      ? impactQuery.error
      : null;
  const previewErrorMessage = previewError
    ? previewError instanceof Error
      ? previewError.message
      : 'No se pudo validar la vista previa de la actividad.'
    : undefined;
  const reviewPreview = duty ? impactQuery.data?.preview : currentPreview;
  const reviewLoading =
    previewIsUpdating || Boolean(duty && impactQuery.isFetching);
  const saveDisabled =
    saveMutation.isPending ||
    reviewLoading ||
    Boolean(previewErrorMessage) ||
    !reviewPreview?.occurrences.length ||
    Boolean(duty && (!effectiveFrom || !impactQuery.data));

  return (
    <form className="dutyRotations-dutyForm" onSubmit={handleSubmit}>
      <DutyFormStepper
        currentStep={currentStep}
        unlockedStepIndex={unlockedStepIndex}
        completedSteps={completedSteps}
        onStepChange={handleStepChange}
        isEditing={Boolean(duty)}
      />

      <div className="dutyRotations-dutyFormBody" ref={formBodyRef}>
        <div className="dutyRotations-dutyFormWorkspace">
          <main className="dutyRotations-dutyFormMain">
            {currentStep === 'activity' ? (
              <DutyFormActivityStep
                name={name}
                description={description}
                capabilityKey={capabilityKey}
                accessWindowDays={accessWindowDays}
                evidencePolicy={evidencePolicy}
                errors={visibleActivityErrors}
                onNameChange={setName}
                onDescriptionChange={setDescription}
                onCapabilityKeyChange={setCapabilityKey}
                onAccessWindowDaysChange={setAccessWindowDays}
                onEvidencePolicyChange={setEvidencePolicy}
              />
            ) : null}

            {currentStep === 'schedule' ? (
              <DutyFormScheduleStep
                frequency={frequency}
                assignmentStrategy={assignmentStrategy}
                validFrom={validFrom}
                validUntil={validUntil}
                weekdays={weekdays}
                monthDays={monthDays}
                slots={slots}
                orderedWeekdayOptions={orderedWeekdayOptions}
                weekStartsLabel={weekStartsLabel}
                errors={visibleScheduleErrors}
                onFrequencyChange={changeFrequency}
                onAssignmentStrategyChange={changeAssignmentStrategy}
                onValidFromChange={setValidFrom}
                onValidUntilChange={setValidUntil}
                onWeekdayToggle={toggleWeekday}
                onMonthDaysChange={setMonthDays}
                onSlotUpdate={updateSlot}
                onSlotInstructionsChange={updateSlotInstructions}
                onSlotAdd={addSlot}
                onSlotRemove={removeSlot}
                onSlotCapacityModeChange={changeSlotCapacityMode}
                onSlotCapacityCountChange={changeSlotCapacityCount}
              />
            ) : null}

            {currentStep === 'participants' ? (
              <DutyFormParticipantsStep
                participantSource={participantSource}
                assignmentStrategy={assignmentStrategy}
                participantIds={participantIds}
                selectedUsers={selectedUsers}
                availableUsers={availableUsers}
                userSearch={userSearch}
                roles={rolesQuery.data ?? []}
                slots={slots}
                participantsError={
                  attemptedSteps.has('participants')
                    ? participantErrors.participants
                    : undefined
                }
                allocationError={
                  attemptedSteps.has('participants')
                    ? participantErrors.allocation
                    : undefined
                }
                usersLoading={usersQuery.isLoading}
                usersError={usersQuery.isError}
                rolesLoading={rolesQuery.isLoading}
                rolesError={rolesQuery.isError}
                onParticipantSourceChange={changeParticipantSource}
                onUserSearchChange={setUserSearch}
                onAddUser={userId =>
                  setParticipantIds(current =>
                    current.includes(userId) ? current : [...current, userId]
                  )
                }
                onAddRole={addUsersFromRole}
                onMoveParticipant={(from, to) =>
                  setParticipantIds(current => moveItem(current, from, to))
                }
                onRemoveParticipant={removeParticipant}
                onApplyActiveRoster={applyActiveRoster}
                onRetryUsers={() => void usersQuery.refetch()}
                onRetryRoles={() => void rolesQuery.refetch()}
                onToggleSlotEligibility={toggleSlotEligibility}
                onClearSlotEligibility={clearSlotEligibility}
              />
            ) : null}

            {currentStep === 'review' ? (
              <DutyFormReviewStep
                isEditing={Boolean(duty)}
                name={name}
                description={description}
                frequency={frequency}
                assignmentStrategy={assignmentStrategy}
                evidencePolicy={evidencePolicy}
                capabilityKey={capabilityKey}
                accessWindowDays={Number(accessWindowDays)}
                validFrom={validFrom}
                validUntil={validUntil}
                participantCount={participantIds.length}
                slots={slots}
                preview={reviewPreview}
                previewLoading={reviewLoading}
                previewErrorMessage={previewErrorMessage}
                futureOccurrenceKeys={futureOccurrenceKeys}
                effectiveFrom={effectiveFrom}
                impact={impactQuery.data}
                onEffectiveFromChange={setSelectedEffectiveFrom}
                onEditStep={showStep}
              />
            ) : null}
          </main>

          <DutyFormLiveSummary
            name={name}
            frequency={frequency}
            assignmentStrategy={assignmentStrategy}
            evidencePolicy={evidencePolicy}
            validFrom={validFrom}
            validUntil={validUntil}
            participantCount={participantIds.length}
            slots={slots}
            preview={currentPreview}
            previewLoading={previewIsUpdating}
            previewError={Boolean(previewErrorMessage)}
          />
        </div>
      </div>

      <footer className="dutyRotations-dutyDialogFooter">
        <div>
          <span>
            Paso {currentStepIndex + 1} de {dutyFormSteps.length}
          </span>
          <strong>{dutyFormSteps[currentStepIndex]?.label}</strong>
        </div>
        <div className="dutyRotations-dutyDialogActions">
          <AppButton
            type="button"
            variant="ghost"
            onClick={() => getDialogHandle()?.close()}
          >
            Cancelar
          </AppButton>
          {currentStepIndex > 0 ? (
            <AppButton type="button" variant="outline" onClick={handleBack}>
              <ArrowLeft /> Atrás
            </AppButton>
          ) : null}
          {currentStepIndex < dutyFormSteps.length - 1 ? (
            <AppButton key="continue" type="button" onClick={handleContinue}>
              Continuar <ArrowRight />
            </AppButton>
          ) : (
            <AppButton key="submit" type="submit" disabled={saveDisabled}>
              {saveMutation.isPending ? (
                'Guardando…'
              ) : duty ? (
                <>
                  <Check /> Confirmar cambios futuros
                </>
              ) : (
                <>
                  <Check /> Crear actividad y turnos
                </>
              )}
            </AppButton>
          )}
        </div>
      </footer>
    </form>
  );
};

export default DutyFormDialog;
