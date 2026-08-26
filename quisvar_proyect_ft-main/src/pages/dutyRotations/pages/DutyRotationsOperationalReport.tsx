import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowDown,
  Calendar,
  Clock,
  FileImage,
  FileText,
  Printer,
  Share2,
} from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import DatePickerCustom from '@/components/datePickerCustom/DatePickerCustom';
import LoaderForComponent from '@/components/loaderForComponent/LoaderForComponent';
import TableNoData from '@/components/table/TableNoData';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import usePrintAndCapture from '@/hooks/usePrintAndCapture';
import usePrintAndGeneratePdf from '@/hooks/usePrintAndGeneratePdf';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import { shareFilesWithDownloadFallback } from '@/utils/shareFiles';
import DutyRotationsPageHeader from '../components/DutyRotationsPageHeader';
import HelpTooltip from '../components/HelpTooltip';
import { dutyAssignmentStatusLabels } from '../dutyRotations.constants';
import {
  dutyRotationQueryKeys,
  refetchDutyRotations,
} from '../dutyRotations.queries';
import {
  formatDutyDateInput,
  formatDutyDisplayDate,
  formatDutyLongDate,
  getDutyUserFullName,
  normalizeDutyDate,
  parseDutyDateInput,
  sortDutyAssignmentsByDate,
} from '../dutyRotations.utils';
import useDutyAssignmentDialog from '../hooks/useDutyAssignmentDialog';
import type {
  DutyAssignmentStatus,
  DutyRotationAssignment,
} from '../models/dutyRotations.types';
import {
  getDutyAssignments,
  getDutyRotations,
  openDutyAssignmentEvidence,
} from '../services/dutyRotations.service';
import '../dutyRotations.css';

const reportStatusOptions = Object.keys(
  dutyAssignmentStatusLabels
) as DutyAssignmentStatus[];

type ReportSortOrder = 'DESC' | 'ASC';

const getMonthRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    dateFrom: formatDutyDateInput(start),
    dateTo: formatDutyDateInput(end),
  };
};

const formatReportDateTime = () =>
  new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());

const formatReportPercent = (value: number, total: number) =>
  total > 0 ? `${Math.round((value / total) * 100)}%` : '0%';

const sortAssignmentsByDateDesc = (assignments: DutyRotationAssignment[]) =>
  [...assignments].sort((firstAssignment, secondAssignment) => {
    const dateDiff =
      new Date(secondAssignment.periodStart).getTime() -
      new Date(firstAssignment.periodStart).getTime();
    if (dateDiff) return dateDiff;
    return firstAssignment.slotLabel.localeCompare(secondAssignment.slotLabel);
  });

const DutyRotationsOperationalReport = () => {
  const queryClient = useQueryClient();
  const assignmentsReportRef = useRef<HTMLDivElement>(null);
  const reportDutyFilterRef = useRef<HTMLDivElement | null>(null);
  const reportStatusFilterRef = useRef<HTMLDivElement | null>(null);
  const reportUserFilterRef = useRef<HTMLDivElement | null>(null);
  const reportExportMenuRef = useRef<HTMLDivElement | null>(null);
  const monthRange = useMemo(() => getMonthRange(), []);
  const [reportStartDate, setReportStartDate] = useState<Date | null>(() =>
    parseDutyDateInput(monthRange.dateFrom)
  );
  const [reportEndDate, setReportEndDate] = useState<Date | null>(() =>
    parseDutyDateInput(monthRange.dateTo)
  );
  const [selectedReportDutyIds, setSelectedReportDutyIds] = useState<string[]>(
    []
  );
  const [selectedReportStatuses, setSelectedReportStatuses] = useState<
    DutyAssignmentStatus[]
  >([]);
  const [selectedReportUserIds, setSelectedReportUserIds] = useState<number[]>(
    []
  );
  const [reportSortOrder, setReportSortOrder] =
    useState<ReportSortOrder>('DESC');
  const [isExportingReportImage, setIsExportingReportImage] = useState(false);
  const [isReportDutyFilterOpen, setIsReportDutyFilterOpen] = useState(false);
  const [isReportStatusFilterOpen, setIsReportStatusFilterOpen] =
    useState(false);
  const [isReportUserFilterOpen, setIsReportUserFilterOpen] = useState(false);
  const [isReportExportMenuOpen, setIsReportExportMenuOpen] = useState(false);
  const [reportDutySearch, setReportDutySearch] = useState('');
  const [reportUserSearch, setReportUserSearch] = useState('');
  const assignmentDialog = useDutyAssignmentDialog();

  const reportRangeComplete = Boolean(reportStartDate && reportEndDate);
  const reportRange = useMemo(
    () => ({
      dateFrom: reportStartDate
        ? formatDutyDateInput(normalizeDutyDate(reportStartDate))
        : monthRange.dateFrom,
      dateTo: reportEndDate
        ? formatDutyDateInput(normalizeDutyDate(reportEndDate))
        : monthRange.dateTo,
    }),
    [monthRange.dateFrom, monthRange.dateTo, reportEndDate, reportStartDate]
  );

  const dutiesQuery = useQuery({
    queryKey: dutyRotationQueryKeys.duties,
    queryFn: getDutyRotations,
  });
  const assignmentsQuery = useQuery({
    queryKey: [
      ...dutyRotationQueryKeys.assignments,
      reportRange.dateFrom,
      reportRange.dateTo,
    ],
    queryFn: () => getDutyAssignments(reportRange),
    enabled: reportRangeComplete,
  });

  const reportDutyOptions = useMemo(
    () =>
      [...(dutiesQuery.data ?? [])].sort((firstDuty, secondDuty) =>
        firstDuty.name.localeCompare(secondDuty.name)
      ),
    [dutiesQuery.data]
  );
  const availableDutyIds = useMemo(
    () => new Set(reportDutyOptions.map(duty => duty.id)),
    [reportDutyOptions]
  );
  const activeReportDutyIds = useMemo(
    () => selectedReportDutyIds.filter(dutyId => availableDutyIds.has(dutyId)),
    [availableDutyIds, selectedReportDutyIds]
  );
  const selectedReportDutyNames = useMemo(
    () =>
      activeReportDutyIds
        .map(
          dutyId =>
            reportDutyOptions.find(duty => duty.id === dutyId)?.name || ''
        )
        .filter(Boolean),
    [activeReportDutyIds, reportDutyOptions]
  );
  const selectedReportStatusLabels = useMemo(
    () =>
      selectedReportStatuses.map(status => dutyAssignmentStatusLabels[status]),
    [selectedReportStatuses]
  );
  const reportDutyAssignmentCounts = useMemo(() => {
    const counts = new Map<string, number>();
    (assignmentsQuery.data ?? []).forEach(assignment => {
      counts.set(assignment.dutyId, (counts.get(assignment.dutyId) ?? 0) + 1);
    });
    return counts;
  }, [assignmentsQuery.data]);
  const filteredReportDutyOptions = useMemo(() => {
    const search = reportDutySearch.trim().toLowerCase();
    if (!search) return reportDutyOptions;
    return reportDutyOptions.filter(duty =>
      duty.name.toLowerCase().includes(search)
    );
  }, [reportDutyOptions, reportDutySearch]);
  const reportDutyFilterLabel = selectedReportDutyNames.length
    ? selectedReportDutyNames.length === 1
      ? selectedReportDutyNames[0]
      : `${selectedReportDutyNames.length} actividades seleccionadas`
    : 'Todas las actividades';
  const reportStatusFilterLabel = selectedReportStatusLabels.length
    ? selectedReportStatusLabels.length === 1
      ? selectedReportStatusLabels[0]
      : `${selectedReportStatusLabels.length} estados seleccionados`
    : 'Todos los estados';
  const showReportDutySearch = reportDutyOptions.length > 6;
  const assignmentsForSelectedDuties = useMemo(
    () =>
      (assignmentsQuery.data ?? []).filter(
        assignment =>
          !activeReportDutyIds.length ||
          activeReportDutyIds.includes(assignment.dutyId)
      ),
    [activeReportDutyIds, assignmentsQuery.data]
  );
  const reportStatusAssignmentCounts = useMemo(() => {
    const counts = new Map<DutyAssignmentStatus, number>();
    assignmentsForSelectedDuties.forEach(assignment => {
      counts.set(assignment.status, (counts.get(assignment.status) ?? 0) + 1);
    });
    return counts;
  }, [assignmentsForSelectedDuties]);
  const assignmentsForSelectedStatuses = useMemo(
    () =>
      assignmentsForSelectedDuties.filter(
        assignment =>
          !selectedReportStatuses.length ||
          selectedReportStatuses.includes(assignment.status)
      ),
    [assignmentsForSelectedDuties, selectedReportStatuses]
  );
  const reportUserOptions = useMemo(() => {
    const usersById = new Map<
      number,
      { id: number; name: string; count: number }
    >();
    assignmentsForSelectedStatuses.forEach(assignment => {
      const currentUser = usersById.get(assignment.assignedUserId);
      usersById.set(assignment.assignedUserId, {
        id: assignment.assignedUserId,
        name: getDutyUserFullName(assignment.assignedUser),
        count: (currentUser?.count ?? 0) + 1,
      });
    });
    return [...usersById.values()].sort((firstUser, secondUser) =>
      firstUser.name.localeCompare(secondUser.name)
    );
  }, [assignmentsForSelectedStatuses]);
  const availableUserIds = useMemo(
    () => new Set(reportUserOptions.map(user => user.id)),
    [reportUserOptions]
  );
  const activeReportUserIds = useMemo(
    () => selectedReportUserIds.filter(userId => availableUserIds.has(userId)),
    [availableUserIds, selectedReportUserIds]
  );
  const selectedReportUserNames = useMemo(
    () =>
      activeReportUserIds
        .map(
          userId =>
            reportUserOptions.find(user => user.id === userId)?.name || ''
        )
        .filter(Boolean),
    [activeReportUserIds, reportUserOptions]
  );
  const filteredReportUserOptions = useMemo(() => {
    const search = reportUserSearch.trim().toLowerCase();
    if (!search) return reportUserOptions;
    return reportUserOptions.filter(user =>
      user.name.toLowerCase().includes(search)
    );
  }, [reportUserOptions, reportUserSearch]);
  const reportUserFilterLabel = selectedReportUserNames.length
    ? selectedReportUserNames.length === 1
      ? selectedReportUserNames[0]
      : `${selectedReportUserNames.length} responsables seleccionados`
    : 'Todos los responsables';
  const showReportUserSearch = reportUserOptions.length > 6;
  const assignmentsForSelectedUsers = useMemo(
    () =>
      assignmentsForSelectedStatuses.filter(
        assignment =>
          !activeReportUserIds.length ||
          activeReportUserIds.includes(assignment.assignedUserId)
      ),
    [activeReportUserIds, assignmentsForSelectedStatuses]
  );
  const assignmentsForReport = useMemo(
    () =>
      reportSortOrder === 'DESC'
        ? sortAssignmentsByDateDesc(assignmentsForSelectedUsers)
        : sortDutyAssignmentsByDate(assignmentsForSelectedUsers),
    [assignmentsForSelectedUsers, reportSortOrder]
  );
  const reportPeriodLabel = `${formatDutyLongDate(
    reportRange.dateFrom
  )} - ${formatDutyLongDate(reportRange.dateTo)}`;
  const reportActivityLabel = selectedReportDutyNames.length
    ? selectedReportDutyNames.join(', ')
    : 'Todas las actividades';
  const reportStatusLabel = selectedReportStatusLabels.length
    ? selectedReportStatusLabels.join(', ')
    : 'Todos los estados';
  const reportUserLabel = selectedReportUserNames.length
    ? selectedReportUserNames.join(', ')
    : 'Todos los responsables';
  const reportExportName = `Turnos de rotaciones - ${reportPeriodLabel} - ${reportActivityLabel} - ${reportStatusLabel} - ${reportUserLabel}`;
  const reportWhatsappMessage = `Comparto el consolidado de turnos de rotaciones del periodo ${reportPeriodLabel}. Actividades: ${reportActivityLabel}. Estados: ${reportStatusLabel}. Responsables: ${reportUserLabel}.`;
  const reportSummary = useMemo(() => {
    const userIds = new Set(
      assignmentsForReport.map(assignment => assignment.assignedUserId)
    );
    const dutyIds = new Set(
      assignmentsForReport.map(assignment => assignment.dutyId)
    );
    return {
      total: assignmentsForReport.length,
      pending: assignmentsForReport.filter(
        assignment => assignment.status === 'PENDING'
      ).length,
      completed: assignmentsForReport.filter(
        assignment => assignment.status === 'COMPLETED'
      ).length,
      openPool: assignmentsForReport.filter(
        assignment => assignment.status === 'OPEN_POOL'
      ).length,
      noShow: assignmentsForReport.filter(
        assignment => assignment.status === 'NO_SHOW'
      ).length,
      users: userIds.size,
      duties: dutyIds.size,
    };
  }, [assignmentsForReport]);
  const reportNoShowPercent = formatReportPercent(
    reportSummary.noShow,
    reportSummary.total
  );
  const reportActionsDisabled =
    assignmentsQuery.isFetching ||
    isExportingReportImage ||
    !assignmentsForReport.length;

  const { downloadImage: downloadReportImage, getImageFile } =
    usePrintAndCapture({
      ref: assignmentsReportRef,
      divName: 'dutyRotations-exportReport',
      imgName: reportExportName,
      width: 1400,
    });
  const generateReportPdf = usePrintAndGeneratePdf({
    ref: assignmentsReportRef,
    divName: 'dutyRotations-exportReport',
    pdfName: reportExportName,
    orientation: 'l',
    width: 1400,
  });
  const printReport = useReactToPrint({
    contentRef: assignmentsReportRef,
    documentTitle: reportExportName,
  });

  useEffect(() => {
    if (
      !isReportDutyFilterOpen &&
      !isReportStatusFilterOpen &&
      !isReportUserFilterOpen &&
      !isReportExportMenuOpen
    ) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const targetNode = event.target as Node;
      if (
        reportDutyFilterRef.current &&
        !reportDutyFilterRef.current.contains(targetNode)
      ) {
        setIsReportDutyFilterOpen(false);
        setReportDutySearch('');
      }
      if (
        reportStatusFilterRef.current &&
        !reportStatusFilterRef.current.contains(targetNode)
      ) {
        setIsReportStatusFilterOpen(false);
      }
      if (
        reportUserFilterRef.current &&
        !reportUserFilterRef.current.contains(targetNode)
      ) {
        setIsReportUserFilterOpen(false);
        setReportUserSearch('');
      }
      if (
        reportExportMenuRef.current &&
        !reportExportMenuRef.current.contains(targetNode)
      ) {
        setIsReportExportMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsReportDutyFilterOpen(false);
        setIsReportStatusFilterOpen(false);
        setIsReportUserFilterOpen(false);
        setIsReportExportMenuOpen(false);
        setReportDutySearch('');
        setReportUserSearch('');
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    isReportDutyFilterOpen,
    isReportExportMenuOpen,
    isReportStatusFilterOpen,
    isReportUserFilterOpen,
  ]);

  const validateReportExport = () => {
    if (!reportRangeComplete) {
      SnackbarUtilities.warning('Seleccione un periodo para exportar');
      return false;
    }
    if (!assignmentsForReport.length) {
      SnackbarUtilities.warning('No hay turnos para exportar en este periodo');
      return false;
    }
    return true;
  };

  const handleDownloadReportImage = async () => {
    if (!validateReportExport()) return;
    try {
      setIsExportingReportImage(true);
      await downloadReportImage();
    } catch (error) {
      console.error('Error generating duty rotations JPG image:', error);
      SnackbarUtilities.error('No se pudo generar la imagen JPG');
    } finally {
      setIsExportingReportImage(false);
    }
  };

  const handleShareReport = async () => {
    if (!validateReportExport()) return;
    try {
      setIsExportingReportImage(true);
      const imageFile = await getImageFile();
      const result = await shareFilesWithDownloadFallback({
        files: [imageFile],
        title: reportExportName,
        message: reportWhatsappMessage,
      });
      if (result === 'DOWNLOADED') {
        SnackbarUtilities.warning(
          'Tu navegador no permite adjuntar la imagen directamente. Se descargó el JPG para enviarlo manualmente.'
        );
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      console.error('Error sharing duty rotations report:', error);
      SnackbarUtilities.error('No se pudo compartir el reporte');
    } finally {
      setIsExportingReportImage(false);
    }
  };

  const toggleReportDuty = (dutyId: string) => {
    setSelectedReportDutyIds(currentDutyIds => {
      const validDutyIds = currentDutyIds.filter(id =>
        availableDutyIds.has(id)
      );
      return validDutyIds.includes(dutyId)
        ? validDutyIds.filter(currentDutyId => currentDutyId !== dutyId)
        : [...validDutyIds, dutyId];
    });
  };
  const toggleReportUser = (userId: number) => {
    setSelectedReportUserIds(currentUserIds => {
      const validUserIds = currentUserIds.filter(id =>
        availableUserIds.has(id)
      );
      return validUserIds.includes(userId)
        ? validUserIds.filter(currentUserId => currentUserId !== userId)
        : [...validUserIds, userId];
    });
  };

  const invalidateRotations = () => refetchDutyRotations(queryClient);

  return (
    <section className="dutyRotations">
      <DutyRotationsPageHeader
        description="Consulta y exporta el reporte operativo de turnos por periodo."
        refreshing={assignmentsQuery.isFetching}
        onRefresh={invalidateRotations}
      />

      <Card className="dutyRotations-configCard">
        <CardHeader className="dutyRotations-configHeader">
          <div>
            <CardTitle className="dutyRotations-titleLine">
              Turnos por periodo
              <HelpTooltip text="Consolida los turnos generados en un rango de fechas. Puedes filtrar por actividad y exportar el reporte." />
            </CardTitle>
            <CardDescription>
              Vista general del plan y su ejecucion.
            </CardDescription>
          </div>
          <div className="dutyRotations-configActions dutyRotations-reportActions">
            <label>
              <span className="dutyRotations-labelLine">
                Periodo
                <HelpTooltip text="Define el rango de fechas que se mostrara en la tabla y en los archivos exportados." />
              </span>
              <DatePickerCustom
                selectsRange
                startDate={reportStartDate}
                endDate={reportEndDate}
                selected={reportStartDate}
                onChange={dates => {
                  const [startDate, endDate] = dates as [
                    Date | null,
                    Date | null
                  ];
                  setReportStartDate(startDate);
                  setReportEndDate(endDate);
                }}
                placeholderText="Selecciona un periodo"
                showIcon
                icon={<Calendar size={15} />}
                fullWidth
              />
            </label>

            <div className="dutyRotations-reportFilter">
              <span className="dutyRotations-labelLine">
                Actividades
                <HelpTooltip text="Filtra el reporte por una o varias actividades. Si eliges Todas, se incluyen todos los turnos del periodo." />
              </span>
              <div
                className="dutyRotations-reportDropdown"
                ref={reportDutyFilterRef}
              >
                <button
                  type="button"
                  className="dutyRotations-reportDropdownTrigger"
                  aria-expanded={isReportDutyFilterOpen}
                  onClick={() => {
                    if (isReportDutyFilterOpen) setReportDutySearch('');
                    setIsReportDutyFilterOpen(!isReportDutyFilterOpen);
                  }}
                >
                  <span>{reportDutyFilterLabel}</span>
                  <ArrowDown />
                </button>
                {isReportDutyFilterOpen && (
                  <div className="dutyRotations-reportFilterOptions">
                    <div className="dutyRotations-reportFilterHeader">
                      <strong>Filtrar actividades</strong>
                      <span>
                        {activeReportDutyIds.length
                          ? `${activeReportDutyIds.length} de ${reportDutyOptions.length}`
                          : 'Todas'}
                      </span>
                    </div>
                    {showReportDutySearch && (
                      <input
                        className="dutyRotations-reportSearch"
                        value={reportDutySearch}
                        onChange={event =>
                          setReportDutySearch(event.target.value)
                        }
                        placeholder="Buscar actividad..."
                      />
                    )}
                    <div className="dutyRotations-reportOptionList">
                      {filteredReportDutyOptions.length ? (
                        filteredReportDutyOptions.map(duty => {
                          const isSelected = activeReportDutyIds.includes(
                            duty.id
                          );
                          return (
                            <button
                              type="button"
                              key={duty.id}
                              className={
                                isSelected
                                  ? 'dutyRotations-reportOption is-selected'
                                  : 'dutyRotations-reportOption'
                              }
                              onClick={() => toggleReportDuty(duty.id)}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                readOnly
                              />
                              <span>{duty.name}</span>
                              <em>
                                {reportDutyAssignmentCounts.get(duty.id) ?? 0}
                              </em>
                            </button>
                          );
                        })
                      ) : (
                        <p className="dutyRotations-reportEmpty">
                          No hay actividades para mostrar.
                        </p>
                      )}
                    </div>
                    <div className="dutyRotations-reportFilterFooter">
                      <button
                        type="button"
                        onClick={() => setSelectedReportDutyIds([])}
                        disabled={!activeReportDutyIds.length}
                      >
                        Limpiar filtro
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedReportDutyIds(
                            reportDutyOptions.map(duty => duty.id)
                          )
                        }
                        disabled={
                          reportDutyOptions.length === 0 ||
                          activeReportDutyIds.length ===
                            reportDutyOptions.length
                        }
                      >
                        Marcar todas
                      </button>
                      <span>
                        {activeReportDutyIds.length
                          ? 'Filtro aplicado automaticamente'
                          : 'Sin filtro aplicado'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="dutyRotations-reportFilter dutyRotations-reportFilter-status">
              <span className="dutyRotations-labelLine">
                Estado
                <HelpTooltip text="Filtra el reporte por el estado actual del turno: asignado, completado, en bolsa o no asistio." />
              </span>
              <div
                className="dutyRotations-reportDropdown"
                ref={reportStatusFilterRef}
              >
                <button
                  type="button"
                  className="dutyRotations-reportDropdownTrigger"
                  aria-expanded={isReportStatusFilterOpen}
                  onClick={() => setIsReportStatusFilterOpen(isOpen => !isOpen)}
                >
                  <span>{reportStatusFilterLabel}</span>
                  <ArrowDown />
                </button>
                {isReportStatusFilterOpen && (
                  <div className="dutyRotations-reportFilterOptions">
                    <div className="dutyRotations-reportFilterHeader">
                      <strong>Filtrar estados</strong>
                      <span>
                        {selectedReportStatuses.length
                          ? `${selectedReportStatuses.length} de ${reportStatusOptions.length}`
                          : 'Todos'}
                      </span>
                    </div>
                    <div className="dutyRotations-reportOptionList">
                      {reportStatusOptions.map(status => {
                        const isSelected =
                          selectedReportStatuses.includes(status);
                        return (
                          <button
                            type="button"
                            key={status}
                            className={
                              isSelected
                                ? 'dutyRotations-reportOption is-selected'
                                : 'dutyRotations-reportOption'
                            }
                            onClick={() =>
                              setSelectedReportStatuses(currentStatuses =>
                                currentStatuses.includes(status)
                                  ? currentStatuses.filter(
                                      currentStatus => currentStatus !== status
                                    )
                                  : [...currentStatuses, status]
                              )
                            }
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              readOnly
                            />
                            <span>{dutyAssignmentStatusLabels[status]}</span>
                            <em>
                              {reportStatusAssignmentCounts.get(status) ?? 0}
                            </em>
                          </button>
                        );
                      })}
                    </div>
                    <div className="dutyRotations-reportFilterFooter">
                      <button
                        type="button"
                        onClick={() => setSelectedReportStatuses([])}
                        disabled={!selectedReportStatuses.length}
                      >
                        Limpiar filtro
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedReportStatuses(reportStatusOptions)
                        }
                        disabled={
                          selectedReportStatuses.length ===
                          reportStatusOptions.length
                        }
                      >
                        Marcar todos
                      </button>
                      <span>
                        {selectedReportStatuses.length
                          ? 'Filtro aplicado automaticamente'
                          : 'Sin filtro aplicado'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="dutyRotations-reportFilter dutyRotations-reportFilter-user">
              <span className="dutyRotations-labelLine">
                Responsable
                <HelpTooltip text="Filtra los turnos por la persona asignada como responsable dentro del periodo seleccionado." />
              </span>
              <div
                className="dutyRotations-reportDropdown"
                ref={reportUserFilterRef}
              >
                <button
                  type="button"
                  className="dutyRotations-reportDropdownTrigger"
                  aria-expanded={isReportUserFilterOpen}
                  onClick={() => {
                    if (isReportUserFilterOpen) setReportUserSearch('');
                    setIsReportUserFilterOpen(!isReportUserFilterOpen);
                  }}
                >
                  <span>{reportUserFilterLabel}</span>
                  <ArrowDown />
                </button>
                {isReportUserFilterOpen && (
                  <div className="dutyRotations-reportFilterOptions">
                    <div className="dutyRotations-reportFilterHeader">
                      <strong>Filtrar responsables</strong>
                      <span>
                        {activeReportUserIds.length
                          ? `${activeReportUserIds.length} de ${reportUserOptions.length}`
                          : 'Todos'}
                      </span>
                    </div>
                    {showReportUserSearch && (
                      <input
                        className="dutyRotations-reportSearch"
                        value={reportUserSearch}
                        onChange={event =>
                          setReportUserSearch(event.target.value)
                        }
                        placeholder="Buscar responsable..."
                      />
                    )}
                    <div className="dutyRotations-reportOptionList">
                      {filteredReportUserOptions.length ? (
                        filteredReportUserOptions.map(user => {
                          const isSelected = activeReportUserIds.includes(
                            user.id
                          );
                          return (
                            <button
                              type="button"
                              key={user.id}
                              className={
                                isSelected
                                  ? 'dutyRotations-reportOption is-selected'
                                  : 'dutyRotations-reportOption'
                              }
                              onClick={() => toggleReportUser(user.id)}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                readOnly
                              />
                              <span>{user.name}</span>
                              <em>{user.count}</em>
                            </button>
                          );
                        })
                      ) : (
                        <p className="dutyRotations-reportEmpty">
                          No hay responsables para mostrar.
                        </p>
                      )}
                    </div>
                    <div className="dutyRotations-reportFilterFooter">
                      <button
                        type="button"
                        onClick={() => setSelectedReportUserIds([])}
                        disabled={!activeReportUserIds.length}
                      >
                        Limpiar filtro
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedReportUserIds(
                            reportUserOptions.map(user => user.id)
                          )
                        }
                        disabled={
                          reportUserOptions.length === 0 ||
                          activeReportUserIds.length ===
                            reportUserOptions.length
                        }
                      >
                        Marcar todos
                      </button>
                      <span>
                        {activeReportUserIds.length
                          ? 'Filtro aplicado automaticamente'
                          : 'Sin filtro aplicado'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <label className="dutyRotations-reportSort">
              <span className="dutyRotations-labelLine">
                Orden
                <HelpTooltip text="Cambia el sentido de lectura de la tabla sin alterar los datos del reporte." />
              </span>
              <Select
                value={reportSortOrder}
                onValueChange={value =>
                  setReportSortOrder(value as ReportSortOrder)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Orden" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DESC">Mas reciente primero</SelectItem>
                  <SelectItem value="ASC">Mas antiguo primero</SelectItem>
                </SelectContent>
              </Select>
            </label>

            <div className="dutyRotations-reportActionGroup">
              <Button
                type="button"
                variant="outline"
                disabled={reportActionsDisabled}
                onClick={handleShareReport}
                title="Comparte el reporte; si el navegador no admite adjuntos, descarga la imagen como alternativa."
              >
                <Share2 />
                {isExportingReportImage ? 'Preparando...' : 'Compartir'}
              </Button>
              <div
                className="dutyRotations-reportDropdown dutyRotations-exportMenu"
                ref={reportExportMenuRef}
              >
                <Button
                  type="button"
                  variant="outline"
                  disabled={reportActionsDisabled}
                  onClick={() => setIsReportExportMenuOpen(isOpen => !isOpen)}
                  title="Descarga o imprime el reporte con los filtros actuales."
                  aria-expanded={isReportExportMenuOpen}
                >
                  <FileText />
                  {isExportingReportImage ? 'Generando...' : 'Exportar'}
                  <ArrowDown />
                </Button>
                {isReportExportMenuOpen && (
                  <div className="dutyRotations-exportMenuOptions">
                    <button
                      type="button"
                      onClick={() => {
                        setIsReportExportMenuOpen(false);
                        handleDownloadReportImage();
                      }}
                    >
                      <FileImage />
                      <span>
                        <strong>Descargar JPG</strong>
                        <small>Imagen del reporte visible</small>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsReportExportMenuOpen(false);
                        if (validateReportExport()) generateReportPdf();
                      }}
                    >
                      <FileText />
                      <span>
                        <strong>Descargar PDF</strong>
                        <small>Archivo listo para enviar</small>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsReportExportMenuOpen(false);
                        if (validateReportExport()) printReport();
                      }}
                    >
                      <Printer />
                      <span>
                        <strong>Imprimir</strong>
                        <small>Abre el dialogo de impresion</small>
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {dutiesQuery.isError || assignmentsQuery.isError ? (
            <div className="dutyRotations-contractError" role="alert">
              <AlertTriangle aria-hidden="true" />
              <div>
                <strong>No se pudo validar el reporte de rotaciones.</strong>
                <span>
                  La respuesta del servidor no coincide con el contrato
                  esperado.
                </span>
              </div>
            </div>
          ) : assignmentsQuery.isLoading ? (
            <LoaderForComponent width={90} variant="transparent" />
          ) : (
            <div ref={assignmentsReportRef}>
              <div className="dutyRotations-exportReport">
                <div className="dutyRotations-reportHero">
                  <div>
                    <span className="dutyRotations-reportEyebrow">
                      Reporte operativo
                    </span>
                    <h2>Rotacion de turnos</h2>
                    <div className="dutyRotations-reportFilterChips">
                      <span>
                        <strong>Periodo</strong>
                        {reportPeriodLabel}
                      </span>
                      <span>
                        <strong>Actividad</strong>
                        {reportActivityLabel}
                      </span>
                      <span>
                        <strong>Estado</strong>
                        {reportStatusLabel}
                      </span>
                      <span>
                        <strong>Responsable</strong>
                        {reportUserLabel}
                      </span>
                    </div>
                  </div>
                  <div className="dutyRotations-reportStamp">
                    <Clock size={16} />
                    <span>Generado</span>
                    <strong>{formatReportDateTime()}</strong>
                  </div>
                </div>

                <div className="dutyRotations-reportStats">
                  <article className="dutyRotations-reportStat-total">
                    <span>Total turnos</span>
                    <strong>{reportSummary.total}</strong>
                    <small>100% del reporte</small>
                  </article>
                  <article className="dutyRotations-reportStat-pending">
                    <span>Pendientes</span>
                    <strong>{reportSummary.pending}</strong>
                    <small>
                      {formatReportPercent(
                        reportSummary.pending,
                        reportSummary.total
                      )}
                    </small>
                  </article>
                  <article className="dutyRotations-reportStat-completed">
                    <span>Completados</span>
                    <strong>{reportSummary.completed}</strong>
                    <small>
                      {formatReportPercent(
                        reportSummary.completed,
                        reportSummary.total
                      )}
                    </small>
                  </article>
                  <article className="dutyRotations-reportStat-noShow">
                    <span>No asistio</span>
                    <strong>{reportSummary.noShow}</strong>
                    <small>{reportNoShowPercent}</small>
                  </article>
                  <article className="dutyRotations-reportStat-openPool">
                    <span>En bolsa</span>
                    <strong>{reportSummary.openPool}</strong>
                    <small>
                      {formatReportPercent(
                        reportSummary.openPool,
                        reportSummary.total
                      )}
                    </small>
                  </article>
                  <article className="dutyRotations-reportStat-neutral">
                    <span>Responsables</span>
                    <strong>{reportSummary.users}</strong>
                    <small>Personas asignadas</small>
                  </article>
                  <article className="dutyRotations-reportStat-neutral">
                    <span>Actividades</span>
                    <strong>{reportSummary.duties}</strong>
                    <small>Reglas incluidas</small>
                  </article>
                </div>

                {!!reportSummary.noShow && (
                  <div className="dutyRotations-reportInsight">
                    <strong>Atencion operativa</strong>
                    <span>
                      {reportSummary.noShow} turno(s) figuran como no asistio,
                      equivalente al {reportNoShowPercent} del reporte filtrado.
                    </span>
                  </div>
                )}

                <div className="dutyRotations-monthTableWrap">
                  <Table className="dutyRotations-reportTable">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="dutyRotations-reportIndex">
                          Nro.
                        </TableHead>
                        <TableHead className="dutyRotations-reportDate">
                          Fecha
                        </TableHead>
                        <TableHead className="dutyRotations-reportSlot">
                          Tarea / zona
                        </TableHead>
                        <TableHead className="dutyRotations-reportDuty">
                          Responsabilidad
                        </TableHead>
                        <TableHead className="dutyRotations-reportUser">
                          Asignado
                        </TableHead>
                        <TableHead className="dutyRotations-reportStatus">
                          Estado
                        </TableHead>
                        <TableHead className="dutyRotations-reportUser">
                          Ejecuto
                        </TableHead>
                        <TableHead>Evidencias</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assignmentsForReport.length ? (
                        assignmentsForReport.map((assignment, index) => {
                          const dutyName = assignment.duty.name;
                          const slotLabel = assignment.slotLabel;
                          const assignedUserName = getDutyUserFullName(
                            assignment.assignedUser
                          );
                          const executedUserName = assignment.executedByUser
                            ? getDutyUserFullName(assignment.executedByUser)
                            : 'Sin registro';

                          return (
                            <TableRow
                              key={assignment.id}
                              className="dutyRotations-clickableRow"
                              onClick={() =>
                                assignmentDialog.openCompleteAssignment(
                                  assignment
                                )
                              }
                            >
                              <TableCell className="dutyRotations-reportIndex">
                                {index + 1}
                              </TableCell>
                              <TableCell className="dutyRotations-reportDate">
                                <span
                                  title={formatDutyDisplayDate(
                                    assignment.periodStart
                                  )}
                                >
                                  {formatDutyDisplayDate(
                                    assignment.periodStart
                                  )}
                                </span>
                              </TableCell>
                              <TableCell className="dutyRotations-reportSlot">
                                <span title={slotLabel}>{slotLabel}</span>
                                {assignment.slotInstructions ? (
                                  <small>{assignment.slotInstructions}</small>
                                ) : null}
                              </TableCell>
                              <TableCell className="dutyRotations-reportDuty">
                                <span title={dutyName}>{dutyName}</span>
                              </TableCell>
                              <TableCell className="dutyRotations-reportUser">
                                <span title={assignedUserName}>
                                  {assignedUserName}
                                </span>
                              </TableCell>
                              <TableCell>
                                {assignment.evidences.length ? (
                                  assignment.evidences.map(
                                    (evidence, evidenceIndex) => (
                                      <Button
                                        key={evidence.id}
                                        size="sm"
                                        variant="outline"
                                        title={evidence.originalName}
                                        onClick={event => {
                                          event.stopPropagation();
                                          void openDutyAssignmentEvidence(
                                            evidence.contentUrl
                                          ).catch(() =>
                                            SnackbarUtilities.error(
                                              'No se pudo abrir la evidencia.'
                                            )
                                          );
                                        }}
                                      >
                                        <FileImage size={14} />{' '}
                                        {evidenceIndex + 1}
                                      </Button>
                                    )
                                  )
                                ) : (
                                  <span className="dutyRotations-reportEmptyValue">
                                    Sin evidencia
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="dutyRotations-reportStatus">
                                <span
                                  className={`dutyRotations-status dutyRotations-status-${assignment.status}`}
                                >
                                  {
                                    dutyAssignmentStatusLabels[
                                      assignment.status
                                    ]
                                  }
                                </span>
                              </TableCell>
                              <TableCell className="dutyRotations-reportUser">
                                <span
                                  className={
                                    assignment.executedByUser
                                      ? undefined
                                      : 'dutyRotations-reportEmptyValue'
                                  }
                                  title={executedUserName}
                                >
                                  {executedUserName}
                                </span>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={8}>
                            <TableNoData text="No hay turnos para mostrar." />
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
};

export default DutyRotationsOperationalReport;
