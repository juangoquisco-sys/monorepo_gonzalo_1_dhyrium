import './salaryDetailtable.css';
import { useContext, useMemo, useState } from 'react';
import { BiSolidFilePdf } from 'react-icons/bi';
import Button from '@/components/button/Button';
import IndeterminateCheckbox from '@/components/indeterminateCheckbox/IndeterminateCheckbox';
import LoaderForComponent from '@/components/loaderForComponent/LoaderForComponent';
import Table from '@/components/table/Table';
import TableBody from '@/components/table/TableBody';
import TableHead from '@/components/table/TableHead';
import { PiFileTextFill, PiStampBold } from 'react-icons/pi';
import { IoArrowUndo, IoEye, IoTrash } from 'react-icons/io5';
import { TypePayroll } from '../../../interface/payroll.types';
import type {
  Office,
  PayMessages,
  Report,
} from '../../../interface/payroll.types';
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import LabelStatus from '../../../../../../components/labelStatus/LabelStatus';
import SubjectCell from '../../../../../../components/messageCell/SubjectCell';
import SubmitterCell from '../../../../../../components/messageCell/SubmitterCell';
import { MessageStatus } from '../../../../../../models/definitionsMail.models';
import { formatAmountMoneyPEN } from '@/utils/tools';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { axiosInstance } from '@/services/axiosInstance';
import { isOpenButtonDelete$ } from '@/services/sharingSubject';
import { PayrollContext } from '../../context/payrollContext';
import useReportAuthorizedMutation from '../../hooks/useReportAuthorizedMutation';
import PayrollCheckCell from '../../components/payrollCheckCell/PayrollCheckCell';
import { FiMove, FiX } from 'react-icons/fi';
import { useMutation, useQuery } from '@tanstack/react-query';
import { openLiquidationReconciliationDialog } from '@/pages/myTasks/pages/recaudadorGrande/liquidationReconciliation.dialog';

interface SalaryDetailTableProps {
  office: Office | null;
}

interface PenaltySummaryItem {
  userId: number;
  totalAmount: number;
}

interface PenaltySummaryResponse {
  users: PenaltySummaryItem[];
}

interface OrgUnitOption {
  id: string;
  name: string;
  type: string;
  parentId?: string | null;
  children?: OrgUnitOption[];
}

interface AttendanceFineInputProps {
  report: Report;
  disabled?: boolean;
  fallbackValue?: number;
  onSaved: () => void;
}

const AttendanceFineInput = ({
  report,
  disabled,
  fallbackValue = 0,
  onSaved,
}: AttendanceFineInputProps) => {
  const resolvedValue =
    Number(report.attendanceDiscount || 0) || Number(fallbackValue || 0);
  const [value, setValue] = useState(String(resolvedValue));
  const [isSaving, setIsSaving] = useState(false);

  const handleBlur = async () => {
    const nextValue = Number(value || 0);
    const currentValue = Number(report.attendanceDiscount || 0);

    if (Number.isNaN(nextValue)) {
      setValue(String(resolvedValue));
      return;
    }

    if (nextValue === currentValue) return;

    const subtotal = Number(report.subprice || report.price || 0);
    const percentage = Number(report.percentage || 100);
    const earlyPaymentDiscount = Number(report.earlyPaymentDiscount || 0);
    const licensesDiscount = Number(report.licensesDiscount || 0);
    const total =
      subtotal * (percentage / 100) -
      nextValue -
      earlyPaymentDiscount -
      licensesDiscount;

    setIsSaving(true);
    try {
      await axiosInstance.put(
        `/reports/update-items/${report.id}`,
        {
          subtotal,
          total,
          licensesDiscount,
          attendanceDiscount: nextValue,
          earlyPaymentDiscount,
          percentagePayment: percentage,
          isAuthorized: report.isAuthorized,
          preserveRequestedAmount: true,
        },
        { headers: { noLoader: true } }
      );
      SnackbarUtilities.success('Multa actualizada');
      onSaved();
    } catch {
      setValue(String(currentValue));
      SnackbarUtilities.error('No se pudo guardar la multa');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <label className="salaryDetailTable-attendanceFine">
      <span>S/.</span>
      <input
        type="number"
        min="0"
        step="0.01"
        value={value}
        disabled={disabled || isSaving}
        onChange={event => setValue(event.target.value)}
        onBlur={handleBlur}
        onFocus={event => event.target.select()}
      />
    </label>
  );
};

const getReportBaseAmount = (report: Report) =>
  Number(report.subprice || report.price || 0);

const getReportPenaltyAmount = (report: Report, fallbackValue = 0) =>
  Number(report.attendanceDiscount || 0) || Number(fallbackValue || 0);

const getReportPayableAmount = (report: Report, fallbackValue = 0) => {
  const baseAmount = getReportBaseAmount(report);
  const percentage = Number(report.percentage || 100);
  const attendanceDiscount = getReportPenaltyAmount(report, fallbackValue);
  const licensesDiscount = Number(report.licensesDiscount || 0);
  const earlyPaymentDiscount = Number(report.earlyPaymentDiscount || 0);

  return Math.max(
    baseAmount * (percentage / 100) -
      attendanceDiscount -
      licensesDiscount -
      earlyPaymentDiscount,
    0
  );
};

const SalaryDetailTable = ({ office }: SalaryDetailTableProps) => {
  const {
    salaryId,
    payrollQuery,
    typePayroll,
    rowSelection,
    handleRowSelection,
  } = useContext(PayrollContext);
  const [searchParams] = useSearchParams();
  const reportAuthorizedMutation = useReportAuthorizedMutation();
  const navigate = useNavigate();
  const [movingPaymessage, setMovingPaymessage] = useState<PayMessages | null>(
    null
  );
  const [targetOrgUnitId, setTargetOrgUnitId] = useState('');

  // const data = useMemo(() => {
  //   if (!office) return [];
  //   const reports: ReportWithPayroll[] = [];
  //   office.payrolls.forEach(payroll => {
  //     payroll.reports.forEach(report => {
  //       reports.push({ ...report, payroll });
  //     });
  //   });
  //   return reports;
  // }, [office]);

  const handleViewMessage = (id: number) => {
    navigate(
      `/centro-de-usuarios/planillas/${salaryId}/${id}?${new URLSearchParams(
        searchParams
      )}`,
      {
        state: {
          forPay: typePayroll === TypePayroll.UNPAID,
        },
      }
    );
  };

  const handleAuthorizedPayroll = async () => {
    const body = {
      officeId: office?.id,
      payrollId: salaryId,
    };
    await axiosInstance.put(`/payrolls/step-authorized-group`, body, {
      headers: {
        noLoader: true,
      },
    });
    SnackbarUtilities.success('Conformidad aprobada');
    payrollQuery.refetch();
  };

  const handleDeleteMessage = async (id: number) => {
    await axiosInstance.delete(`/payrolls/remove-report/${id}`, {
      headers: {
        noLoader: true,
      },
    });
    SnackbarUtilities.success('Reporte eliminado de la planilla');
    payrollQuery.refetch();
  };

  const orgUnitsQuery = useQuery({
    queryKey: ['org-tree-payroll-move'],
    queryFn: async () => {
      const { data } = await axiosInstance.get<OrgUnitOption[]>('/org/tree', {
        params: { scope: 'directory' },
        headers: { noLoader: true },
      });
      return data;
    },
    enabled: Boolean(movingPaymessage),
  });

  const orgUnitOptions = useMemo(() => {
    const flatten = (
      units: OrgUnitOption[] = [],
      depth = 0
    ): (OrgUnitOption & { label: string })[] =>
      units.flatMap(unit => [
        {
          ...unit,
          label: `${'  '.repeat(depth)}${unit.name}`,
        },
        ...flatten(unit.children || [], depth + 1),
      ]);
    return flatten(orgUnitsQuery.data || []).filter(unit => unit.id);
  }, [orgUnitsQuery.data]);

  const moveOrgUnitMutation = useMutation({
    mutationFn: async ({
      paymessageId,
      unitId,
    }: {
      paymessageId: number;
      unitId: string | null;
    }) => {
      const { data } = await axiosInstance.patch(
        `/payrolls/${salaryId}/paymessages/${paymessageId}/org-unit`,
        { unitId },
        { headers: { noLoader: true } }
      );
      return data;
    },
    onSuccess: () => {
      SnackbarUtilities.success('Unidad actualizada para esta planilla');
      setMovingPaymessage(null);
      setTargetOrgUnitId('');
      payrollQuery.refetch();
    },
    onError: () => {
      SnackbarUtilities.error('No se pudo mover el tramite');
    },
  });

  const openMoveOrgUnit = (paymessage: PayMessages) => {
    setMovingPaymessage(paymessage);
    setTargetOrgUnitId(
      paymessage.orgUnitOverride?.id || paymessage.orgUnit?.id || ''
    );
  };

  const handleSaveMoveOrgUnit = () => {
    if (!movingPaymessage) return;
    moveOrgUnitMutation.mutate({
      paymessageId: movingPaymessage.id,
      unitId: targetOrgUnitId || null,
    });
  };

  const handleReturnToElaboration = async (id: number) => {
    await axiosInstance.put(
      `/payrolls/return-to-elaboration/${id}`,
      {},
      {
        headers: {
          noLoader: true,
        },
      }
    );
    SnackbarUtilities.success('Tramite retrocedido a elaboracion');
    payrollQuery.refetch();
  };

  const handleOpenButtonDelete = (id: number) => {
    isOpenButtonDelete$.setSubject = {
      isOpen: true,
      function: () => handleDeleteMessage(id),
    };
  };

  const handleOpenReturnToElaboration = (id: number) => {
    isOpenButtonDelete$.setSubject = {
      isOpen: true,
      variant: 'warning',
      title: 'Retroceder tramite a elaboracion',
      description:
        'El tramite saldra de Sin conformidad y sus tareas volveran a Elaboracion de planilla con el monto ingresado como referencia.',
      confirmText: 'Si, retroceder',
      cancelText: 'Cancelar',
      function: () => handleReturnToElaboration(id),
    };
  };

  const handleNavigateReport = async (
    reportId: number,
    editValues: boolean = false,
    technicalEvidence: boolean = false
  ) => {
    navigate(`/mis-reportes/${reportId}`, {
      state: {
        editValues,
        noViewSidebar: true,
        navigatePayroll: true,
        technicalEvidence,
      },
    });
  };

  const handleReconcileLiquidation = (
    payMessage: PayMessages,
    report: Report
  ) => {
    openLiquidationReconciliationDialog({
      payrollId: Number(salaryId),
      payMessage,
      report,
      onComplete: () => {
        void payrollQuery.refetch();
      },
    });
  };

  const visibleUserIds = useMemo(
    () =>
      Array.from(
        new Set(
          (office?.payMessages || [])
            .map(paymessage => paymessage.userInit?.user?.id)
            .filter((userId): userId is number => Boolean(userId))
        )
      ),
    [office?.payMessages]
  );

  const penaltySummaryQuery = useQuery({
    queryKey: [
      'salary-detail-penalty-summary',
      salaryId,
      visibleUserIds.join(','),
    ],
    queryFn: async () => {
      const { data } = await axiosInstance.get<PenaltySummaryResponse>(
        `/payrolls/${salaryId}/penalties/summary`,
        {
          params: { userIds: visibleUserIds.join(',') },
          headers: { noLoader: true },
        }
      );
      return data;
    },
    enabled: Boolean(salaryId && visibleUserIds.length),
  });

  const penaltyByUser = useMemo(
    () =>
      new Map(
        (penaltySummaryQuery.data?.users || []).map(item => [
          item.userId,
          item.totalAmount,
        ])
      ),
    [penaltySummaryQuery.data?.users]
  );

  const columnHelper = createColumnHelper<PayMessages>();
  const columns = [
    ...(typePayroll === TypePayroll.APPROVED
      ? [
          columnHelper.display({
            id: 'select',
            header: ({ table }) => (
              <IndeterminateCheckbox
                checked={table.getIsAllRowsSelected()}
                onChange={table.getToggleAllRowsSelectedHandler()}
              />
            ),
            cell: ({ row }) => (
              <IndeterminateCheckbox
                key={row.original.id}
                checked={row.getIsSelected()}
                disabled={!row.getCanSelect()}
                indeterminate={row.getIsSomeSelected()}
                onChange={row.getToggleSelectedHandler()}
              />
            ),
          }),
        ]
      : []),
    columnHelper.accessor(
      ({ userInit }) => ({
        user: userInit
          ? {
              id: userInit.user.id,
              ruc: userInit.user.ruc ?? null,
              address: userInit.user.address ?? '',
              profile: userInit.user.profile,
            }
          : undefined,
        createdAt: new Date(),
      }),
      {
        header: 'Tramitante',
        cell: ({ getValue, row: { original } }) => (
          <div
            className="salaryDetailTable-submitter"
            onContextMenu={event => {
              event.preventDefault();
              openMoveOrgUnit(original);
            }}
            title="Click derecho para mover este tramite a otra unidad en esta planilla"
          >
            <SubmitterCell value={getValue()} />
            <button
              type="button"
              className="salaryDetailTable-moveUnit"
              onClick={() => openMoveOrgUnit(original)}
              title="Mover a otra unidad en esta planilla"
              aria-label="Mover a otra unidad en esta planilla"
            >
              <FiMove size={13} />
            </button>
            {original.orgUnitOverride && (
              <span className="salaryDetailTable-unitOverride">Ajustado</span>
            )}
          </div>
        ),
      }
    ),
    columnHelper.accessor(({ header, title }) => ({ header, title }), {
      header: 'ASUNTO',
      cell: ({ getValue }) => <SubjectCell value={getValue()} />,
    }),
    columnHelper.accessor(row => row.status, {
      id: 'status',
      header: () => 'ESTADO',
      cell: ({ getValue }) => (
        <LabelStatus
          status={MessageStatus[getValue() as keyof typeof MessageStatus]}
        />
      ),
    }),
    columnHelper.accessor(row => row.reports, {
      id: 'attendance-fine',
      header: () => 'MULTA TOTAL',
      cell: ({ getValue, row: { original } }) => {
        const userPenalty = original.userInit?.user?.id
          ? Number(penaltyByUser.get(original.userInit.user.id) || 0)
          : 0;

        return (
          <div className="salaryDetailTable-fines">
            {getValue().map((report, index) => (
              <AttendanceFineInput
                key={`${report.id}-${report.attendanceDiscount}-${
                  index === 0 ? userPenalty : 0
                }`}
                report={report}
                fallbackValue={index === 0 ? userPenalty : 0}
                disabled={
                  original.isAuthorized ||
                  typePayroll !== TypePayroll.UNAPPROVED
                }
                onSaved={() => payrollQuery.refetch()}
              />
            ))}
          </div>
        );
      },
    }),
    columnHelper.accessor(row => row.reports, {
      id: 'reports',
      header: () => 'MONTO ANTES DESC.',
      cell: ({ getValue, row: { original } }) => (
        <div className="salaryDetailTable-reports">
          {getValue().map(report => {
            const openReport = () =>
              handleNavigateReport(
                report.id,
                !office?.status,
                report.name.includes('Puente Mayo')
              );

            return (
              <div
                key={report.id}
                className={`salaryDetailTable-report ${
                  report.type === 'LIQUIDACION'
                    ? 'salaryDetailTable-report--liquidation'
                    : ''
                }`}
              >
                <button
                  type="button"
                  className="salaryDetailTable-report-open"
                  onClick={openReport}
                  title="Ver reporte"
                >
                  <span className="salaryDetailTable-report-main">
                    <span className="salaryDetailTable-report-name">
                      Reporte {report.percentage}%
                    </span>
                    {report.type === 'LIQUIDACION' && (
                      <span className="salaryDetailTable-liquidationBadge">
                        Liquidación
                      </span>
                    )}
                    <span className="salaryDetailTable-report-price">
                      {formatAmountMoneyPEN(getReportBaseAmount(report))}
                    </span>
                  </span>
                  <PiFileTextFill size={17} aria-hidden />
                </button>
                {report.type === 'LIQUIDACION' &&
                  !report.isAuthorized &&
                  typePayroll === TypePayroll.UNAPPROVED && (
                    <Button
                      text="Conciliar"
                      size="xxxs"
                      variant="outline"
                      color="secondary"
                      onClick={() =>
                        handleReconcileLiquidation(original, report)
                      }
                    />
                  )}
                {!original?.isAuthorized && report.type !== 'LIQUIDACION' && (
                  <button
                    type="button"
                    className="salaryDetailTable-report-delete"
                    onClick={() => handleOpenButtonDelete(report.id)}
                    title="Eliminar reporte de la planilla"
                  >
                    <IoTrash size={18} aria-hidden />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ),
    }),
    columnHelper.accessor(row => row.reports, {
      id: 'payable-total',
      header: () => 'TOTAL DESPUÉS DESC.',
      cell: ({ getValue, row: { original } }) => {
        const userPenalty = original.userInit?.user?.id
          ? Number(penaltyByUser.get(original.userInit.user.id) || 0)
          : 0;
        const total = getValue().reduce(
          (sum, report, index) =>
            sum + getReportPayableAmount(report, index === 0 ? userPenalty : 0),
          0
        );

        return (
          <span className="salaryDetailTable-payableTotal">
            {formatAmountMoneyPEN(total)}
          </span>
        );
      },
    }),
    columnHelper.accessor(row => row.id, {
      id: 'actions',
      header: () => 'ACCIÓN',
      cell: ({ getValue, row: { original } }) => (
        <div className="salaryDetailTable-reports">
          <div className="salaryDetailTable-actions">
            <IoEye
              size={21}
              cursor={'pointer'}
              onClick={() => handleViewMessage(getValue())}
            />
            {typePayroll === TypePayroll.UNAPPROVED &&
              !original.isAuthorizedGrop &&
              !original.paymentGroup && (
                <button
                  type="button"
                  className="salaryDetailTable-returnButton"
                  onClick={() => handleOpenReturnToElaboration(getValue())}
                  title="Retroceder a elaboracion"
                >
                  <IoArrowUndo size={16} />
                  <span>Retroceder</span>
                </button>
              )}
          </div>
        </div>
      ),
    }),
    ...(typePayroll === TypePayroll.UNAPPROVED
      ? [
          columnHelper.accessor('isAuthorized', {
            header: () => '',
            cell: PayrollCheckCell,
            meta: {
              sticky: 'right',
            },
          }),
        ]
      : []),
  ];
  const getRowId = (originalRow: PayMessages) => originalRow.id.toString();

  const table = useReactTable({
    data: office?.payMessages || [],
    columns,
    state: {
      rowSelection,
    },
    getRowId,

    enableRowSelection: row => !row.original.paymentGroup,
    onRowSelectionChange: handleRowSelection,
    getCoreRowModel: getCoreRowModel(),
  });

  const isAuthorized = office?.status && !office.statusGroup;

  const isLoading =
    payrollQuery.isFetching || reportAuthorizedMutation.isPending;

  return (
    <div className={`salaryDetailTable salaryDetailTable--${typePayroll}`}>
      <div className="salaryDetailTable-header">
        <h2 className="salaryDetailTable-title">
          {!office ? 'CARGANDO...' : office.name}
        </h2>
        {typePayroll === TypePayroll.UNAPPROVED && (
          <div className="salaryDetailTable-buttons">
            <BiSolidFilePdf size={21} color="red" />
            <Button
              text={'Dar conformidad'}
              leftIcon={<PiStampBold />}
              color={isAuthorized ? 'secondary' : 'gray'}
              onClick={handleAuthorizedPayroll}
              variant={isAuthorized ? 'outline' : 'solid'}
              disabled={!isAuthorized || isLoading}
            />
          </div>
        )}
      </div>
      <div className="table-container">
        {office ? (
          <Table table={table}>
            <TableHead />
            <TableBody<PayMessages>
              rowBackgroundColor={row =>
                typePayroll === TypePayroll.UNPAID
                  ? row.original.paymentColor?.concat('4d')
                  : undefined
              }
            />
          </Table>
        ) : (
          <LoaderForComponent />
        )}
      </div>
      {movingPaymessage && (
        <div className="salaryDetailTable-modalBackdrop">
          <div className="salaryDetailTable-modal">
            <header>
              <div>
                <h3>Mover en esta planilla</h3>
                <p>
                  Cambia solo la agrupacion visual de este tramite. No modifica
                  la oficina principal del organigrama.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMovingPaymessage(null)}
                aria-label="Cerrar"
              >
                <FiX size={18} />
              </button>
            </header>
            <label>
              Unidad organizacional
              <select
                value={targetOrgUnitId}
                onChange={event => setTargetOrgUnitId(event.target.value)}
                disabled={orgUnitsQuery.isFetching}
              >
                <option value="">Automatico por organigrama</option>
                {orgUnitOptions.map(unit => (
                  <option key={unit.id} value={unit.id}>
                    {unit.label}
                  </option>
                ))}
              </select>
            </label>
            <footer>
              <button type="button" onClick={() => setMovingPaymessage(null)}>
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveMoveOrgUnit}
                disabled={moveOrgUnitMutation.isPending}
              >
                {moveOrgUnitMutation.isPending ? 'Guardando...' : 'Guardar'}
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalaryDetailTable;
