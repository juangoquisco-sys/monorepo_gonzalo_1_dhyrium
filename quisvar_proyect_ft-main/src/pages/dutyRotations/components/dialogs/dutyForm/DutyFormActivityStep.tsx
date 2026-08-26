import {
  Camera,
  CameraOff,
  ClipboardPenLine,
  Images,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';
import { useState } from 'react';
import { AppInput } from '@/components/app-ui/app-input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ATTENDANCE_RECONCILIATION_CAPABILITY } from '../../../dutyRotations.constants';
import type { DutyEvidencePolicy } from '../../../models/dutyRotations.types';
import {
  DutyFormChoiceCard,
  DutyFormStepIntro,
} from './DutyFormStepPrimitives';

interface DutyFormActivityErrors {
  name?: string;
  accessWindowDays?: string;
}

interface DutyFormActivityStepProps {
  name: string;
  description: string;
  capabilityKey: string;
  accessWindowDays: string;
  evidencePolicy: DutyEvidencePolicy;
  errors: DutyFormActivityErrors;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onCapabilityKeyChange: (value: string) => void;
  onAccessWindowDaysChange: (value: string) => void;
  onEvidencePolicyChange: (value: DutyEvidencePolicy) => void;
}

const DutyFormActivityStep = ({
  name,
  description,
  capabilityKey,
  accessWindowDays,
  evidencePolicy,
  errors,
  onNameChange,
  onDescriptionChange,
  onCapabilityKeyChange,
  onAccessWindowDaysChange,
  onEvidencePolicyChange,
}: DutyFormActivityStepProps) => {
  const hasUnrecognizedCapability =
    Boolean(capabilityKey) &&
    capabilityKey !== ATTENDANCE_RECONCILIATION_CAPABILITY;
  const [advancedOpen, setAdvancedOpen] = useState(Boolean(capabilityKey));

  return (
    <section
      className="dutyRotations-formStepPanel"
      aria-labelledby="duty-form-activity-title"
    >
      <DutyFormStepIntro
        eyebrow="Paso 1 de 4"
        title="Define la actividad"
        description="Dale un nombre claro y decide qué debe ocurrir cuando una persona termina su turno."
        icon={ClipboardPenLine}
      />

      <div className="dutyRotations-formSection">
        <div className="dutyRotations-formSectionHeading">
          <div>
            <h3 id="duty-form-activity-title">Información principal</h3>
            <p>Esto es lo que verán las personas en sus turnos.</p>
          </div>
          <span>Obligatorio</span>
        </div>

        <AppInput
          id="duty-name"
          label="Nombre de la actividad"
          value={name}
          placeholder="Ej. Limpieza general del edificio"
          error={errors.name}
          maxLength={120}
          autoComplete="off"
          onChange={event => onNameChange(event.target.value)}
        />

        <div className="grid gap-1.5">
          <Label htmlFor="duty-description">Descripción</Label>
          <Textarea
            id="duty-description"
            value={description}
            placeholder="Explica brevemente qué debe hacerse y qué resultado se espera."
            maxLength={1000}
            onChange={event => onDescriptionChange(event.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Opcional. Evita instrucciones demasiado largas; los bloques se
            configuran en el siguiente paso.
          </p>
        </div>
      </div>

      <div className="dutyRotations-formSection">
        <div className="dutyRotations-formSectionHeading">
          <div>
            <h3>Evidencia al completar</h3>
            <p>Define si el responsable debe adjuntar fotografías.</p>
          </div>
        </div>
        <div className="dutyRotations-formChoiceGrid is-three">
          <DutyFormChoiceCard
            title="Sin fotografías"
            description="La persona solo marca el turno como completado."
            selected={evidencePolicy === 'NONE'}
            onClick={() => onEvidencePolicyChange('NONE')}
            icon={CameraOff}
          />
          <DutyFormChoiceCard
            title="Fotografías opcionales"
            description="Puede adjuntar evidencia si la considera útil."
            selected={evidencePolicy === 'OPTIONAL_PHOTO'}
            onClick={() => onEvidencePolicyChange('OPTIONAL_PHOTO')}
            icon={Camera}
          />
          <DutyFormChoiceCard
            title="Fotografías obligatorias"
            description="Debe adjuntar entre una y tres fotografías."
            selected={evidencePolicy === 'REQUIRED_PHOTO'}
            onClick={() => onEvidencePolicyChange('REQUIRED_PHOTO')}
            icon={Images}
          />
        </div>
      </div>

      <details
        className="dutyRotations-formAdvanced"
        open={advancedOpen}
        onToggle={event => setAdvancedOpen(event.currentTarget.open)}
      >
        <summary>
          <span>
            <SlidersHorizontal aria-hidden="true" />
            Permisos y acceso posterior
          </span>
          <small>Opcional</small>
        </summary>
        <div className="dutyRotations-formAdvancedContent">
          <div>
            <h3>Permiso relacionado</h3>
            <p>
              La mayoría de actividades no requiere un permiso especial. Usa uno
              existente solo cuando el turno habilite otra función del sistema.
            </p>
          </div>
          <div className="dutyRotations-formChoiceGrid">
            <DutyFormChoiceCard
              title="Sin permiso especial"
              description="El turno no habilita funciones adicionales."
              selected={!capabilityKey}
              onClick={() => {
                onCapabilityKeyChange('');
                onAccessWindowDaysChange('14');
              }}
              icon={ShieldCheck}
            />
            <DutyFormChoiceCard
              title="Conciliación de asistencia"
              description="Habilita el acceso temporal a la conciliación."
              selected={capabilityKey === ATTENDANCE_RECONCILIATION_CAPABILITY}
              onClick={() =>
                onCapabilityKeyChange(ATTENDANCE_RECONCILIATION_CAPABILITY)
              }
              icon={ShieldCheck}
            />
          </div>
          {hasUnrecognizedCapability ? (
            <Alert variant="warning">
              <ShieldAlert aria-hidden="true" />
              <AlertTitle>Permiso existente no disponible</AlertTitle>
              <AlertDescription>
                Esta actividad usa un permiso que no está entre las opciones
                administrables. Se conservará mientras no elijas otra opción.
              </AlertDescription>
            </Alert>
          ) : null}
          {capabilityKey ? (
            <AppInput
              id="duty-access-window"
              type="number"
              min={0}
              max={365}
              label="Días de consulta después del cierre"
              helperText="Tiempo durante el que el turno puede seguir habilitando el acceso relacionado."
              value={accessWindowDays}
              error={errors.accessWindowDays}
              onChange={event => onAccessWindowDaysChange(event.target.value)}
            />
          ) : null}
        </div>
      </details>
    </section>
  );
};

export default DutyFormActivityStep;
