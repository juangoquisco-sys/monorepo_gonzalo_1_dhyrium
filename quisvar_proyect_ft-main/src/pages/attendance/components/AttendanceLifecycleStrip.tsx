import type { ReactNode } from 'react';
import type { AttendanceListState } from '../attendance.types';

interface AttendanceLifecycleStripProps {
  state: AttendanceListState;
  icon: ReactNode;
  eyebrow: string;
  title: string;
  detail: string;
  actions?: ReactNode;
}

const stateStyles: Record<AttendanceListState, string> = {
  OPEN: 'border-info/35 bg-info-muted/60',
  REVIEW: 'border-review/35 bg-review-muted/60',
  FINALIZED: 'border-success/30 bg-success-muted/60',
};

const iconStyles: Record<AttendanceListState, string> = {
  OPEN: 'bg-background text-info',
  REVIEW: 'bg-background text-review',
  FINALIZED: 'bg-background text-success',
};

export const AttendanceLifecycleStrip = ({
  state,
  icon,
  eyebrow,
  title,
  detail,
  actions,
}: AttendanceLifecycleStripProps) => (
  <section
    className={`mt-3 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-lg border px-3 py-2.5 md:grid-cols-[auto_minmax(0,1fr)_auto] ${stateStyles[state]}`}
    aria-label={`${eyebrow}: ${title}`}
  >
    <span
      className={`grid size-9 shrink-0 place-items-center rounded-md shadow-sm ${iconStyles[state]}`}
      aria-hidden="true"
    >
      {icon}
    </span>

    <div className="min-w-0">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="text-xs font-medium text-muted-foreground">
          {eyebrow}
        </span>
        <strong className="text-sm font-semibold text-foreground">
          {title}
        </strong>
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>
    </div>

    {actions ? (
      <div className="col-span-2 flex flex-wrap justify-end gap-2 md:col-span-1">
        {actions}
      </div>
    ) : null}
  </section>
);
