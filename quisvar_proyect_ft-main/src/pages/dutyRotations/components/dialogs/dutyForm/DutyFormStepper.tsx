import { Check } from 'lucide-react';
import { dutyFormSteps, type DutyFormStep } from './dutyFormSteps';

interface DutyFormStepperProps {
  currentStep: DutyFormStep;
  unlockedStepIndex: number;
  completedSteps: Set<DutyFormStep>;
  onStepChange: (step: DutyFormStep) => void;
  isEditing: boolean;
}

const DutyFormStepper = ({
  currentStep,
  unlockedStepIndex,
  completedSteps,
  onStepChange,
  isEditing,
}: DutyFormStepperProps) => {
  const currentIndex = dutyFormSteps.findIndex(step => step.id === currentStep);

  return (
    <nav
      className="dutyRotations-dutyStepper"
      aria-label="Pasos de la actividad"
    >
      <ol>
        {dutyFormSteps.map((step, index) => {
          const isCurrent = step.id === currentStep;
          const isComplete =
            completedSteps.has(step.id) && index < currentIndex;
          const isAvailable = index <= unlockedStepIndex;
          const visibleLabel =
            isEditing && step.id === 'review' ? 'Revisar cambios' : step.label;

          return (
            <li key={step.id}>
              <button
                type="button"
                className={`${isCurrent ? 'is-current' : ''}${
                  isComplete ? ' is-complete' : ''
                }`}
                aria-current={isCurrent ? 'step' : undefined}
                disabled={!isAvailable}
                onClick={() => onStepChange(step.id)}
              >
                <span aria-hidden="true">
                  {isComplete ? <Check /> : index + 1}
                </span>
                <strong>{visibleLabel}</strong>
                <small>{step.shortLabel}</small>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default DutyFormStepper;
