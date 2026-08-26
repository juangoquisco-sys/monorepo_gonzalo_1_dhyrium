import { useEffect, useMemo, useRef, useState } from 'react';
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  PiFileJpgFill,
  PiFilePdfFill,
  PiFileXlsFill,
  PiPrinterFill,
  PiShareNetworkFill,
} from 'react-icons/pi';
import Button from '@/components/button/Button';
import CloseIcon from '@/components/closeIcon/CloseIcon';
import DivFlex from '@/components/divFlex/DivFlex';
import LoaderForComponent from '@/components/loaderForComponent/LoaderForComponent';
import Modal from '@/components/portal/Modal';
import Table from '@/components/table/Table';
import TableBody from '@/components/table/TableBody';
import TableHead from '@/components/table/TableHead';
import TableNoData from '@/components/table/TableNoData';
import { axiosInstance } from '@/services/axiosInstance';
import SummaryStat from '../../../../components/summaryStat/SummaryStat';
import { downloadBlob } from '@/utils/tools';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import {
  convertTo12HourFormat,
  formatDateUtc,
  formatFullDayDateUtc,
} from '@/utils/dayjsSpanish';
import usePrintAndCapture from '@/hooks/usePrintAndCapture';
import usePrintAndGeneratePdf from '@/hooks/usePrintAndGeneratePdf';
import { useReactToPrint } from 'react-to-print';
import {
  getDeliveryStatusHistoryChipClass,
  getDeliveryStatusHistoryLabel,
} from '../../interfaces/kitchenHistory.types';
import { DeliveryStatus } from '../../../formMealOrder/interfaces/mealOrder.types';
import type {
  HistoryFilters,
  KitchenHistoryRow,
  KitchenHistoryUserDetailRecord,
  KitchenHistoryUserDetailResponse,
} from '../../interfaces/kitchenHistory.types';
import {
  generateKitchenUserHistoryExcelReport,
  getKitchenLicenseJustificationText,
} from '../../excelReport';
import './historyUserModal.css';

interface HistoryUserModalProps {
  isOpen: boolean;
  user: KitchenHistoryRow | null;
  filters: Pick<
    HistoryFilters,
    'dateFrom' | 'dateTo' | 'mealType' | 'pickupStatus'
  >;
  onClose: () => void;
}

const evaluableDeliveryStatuses = [
  DeliveryStatus.PICKED_UP,
  DeliveryStatus.NOT_PICKED_UP,
  DeliveryStatus.RESERVED,
  DeliveryStatus.PENDING_PICKUP,
];

const HistoryUserModal = ({
  isOpen,
  user,
  filters,
  onClose,
}: HistoryUserModalProps) => {
  const [data, setData] = useState<KitchenHistoryUserDetailResponse | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const detailRef = useRef<HTMLDivElement>(null);
  const columnHelper = createColumnHelper<KitchenHistoryUserDetailRecord>();

  useEffect(() => {
    const getUserHistory = async () => {
      if (!isOpen || !user) {
        setData(null);
        return;
      }

      try {
        setIsLoading(true);
        const response =
          await axiosInstance.get<KitchenHistoryUserDetailResponse>(
            `/kitchen/history/user/${user.userId}`,
            {
              params: {
                dateFrom: filters.dateFrom,
                dateTo: filters.dateTo,
                mealType: filters.mealType,
              },
              headers: {
                noLoader: true,
              },
            }
          );

        setData(response.data);
      } catch (error) {
        setData(null);
      } finally {
        setIsLoading(false);
      }
    };

    getUserHistory();
  }, [filters.dateFrom, filters.dateTo, filters.mealType, isOpen, user]);

  const columns = useMemo(
    () => [
      columnHelper.accessor('date', {
        header: 'FECHA',
        cell: ({ getValue }) => (
          <DivFlex justifyContent="center">
            {formatDateUtc(getValue())}{' '}
          </DivFlex>
        ),
      }),
      columnHelper.accessor('mealType', {
        header: 'COMIDA',
        cell: ({ getValue }) => (
          <DivFlex justifyContent="center">{getValue()} </DivFlex>
        ),
      }),
      columnHelper.accessor('mealHour', {
        header: 'HORA',
        cell: ({ getValue }) => (
          <DivFlex justifyContent="center">
            {convertTo12HourFormat(getValue())}
          </DivFlex>
        ),
      }),
      columnHelper.accessor('amountOfFood', {
        header: 'CANTIDAD',
        cell: ({ getValue }) => (
          <DivFlex justifyContent="center">
            <span className="historyUserModal-amountChip">{getValue()}</span>
          </DivFlex>
        ),
      }),
      columnHelper.accessor('comment', {
        header: 'COMENTARIO',
        cell: ({ getValue }) => {
          const comment = getValue() || 'Sin comentario';
          return (
            <span className="historyUserModal-comment" title={comment}>
              {comment}
            </span>
          );
        },
      }),
      columnHelper.accessor('deliveryStatus', {
        header: 'ESTADO',
        cell: ({ getValue, row }) => {
          const justification = getKitchenLicenseJustificationText(
            row.original
          );
          return (
            <DivFlex
              flexDirection="column"
              alignItems="center"
              gap={0}
              pv={0.3}
            >
              <span
                title={justification}
                className={`kitchenHistory-chip ${getDeliveryStatusHistoryChipClass(
                  getValue()
                )}`}
              >
                {getDeliveryStatusHistoryLabel(getValue())}
              </span>
              {row.original.licenseJustification && (
                <span
                  className="historyUserModal-licenseBadge"
                  title={justification}
                >
                  Con permiso
                </span>
              )}
            </DivFlex>
          );
        },
      }),
    ],
    [columnHelper]
  );

  const latestIncident = data?.records.find(
    record => record.deliveryStatus === DeliveryStatus.NOT_PICKED_UP
  );
  const records = data?.records ?? [];
  const visibleRecords = useMemo(() => {
    if (filters.pickupStatus === DeliveryStatus.NO_SERVICE) {
      return records.filter(
        record => record.deliveryStatus === DeliveryStatus.NO_SERVICE
      );
    }

    if (filters.pickupStatus === DeliveryStatus.MISSED_CLOSE) {
      return records.filter(
        record => record.deliveryStatus === DeliveryStatus.MISSED_CLOSE
      );
    }

    if (filters.pickupStatus === DeliveryStatus.OPEN) {
      return records.filter(
        record => record.deliveryStatus === DeliveryStatus.OPEN
      );
    }

    return records.filter(record =>
      evaluableDeliveryStatuses.includes(record.deliveryStatus)
    );
  }, [filters.pickupStatus, records]);
  const isOperationalDetail =
    filters.pickupStatus === DeliveryStatus.NO_SERVICE ||
    filters.pickupStatus === DeliveryStatus.MISSED_CLOSE ||
    filters.pickupStatus === DeliveryStatus.OPEN;

  const table = useReactTable({
    data: visibleRecords,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const sanitizeFileName = (value: string) =>
    value.replace(/[\\/:*?"<>|]/g, '-').trim();
  const exportName = sanitizeFileName(
    `Historial cocina - ${user?.fullName || 'Usuario'}`
  );
  const whatsappMessage = `Comparto el ${exportName}.`;

  const handlePrint = useReactToPrint({
    contentRef: detailRef,
    documentTitle: exportName,
  });

  const { downloadImage, getImageFile } = usePrintAndCapture({
    ref: detailRef,
    divName: 'historyUserModal-exportArea',
    imgName: exportName,
    width: 1100,
  });

  const handleGeneratePdf = usePrintAndGeneratePdf({
    ref: detailRef,
    divName: 'historyUserModal-exportArea',
    pdfName: exportName,
    orientation: 'l',
    width: 1100,
  });

  const validateExportAction = () => {
    if (!visibleRecords.length) {
      SnackbarUtilities.warning('No hay datos para exportar');
      return false;
    }

    return true;
  };

  const canShareFiles = (file: File) => {
    if (typeof navigator === 'undefined' || !navigator.share) return false;
    if (typeof navigator.canShare !== 'function') return false;

    try {
      return navigator.canShare({ files: [file] });
    } catch {
      return false;
    }
  };

  const isShareCancelled = (error: unknown) =>
    error instanceof Error && error.name === 'AbortError';

  const openWhatsAppFallback = () => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(
      whatsappMessage
    )}`;
    const openedWindow = window.open(whatsappUrl, '_blank');

    if (!openedWindow) {
      throw new Error('No se pudo abrir WhatsApp');
    }
  };

  const handleDownloadJpg = async () => {
    if (!validateExportAction()) return;

    try {
      setIsExportingImage(true);
      await downloadImage();
    } catch (error) {
      console.error('Error generating JPG image:', error);
      SnackbarUtilities.error('No se pudo generar la imagen JPG');
    } finally {
      setIsExportingImage(false);
    }
  };

  const handleShareToWhatsApp = async () => {
    if (!validateExportAction()) return;

    try {
      setIsExportingImage(true);
      const imageFile = await getImageFile();

      if (canShareFiles(imageFile)) {
        await navigator.share({
          files: [imageFile],
          title: exportName,
          text: whatsappMessage,
        });
        return;
      }

      downloadBlob(imageFile, imageFile.name);
      openWhatsAppFallback();
      SnackbarUtilities.warning(
        'Tu navegador no permite adjuntar la imagen directo. Se descargó el JPG para enviarlo manualmente.'
      );
    } catch (error) {
      if (isShareCancelled(error)) return;

      console.error('Error sharing image to WhatsApp:', error);
      SnackbarUtilities.error('No se pudo compartir por WhatsApp');
    } finally {
      setIsExportingImage(false);
    }
  };

  const handleGenerate = (type: 'pdf' | 'print') => {
    if (!validateExportAction()) return;

    if (type === 'pdf') {
      handleGeneratePdf();
      return;
    }

    handlePrint();
  };

  const handleDownloadExcel = async () => {
    if (!validateExportAction() || !user) return;

    try {
      setIsExportingExcel(true);
      await generateKitchenUserHistoryExcelReport({
        user,
        records: visibleRecords,
        filters,
        exportName,
      });
    } catch (error) {
      console.error('Error generating Excel:', error);
      SnackbarUtilities.error('No se pudo generar el Excel');
    } finally {
      setIsExportingExcel(false);
    }
  };

  return (
    <Modal size={64} isOpenProp={isOpen}>
      <div className="historyUserModal">
        <CloseIcon onClick={onClose} top={0.5} right={0.5} />
        <div className="historyUserModal-header">
          <div className="historyUserModal-hero">
            <div className="historyUserModal-userBlock">
              <span className="historyUserModal-avatar">
                {(user?.fullName || 'US')
                  .split(' ')
                  .filter(Boolean)
                  .slice(0, 2)
                  .map(value => value[0]?.toUpperCase())
                  .join('')}
              </span>
              <div className="historyUserModal-userCopy">
                <span className="historyUserModal-kicker">
                  Detalle por usuario
                </span>
                <h2 className="historyUserModal-title">
                  {user?.fullName || 'Usuario'}
                </h2>
                <p className="historyUserModal-description">
                  Historial de todas las comidas registradas dentro del rango
                  actual.
                </p>
              </div>
            </div>

            <div className="historyUserModal-alertCard">
              <span className="historyUserModal-alertLabel">
                Último incumplimiento
              </span>
              <strong className="historyUserModal-alertValue">
                {latestIncident
                  ? formatDateUtc(latestIncident.date)
                  : 'Sin incidencias'}
              </strong>
            </div>
          </div>

          <div className="historyUserModal-meta">
            <span>{user?.userType}</span>
            <span>{`DNI ${user?.dni || '---'}`}</span>
            <span>
              {formatFullDayDateUtc(filters.dateFrom)} al{' '}
              {formatFullDayDateUtc(filters.dateTo)}
            </span>
            <span>{`Comida: ${filters.mealType}`}</span>
          </div>
        </div>

        <div className="historyUserModal-content">
          <div className="historyUserModal-summary">
            <SummaryStat
              label="Pedidos servidos"
              value={data?.summary.requestedCount ?? 0}
              variant="secondary"
              tone="neutral"
            />
            <SummaryStat
              label="Recogió"
              value={data?.summary.pickedUpCount ?? 0}
              variant="secondary"
              tone="success"
            />
            <SummaryStat
              label="No recogió"
              value={data?.summary.notPickedUpCount ?? 0}
              variant="secondary"
              tone="danger"
            />
            <SummaryStat
              label="Reservados"
              value={data?.summary.reservedCount ?? 0}
              variant="secondary"
              tone="info"
            />
            <SummaryStat
              label="% incumplimiento"
              value={`${data?.summary.notPickedUpRate ?? 0}%`}
              variant="secondary"
              tone="warning"
            />
          </div>

          <div className="historyUserModal-tableBlock">
            <div className="historyUserModal-tableHeader">
              <div>
                <h3 className="historyUserModal-tableTitle">
                  Detalle de pedidos
                </h3>
                <p className="historyUserModal-tableDescription">
                  {isOperationalDetail
                    ? 'Cada fila muestra incidencias operativas del usuario dentro del rango seleccionado.'
                    : 'Cada fila muestra una comida servida/evaluable del usuario dentro del rango seleccionado.'}
                </p>
              </div>
              <span className="historyUserModal-tableCount">
                {`${visibleRecords.length} registro(s)`}
              </span>
            </div>

            <DivFlex autoWidth className="historyUserModal-exportActions">
              <Button
                size="xxs"
                variant="outline"
                text="JPG"
                leftIcon={<PiFileJpgFill size={16} />}
                onClick={handleDownloadJpg}
                color="secondary"
                disabled={isExportingImage || !visibleRecords.length}
              />
              {!!navigator.share && (
                <Button
                  size="xxs"
                  variant="outline"
                  text="Compartir"
                  leftIcon={<PiShareNetworkFill size={16} />}
                  onClick={handleShareToWhatsApp}
                  color="secondary"
                  disabled={isExportingImage || !visibleRecords.length}
                />
              )}
              <Button
                size="xxs"
                variant="outline"
                text="PDF"
                leftIcon={<PiFilePdfFill size={16} />}
                onClick={() => handleGenerate('pdf')}
                color="secondary"
                disabled={!visibleRecords.length}
              />
              <Button
                size="xxs"
                variant="outline"
                text="Imprimir"
                leftIcon={<PiPrinterFill size={16} />}
                onClick={() => handleGenerate('print')}
                color="secondary"
                disabled={!visibleRecords.length}
              />
              <Button
                size="xxs"
                variant="outline"
                text="Excel"
                leftIcon={<PiFileXlsFill size={16} />}
                onClick={handleDownloadExcel}
                color="secondary"
                disabled={isExportingExcel || !visibleRecords.length}
              />
            </DivFlex>

            {isLoading ? (
              <div className="historyUserModal-feedback">
                <LoaderForComponent width={80} />
              </div>
            ) : visibleRecords.length ? (
              <div className="historyUserModal-exportArea" ref={detailRef}>
                <Table table={table}>
                  <TableHead />
                  <TableBody<KitchenHistoryUserDetailRecord>
                    rowBackgroundColor={row => {
                      if (row.original.deliveryStatus === 'MISSED_CLOSE') {
                        return 'var(--color-bg-correction)';
                      }
                      if (row.original.deliveryStatus === 'NO_SERVICE') {
                        return 'var(--color-bg-correction)';
                      }
                      if (row.original.deliveryStatus === 'OPEN') {
                        return 'var(--color-bg-secondary)';
                      }
                      if (row.original.deliveryStatus === 'PICKED_UP') {
                        return 'var(--color-bg-done)';
                      }
                      if (row.original.deliveryStatus === 'NOT_PICKED_UP') {
                        return 'var(--color-bg-unresolved)';
                      }
                      return 'var(--color-bg-correction)';
                    }}
                  />
                </Table>
              </div>
            ) : (
              <div className="historyUserModal-feedback">
                <TableNoData text="No hay historial para este usuario con los filtros actuales." />
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default HistoryUserModal;
