import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import LoaderForComponent from '@/components/loaderForComponent/LoaderForComponent';
import TableNoData from '@/components/table/TableNoData';
import { AppPageShell } from '@/components/app-ui/app-page-shell';
import AttendanceReconciliation from '../controlAttendance/AttendanceReconciliation';
import type {
  DutyRotationEntitlement,
  DutyUser,
} from './models/dutyRotations.types';
import { getMyDutyEntitlements } from './services/dutyRotations.service';

const ATTENDANCE_RECONCILIATION_CAPABILITY = 'attendance.reconciliation';

const formatDateInput = (value: string) => value.slice(0, 10);

const formatDisplayDate = (value?: string) =>
  value
    ? new Intl.DateTimeFormat('es-PE', {
        dateStyle: 'medium',
      }).format(new Date(`${formatDateInput(value)}T12:00:00`))
    : '-';

const fullDutyUserName = (user?: DutyUser | null) => {
  const profile = user?.profile;
  return (
    `${profile?.firstName ?? ''} ${profile?.lastName ?? ''}`.trim() ||
    user?.email ||
    ''
  );
};

const overlapsEntitlementPeriod = (
  entitlement: DutyRotationEntitlement,
  current: DutyRotationEntitlement
) =>
  entitlement.periodStart <= current.periodEnd &&
  entitlement.periodEnd >= current.periodStart;

const DutyRotationAttendanceRepair = () => {
  const [searchParams] = useSearchParams();
  const assignmentId = searchParams.get('assignmentId');
  const entitlementsQuery = useQuery({
    queryKey: [
      'duty-rotations',
      'my-entitlements',
      ATTENDANCE_RECONCILIATION_CAPABILITY,
    ],
    queryFn: () => getMyDutyEntitlements(ATTENDANCE_RECONCILIATION_CAPABILITY),
  });

  const entitlement = useMemo(() => {
    const entitlements = entitlementsQuery.data ?? [];
    return (
      entitlements.find(item => item.assignment.id === assignmentId) ??
      entitlements[0]
    );
  }, [assignmentId, entitlementsQuery.data]);

  const responsibleLabel = useMemo(() => {
    if (!entitlement) return '';
    const entitlements = entitlementsQuery.data ?? [];
    const names = entitlements
      .filter(
        item =>
          item.capabilityKey === ATTENDANCE_RECONCILIATION_CAPABILITY &&
          overlapsEntitlementPeriod(item, entitlement)
      )
      .flatMap(item => [
        fullDutyUserName(item.assignment.assignedUser),
        fullDutyUserName(item.assignment.executedByUser),
      ])
      .filter(Boolean);
    return Array.from(new Set(names)).join(', ');
  }, [entitlement, entitlementsQuery.data]);

  if (entitlementsQuery.isLoading) {
    return (
      <AppPageShell className="px-5 py-5">
        <LoaderForComponent width={100} variant="transparent" />
      </AppPageShell>
    );
  }

  if (entitlementsQuery.isError) {
    return (
      <AppPageShell className="px-5 py-5">
        <div className="dutyRotations-contractError" role="alert">
          No se pudo validar la responsabilidad que habilita esta correccion.
        </div>
      </AppPageShell>
    );
  }

  if (!entitlement) {
    return (
      <AppPageShell className="px-5 py-5">
        <TableNoData text="No tienes una responsabilidad abierta para corregir faltas." />
      </AppPageShell>
    );
  }

  const initialRange = {
    dateFrom: formatDateInput(entitlement.periodStart),
    dateTo: formatDateInput(entitlement.periodEnd),
  };

  return (
    <AttendanceReconciliation
      initialRange={initialRange}
      lockRange
      headerContext={{
        eyebrow: 'Responsabilidad asignada por rotaciones',
        title: entitlement.assignment.duty.name,
        description:
          'Este acceso se habilita por tu turno de rotaciones y solo aplica al periodo asignado.',
        periodLabel:
          entitlement.coverageLabel ||
          `${formatDisplayDate(entitlement.periodStart)} - ${formatDisplayDate(
            entitlement.periodEnd
          )}`,
        deadlineLabel: formatDisplayDate(entitlement.accessDeadline),
        responsibleLabel,
      }}
    />
  );
};

export default DutyRotationAttendanceRepair;
