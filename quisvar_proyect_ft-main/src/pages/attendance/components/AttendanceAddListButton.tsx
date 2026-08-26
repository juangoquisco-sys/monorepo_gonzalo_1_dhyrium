import { Plus } from 'lucide-react';
import { AppButton } from '@/components/app-ui/app-button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface AttendanceAddListButtonProps {
  disabled: boolean;
  disabledReason: string | null;
  onClick: () => void;
}

const ButtonContent = () => (
  <>
    <Plus aria-hidden="true" size={14} />
    Añadir lista
  </>
);

export const AttendanceAddListButton = ({
  disabled,
  disabledReason,
  onClick,
}: AttendanceAddListButtonProps) => {
  if (!disabledReason) {
    return (
      <AppButton
        className="h-8 shrink-0 text-xs"
        disabled={disabled}
        onClick={onClick}
      >
        <ButtonContent />
      </AppButton>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className="inline-flex shrink-0"
            tabIndex={0}
            aria-label={`Añadir lista. ${disabledReason}`}
          >
            <AppButton className="h-8 text-xs" disabled>
              <ButtonContent />
            </AppButton>
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-64 text-center">
          {disabledReason}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
