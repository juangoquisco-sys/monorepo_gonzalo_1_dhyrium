import {
  ArrowClockwise24Regular,
  ErrorCircle24Regular,
} from '@fluentui/react-icons';

import { AppButton } from '@/components/app-ui/app-button';

interface RecaudadorGrandeStateProps {
  title: string;
  description: string;
  onRetry?: () => void;
}

export const RecaudadorGrandeState = ({
  title,
  description,
  onRetry,
}: RecaudadorGrandeStateProps) => (
  <section className="grid min-h-48 place-items-center rounded-lg border border-dashed border-border bg-card p-8 text-center">
    <div className="grid max-w-lg justify-items-center gap-2">
      <ErrorCircle24Regular className="text-muted-foreground" aria-hidden />
      <strong className="text-base text-foreground">{title}</strong>
      <p className="text-sm text-muted-foreground">{description}</p>
      {onRetry && (
        <AppButton
          className="mt-2"
          size="sm"
          variant="outline"
          onClick={onRetry}
        >
          <ArrowClockwise24Regular aria-hidden />
          Reintentar
        </AppButton>
      )}
    </div>
  </section>
);

export const RecaudadorGrandeLoading = ({ label }: { label: string }) => (
  <div
    className="grid min-h-48 place-items-center text-sm text-muted-foreground"
    role="status"
  >
    <span className="animate-pulse">{label}</span>
  </div>
);
