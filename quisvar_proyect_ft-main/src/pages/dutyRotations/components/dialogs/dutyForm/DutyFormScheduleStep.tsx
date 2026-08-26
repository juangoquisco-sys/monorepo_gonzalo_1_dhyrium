import {
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  ListChecks,
  Plus,
  Repeat2,
  Trash2,
  UserRound,
  UsersRound,
} from 'lucide-react';
import { AppInput } from '@/components/app-ui/app-input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type {
  DutyAssignmentStrategy,
  DutyFrequency,
  DutySlot,
  DutyWeekday,
} from '../../../models/dutyRotations.types';
import {
  DutyFormChoiceCard,
  DutyFormFieldError,
  DutyFormStepIntro,
} from './DutyFormStepPrimitives';

interface WeekdayOption {
  key: DutyWeekday;
  label: string;
  shortLabel: string;
}

interface DutyFormScheduleErrors {
  validFrom?: string;
  validUntil?: string;
  weekdays?: string;
  monthDays?: string;
  slots?: string;
  allocation?: string;
}

interface DutyFormScheduleStepProps {
  frequency: DutyFrequency;
  assignmentStrategy: DutyAssignmentStrategy;
  validFrom: string;
  validUntil: string;
  weekdays: DutyWeekday[];
  monthDays: string;
  slots: DutySlot[];
  orderedWeekdayOptions: WeekdayOption[];
  weekStartsLabel: string | null;
  errors: DutyFormScheduleErrors;
  onFrequencyChange: (value: DutyFrequency) => void;
  onAssignmentStrategyChange: (value: DutyAssignmentStrategy) => void;
  onValidFromChange: (value: string) => void;
  onValidUntilChange: (value: string) => void;
  onWeekdayToggle: (value: DutyWeekday) => void;
  onMonthDaysChange: (value: string) => void;
  onSlotUpdate: (index: number, label: string) => void;
  onSlotInstructionsChange: (index: number, instructions: string) => void;
  onSlotAdd: () => void;
  onSlotRemove: (index: number) => void;
  onSlotCapacityModeChange: (
    index: number,
    mode: 'FIXED' | 'REMAINDER'
  ) => void;
  onSlotCapacityCountChange: (index: number, count: number) => void;
}

const frequencyChoices: Array<{
  value: DutyFrequency;
  title: string;
  description: string;
  icon: typeof CalendarCheck;
}> = [
  {
    value: 'ONCE',
    title: 'Una sola vez',
    description: 'Una fecha específica y una única ocurrencia.',
    icon: CalendarCheck,
  },
  {
    value: 'DAILY',
    title: 'Diaria',
    description: 'Se repite en los días activos seleccionados.',
    icon: CalendarDays,
  },
  {
    value: 'WEEKLY',
    title: 'Semanal',
    description: 'Un ciclo de siete días desde la fecha inicial.',
    icon: CalendarRange,
  },
  {
    value: 'MONTHLY',
    title: 'Mensual',
    description: 'Ocurre en fechas concretas de cada mes.',
    icon: CalendarClock,
  },
];

const strategyChoices: Array<{
  value: DutyAssignmentStrategy;
  title: string;
  description: string;
  icon: typeof UserRound;
  badge?: string;
}> = [
  {
    value: 'ONE_OWNER_PER_PERIOD',
    title: 'Un responsable por periodo',
    description: 'La misma persona cubre toda la responsabilidad del ciclo.',
    icon: UserRound,
    badge: 'Ideal para llamar lista',
  },
  {
    value: 'ONE_OWNER_PER_SLOT',
    title: 'Un responsable por tarea',
    description: 'Cada tarea genera una asignación independiente.',
    icon: ListChecks,
  },
  {
    value: 'DISTRIBUTE_PARTICIPANTS',
    title: 'Distribuir a todo el equipo',
    description: 'Las personas se reparten entre grupos con cupos definidos.',
    icon: UsersRound,
    badge: 'Ideal para jornadas de limpieza',
  },
];

type DetailedAssignmentStrategy = Exclude<
  DutyAssignmentStrategy,
  'ONE_OWNER_PER_PERIOD'
>;

const slotLanguage = (strategy: DetailedAssignmentStrategy) => {
  if (strategy === 'DISTRIBUTE_PARTICIPANTS') {
    return {
      singular: 'grupo',
      plural: 'Grupos de trabajo',
      description:
        'Define zonas o frentes y cuántas personas necesita cada uno.',
      placeholder: 'Ej. Interior',
    };
  }
  return {
    singular: 'tarea',
    plural: 'Tareas independientes',
    description: 'Cada tarea tendrá su propio responsable en la vista previa.',
    placeholder: 'Ej. Limpiar oficinas',
  };
};

const DutyFormScheduleStep = ({
  frequency,
  assignmentStrategy,
  validFrom,
  validUntil,
  weekdays,
  monthDays,
  slots,
  orderedWeekdayOptions,
  weekStartsLabel,
  errors,
  onFrequencyChange,
  onAssignmentStrategyChange,
  onValidFromChange,
  onValidUntilChange,
  onWeekdayToggle,
  onMonthDaysChange,
  onSlotUpdate,
  onSlotInstructionsChange,
  onSlotAdd,
  onSlotRemove,
  onSlotCapacityModeChange,
  onSlotCapacityCountChange,
}: DutyFormScheduleStepProps) => {
  const language =
    assignmentStrategy === 'ONE_OWNER_PER_PERIOD'
      ? null
      : slotLanguage(assignmentStrategy);
  const startsOnLabel =
    frequency === 'WEEKLY' ? 'Inicio de la rotación' : 'Inicio de vigencia';

  return (
    <section
      className="dutyRotations-formStepPanel"
      aria-labelledby="duty-form-schedule-title"
    >
      <DutyFormStepIntro
        eyebrow="Paso 2 de 4"
        title="Programa el trabajo"
        description="Define cuándo ocurre y cómo se divide la responsabilidad entre las personas."
        icon={Repeat2}
      />

      <div className="dutyRotations-formSection">
        <div className="dutyRotations-formSectionHeading">
          <div>
            <h3 id="duty-form-schedule-title">Frecuencia</h3>
            <p>Elige la opción que mejor representa el calendario real.</p>
          </div>
        </div>
        <div className="dutyRotations-formChoiceGrid is-four">
          {frequencyChoices.map(choice => (
            <DutyFormChoiceCard
              key={choice.value}
              title={choice.title}
              description={choice.description}
              icon={choice.icon}
              selected={frequency === choice.value}
              onClick={() => onFrequencyChange(choice.value)}
            />
          ))}
        </div>

        <div className="dutyRotations-formGrid">
          <AppInput
            id="duty-valid-from"
            type="date"
            label={startsOnLabel}
            value={validFrom}
            error={errors.validFrom}
            onChange={event => onValidFromChange(event.target.value)}
          />
          <AppInput
            id="duty-valid-until"
            type="date"
            min={validFrom}
            label="Fin de vigencia"
            helperText="Opcional. Los periodos parciales no se generan."
            value={validUntil}
            error={errors.validUntil}
            onChange={event => onValidUntilChange(event.target.value)}
          />
        </div>

        {frequency === 'WEEKLY' && weekStartsLabel ? (
          <div className="dutyRotations-cycleHint">
            <CalendarRange aria-hidden="true" />
            <div>
              <strong>El primer ciclo comienza el {weekStartsLabel}.</strong>
              <span>
                Los siguientes empiezan cada siete días desde esta fecha.
              </span>
            </div>
          </div>
        ) : null}

        {frequency === 'DAILY' || frequency === 'WEEKLY' ? (
          <fieldset className="dutyRotations-formFieldset">
            <legend>
              {frequency === 'WEEKLY'
                ? 'Días que comprende el periodo semanal'
                : 'Días activos'}
            </legend>
            <div className="dutyRotations-dayPicker">
              {orderedWeekdayOptions.map(option => (
                <button
                  type="button"
                  key={option.key}
                  className={weekdays.includes(option.key) ? 'is-selected' : ''}
                  aria-pressed={weekdays.includes(option.key)}
                  aria-label={option.label}
                  title={option.label}
                  onClick={() => onWeekdayToggle(option.key)}
                >
                  {option.shortLabel}
                </button>
              ))}
            </div>
            <p>
              {frequency === 'WEEKLY'
                ? 'Estos días forman un solo periodo; no se crearán asignaciones diarias.'
                : 'Se creará una ocurrencia independiente en cada día activo.'}
            </p>
            <DutyFormFieldError>{errors.weekdays}</DutyFormFieldError>
          </fieldset>
        ) : null}

        {frequency === 'MONTHLY' ? (
          <AppInput
            id="duty-month-days"
            label="Días del mes"
            value={monthDays}
            placeholder="1, 15, 31"
            helperText="Sepáralos por coma. Si un mes no contiene una fecha, esa ocurrencia se omite."
            error={errors.monthDays}
            onChange={event => onMonthDaysChange(event.target.value)}
          />
        ) : null}
      </div>

      <div className="dutyRotations-formSection">
        <div className="dutyRotations-formSectionHeading">
          <div>
            <h3>Cómo se organiza el trabajo</h3>
            <p>
              Esta decisión cambia la forma de configurar tareas y
              participantes.
            </p>
          </div>
        </div>
        <div className="dutyRotations-formChoiceGrid is-three">
          {strategyChoices.map(choice => (
            <DutyFormChoiceCard
              key={choice.value}
              title={choice.title}
              description={choice.description}
              icon={choice.icon}
              badge={choice.badge}
              selected={assignmentStrategy === choice.value}
              onClick={() => onAssignmentStrategyChange(choice.value)}
            />
          ))}
        </div>
      </div>

      {language ? (
        <div className="dutyRotations-formSection">
          <div className="dutyRotations-formSectionHeading">
            <div>
              <h3>{language.plural}</h3>
              <p>{language.description}</p>
            </div>
            <span>{slots.length}</span>
          </div>

          <div className="dutyRotations-slotList">
            {slots.map((slot, index) => (
              <article
                className={`dutyRotations-slotConfig${
                  assignmentStrategy === 'DISTRIBUTE_PARTICIPANTS'
                    ? ' is-distributed'
                    : ''
                }`}
                key={`${index}-${slot.key}`}
              >
                <header>
                  <span>
                    {language.singular} {index + 1}
                  </span>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    disabled={slots.length === 1}
                    aria-label={`Eliminar ${language.singular} ${index + 1}`}
                    onClick={() => onSlotRemove(index)}
                  >
                    <Trash2 />
                  </Button>
                </header>
                <div className="dutyRotations-slotFields">
                  <div className="grid gap-1.5">
                    <Label htmlFor={`duty-slot-${index}`}>Nombre</Label>
                    <Input
                      id={`duty-slot-${index}`}
                      value={slot.label}
                      placeholder={language.placeholder}
                      aria-invalid={!slot.label.trim() || undefined}
                      onChange={event =>
                        onSlotUpdate(index, event.target.value)
                      }
                    />
                  </div>
                  {assignmentStrategy === 'DISTRIBUTE_PARTICIPANTS' ? (
                    <>
                      <div className="grid gap-1.5">
                        <Label htmlFor={`duty-slot-mode-${index}`}>Cupo</Label>
                        <Select
                          value={slot.capacity?.mode ?? 'FIXED'}
                          onValueChange={value =>
                            onSlotCapacityModeChange(
                              index,
                              value as 'FIXED' | 'REMAINDER'
                            )
                          }
                        >
                          <SelectTrigger id={`duty-slot-mode-${index}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="FIXED">Cantidad fija</SelectItem>
                            <SelectItem value="REMAINDER">
                              Personal restante
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {slot.capacity?.mode === 'FIXED' ? (
                        <AppInput
                          id={`duty-slot-count-${index}`}
                          type="number"
                          min={1}
                          max={500}
                          label="Personas"
                          aria-label={`Cantidad para ${
                            slot.label || language.singular
                          }`}
                          value={slot.capacity.count}
                          onChange={event =>
                            onSlotCapacityCountChange(
                              index,
                              Math.max(1, Number(event.target.value) || 1)
                            )
                          }
                        />
                      ) : (
                        <div className="dutyRotations-slotRemainder">
                          <UsersRound aria-hidden="true" />
                          <span>
                            Recibirá a todas las personas que queden por
                            asignar.
                          </span>
                        </div>
                      )}
                    </>
                  ) : null}
                  <div className="dutyRotations-slotInstructions">
                    <Label htmlFor={`duty-slot-instructions-${index}`}>
                      Indicaciones <span>(opcional)</span>
                    </Label>
                    <Textarea
                      id={`duty-slot-instructions-${index}`}
                      maxLength={500}
                      rows={2}
                      value={slot.instructions ?? ''}
                      placeholder="Ej. Limpiar lavatorios y trapear el piso."
                      onChange={event =>
                        onSlotInstructionsChange(index, event.target.value)
                      }
                    />
                    <small>{slot.instructions?.length ?? 0}/500</small>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <DutyFormFieldError>{errors.slots}</DutyFormFieldError>
          <DutyFormFieldError>{errors.allocation}</DutyFormFieldError>
          <Button type="button" variant="outline" onClick={onSlotAdd}>
            <Plus /> Agregar {language.singular}
          </Button>
        </div>
      ) : (
        <Alert variant="info">
          <UserRound aria-hidden="true" />
          <AlertTitle>Una asignación por periodo</AlertTitle>
          <AlertDescription>
            Una sola persona quedará a cargo de la actividad completa durante
            cada periodo. No necesitas configurar tareas adicionales.
          </AlertDescription>
        </Alert>
      )}
    </section>
  );
};

export default DutyFormScheduleStep;
