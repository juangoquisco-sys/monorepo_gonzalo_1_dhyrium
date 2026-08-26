import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface DutyFormStepIntroProps {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

export const DutyFormStepIntro = ({
  eyebrow,
  title,
  description,
  icon: Icon,
}: DutyFormStepIntroProps) => (
  <header className="dutyRotations-formStepIntro">
    <span className="dutyRotations-formStepIcon" aria-hidden="true">
      <Icon />
    </span>
    <div>
      <span className="dutyRotations-formStepEyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  </header>
);

interface DutyFormChoiceCardProps {
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
  icon?: LucideIcon;
  disabled?: boolean;
  badge?: string;
}

export const DutyFormChoiceCard = ({
  title,
  description,
  selected,
  onClick,
  icon: Icon,
  disabled = false,
  badge,
}: DutyFormChoiceCardProps) => (
  <button
    type="button"
    className={`dutyRotations-formChoice${selected ? ' is-selected' : ''}`}
    aria-pressed={selected}
    disabled={disabled}
    onClick={onClick}
  >
    {Icon ? (
      <span className="dutyRotations-formChoiceIcon" aria-hidden="true">
        <Icon />
      </span>
    ) : null}
    <span className="dutyRotations-formChoiceCopy">
      <span className="dutyRotations-formChoiceTitle">
        <strong>{title}</strong>
        {badge ? <small>{badge}</small> : null}
      </span>
      <span>{description}</span>
    </span>
  </button>
);

interface DutyFormFieldErrorProps {
  id?: string;
  children?: ReactNode;
}

export const DutyFormFieldError = ({ id, children }: DutyFormFieldErrorProps) =>
  children ? (
    <p className="dutyRotations-formFieldError" id={id} role="alert">
      {children}
    </p>
  ) : null;
