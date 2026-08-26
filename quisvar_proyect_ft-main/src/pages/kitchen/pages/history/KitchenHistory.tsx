import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  PiArrowClockwiseBold,
  PiEyeBold,
  PiFileJpgFill,
  PiFilePdfFill,
  PiFileXlsFill,
  PiMagnifyingGlassBold,
  PiPrinterFill,
  PiShareNetworkFill,
} from 'react-icons/pi';
import './kitchenHistory.css';
import Button from '@/components/button/Button';
import DatePickerCustom from '@/components/datePickerCustom/DatePickerCustom';
import DivFlex from '@/components/divFlex/DivFlex';
import Input from '@/components/Input/Input';
import LoaderForComponent from '@/components/loaderForComponent/LoaderForComponent';
import Select from '@/components/select/Select';
import Table from '@/components/table/Table';
import TableBody from '@/components/table/TableBody';
import TableHead from '@/components/table/TableHead';
import TableNoData from '@/components/table/TableNoData';
import { axiosInstance } from '@/services/axiosInstance';
import { downloadBlob } from '@/utils/tools';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import dayjsSpanish, { formatDateUtc } from '@/utils/dayjsSpanish';
import SummaryStat from '../../components/summaryStat/SummaryStat';
import {
  HISTORY_MEAL_TYPES,
  HISTORY_PICKUP_FILTERS,
  HISTORY_USER_TYPES,
  pickupStatusHistoryLabelMap,
} from './interfaces/kitchenHistory.types';
import { DeliveryStatus } from '../formMealOrder/interfaces/mealOrder.types';
import type {
  HistoryFilters,
  KitchenHistoryResponse,
  KitchenHistoryRow,
} from './interfaces/kitchenHistory.types';
import HistoryUserModal from './components/historyUserModal/HistoryUserModal';
import { BsCalendar2Week } from 'react-icons/bs';
import { COLOR_CSS } from '@/utils/cssData';
import usePrintAndCapture from '@/hooks/usePrintAndCapture';
import usePrintAndGeneratePdf from '@/hooks/usePrintAndGeneratePdf';
import { useReactToPrint } from 'react-to-print';
import { generateKitchenHistoryExcelReport } from './excelReport';

const today = dayjsSpanish().toDate();
const defaultStartDate = dayjsSpanish().startOf('month').toDate();

const KitchenHistory = () => {
  const [filters, setFilters] = useState<HistoryFilters>({
    dateFrom: defaultStartDate,
    dateTo: today,
    mealType: 'Todos',
    userType: 'Todos',
    pickupStatus: 'Todos',
    search: '',
  });
  const [searchText, setSearchText] = useState('');
  const [data, setData] = useState<KitchenHistoryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [selectedUser, setSelectedUser] = useState<KitchenHistoryRow | null>(
    null
  );
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const historyRef = useRef<HTMLDivElement>(null);
  const columnHelper = createColumnHelper<KitchenHistoryRow>();

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setFilters(prev =>
        prev.search === searchText.trim()
          ? prev
          : {
              ...prev,
              search: searchText.trim(),
            }
      );
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [searchText]);

  const getHistory = async () => {
    if (!filters.dateFrom || !filters.dateTo) return;
    try {
      setIsLoading(true);
      const response = await axiosInstance.get<KitchenHistoryResponse>(
        '/kitchen/history',
        {
          params: filters,
          headers: {
            noLoader: true,
          },
        }
      );

      setData(response.data);
    } catch (error) {
      setData({
        summary: {
          totalOrders: 0,
          totalIncumplimientos: 0,
          totalNoService: 0,
          totalMissedClose: 0,
          totalOpenOrders: 0,
          usersWithIncumplimientos: 0,
          topOffender: null,
        },
        rows: [],
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getHistory();
  }, [
    filters.dateFrom,
    filters.dateTo,
    filters.mealType,
    filters.userType,
    filters.pickupStatus,
    filters.search,
  ]);

  const handleFilterChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    setFilters(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleDateRangeChange = (dates: [Date | null, Date | null]) => {
    const [startDate, endDate] = dates;

    setFilters(prev => ({
      ...prev,
      dateFrom: startDate,
      dateTo: endDate,
    }));
  };

  const openUserHistory = (user: KitchenHistoryRow) => {
    setSelectedUser(user);
    setIsHistoryModalOpen(true);
  };
  const showOperationalCounters =
    filters.pickupStatus === DeliveryStatus.NO_SERVICE ||
    filters.pickupStatus === DeliveryStatus.MISSED_CLOSE ||
    filters.pickupStatus === DeliveryStatus.OPEN;

  const columns = useMemo(
    () => [
      columnHelper.display({
        header: 'N°',
        cell: ({ row }) => row.index + 1,
      }),
      columnHelper.accessor('fullName', {
        header: 'USUARIO',
        cell: ({ getValue, row }) => (
          <div className="kitchenHistory-userCell">
            <div className="kitchenHistory-userBody">
              <strong>{getValue()}</strong>
              <span>{`DNI ${row.original.dni || '---'}`}</span>
              {row.original.pendingPickupCount > 0 && (
                <small>{`${row.original.pendingPickupCount} pendiente(s) de retiro`}</small>
              )}
              {showOperationalCounters && row.original.noServiceCount > 0 && (
                <small>{`${row.original.noServiceCount} no servido(s)`}</small>
              )}
              {showOperationalCounters && row.original.missedCloseCount > 0 && (
                <small>{`${row.original.missedCloseCount} sin cierre`}</small>
              )}
              {showOperationalCounters && row.original.openOrderCount > 0 && (
                <small>{`${row.original.openOrderCount} abierto(s)`}</small>
              )}
            </div>
          </div>
        ),
      }),
      columnHelper.accessor('requestedCount', {
        header: 'PEDIDOS SERVIDOS',
        cell: ({ getValue }) => (
          <DivFlex justifyContent="center">
            <span className="kitchenHistory-metric">{getValue()}</span>
          </DivFlex>
        ),
      }),
      columnHelper.accessor('pickedUpCount', {
        header: 'RECOGIÓ',
        cell: ({ getValue }) => (
          <DivFlex justifyContent="center">
            <span className="kitchenHistory-metric kitchenHistory-metric--success">
              {getValue()}
            </span>
          </DivFlex>
        ),
      }),
      columnHelper.accessor('notPickedUpCount', {
        header: 'NO RECOGIÓ',
        cell: ({ getValue }) => (
          <DivFlex justifyContent="center">
            <span className="kitchenHistory-metric kitchenHistory-metric--danger">
              {getValue()}
            </span>
          </DivFlex>
        ),
      }),
      columnHelper.accessor('reservedCount', {
        header: 'RESERVADOS',
        cell: ({ getValue }) => (
          <DivFlex justifyContent="center">
            <span className="kitchenHistory-metric kitchenHistory-metric--info">
              {getValue()}
            </span>
          </DivFlex>
        ),
      }),
      columnHelper.accessor('notPickedUpRate', {
        header: '% INCUMPL.',
        cell: ({ getValue }) => (
          <DivFlex justifyContent="center">
            <span className="kitchenHistory-metric kitchenHistory-metric--warning">{`${getValue()}%`}</span>
          </DivFlex>
        ),
      }),
      columnHelper.accessor('lastNotPickedUpAt', {
        header: 'ÚLTIMO INCUMPL.',
        cell: ({ getValue }) => (
          <DivFlex justifyContent="center">
            {getValue() ? formatDateUtc(getValue()) : '---'}
          </DivFlex>
        ),
      }),
      columnHelper.display({
        id: 'actions',
        header: 'DETALLE',
        cell: ({ row }) => (
          // <Button
          //   text="Ver historial"
          //   size="xxs"
          //   variant="outline"
          //   onClick={() => openUserHistory(row.original)}
          // />
          <DivFlex justifyContent="center">
            <PiEyeBold
              cursor="pointer"
              size={18}
              color={COLOR_CSS.secondary}
              onClick={() => openUserHistory(row.original)}
            />
          </DivFlex>
        ),
      }),
    ],
    [columnHelper, showOperationalCounters]
  );

  const table = useReactTable({
    data: data?.rows || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const summary = data?.summary ?? {
    totalOrders: 0,
    totalIncumplimientos: 0,
    totalNoService: 0,
    totalMissedClose: 0,
    totalOpenOrders: 0,
    usersWithIncumplimientos: 0,
    topOffender: null,
  };
  const showOperationalNotice =
    filters.pickupStatus === 'Todos' &&
    (summary.totalNoService > 0 ||
      summary.totalMissedClose > 0 ||
      summary.totalOpenOrders > 0);
  const operationalNoticeParts = [
    summary.totalNoService > 0
      ? `${summary.totalNoService} pedido(s) no servido(s)`
      : '',
    summary.totalMissedClose > 0
      ? `${summary.totalMissedClose} pedido(s) sin cierre`
      : '',
    summary.totalOpenOrders > 0
      ? `${summary.totalOpenOrders} pedido(s) abierto(s)`
      : '',
  ].filter(Boolean);
  const formatExportDate = (date: Date | null) =>
    date ? dayjsSpanish(date).format('DD-MM-YYYY') : 'sin-fecha';
  const exportName = `Historial cocina ${formatExportDate(
    filters.dateFrom
  )} al ${formatExportDate(filters.dateTo)}`;
  const whatsappMessage = `Comparto el ${exportName}.`;
  const currentRows = data?.rows ?? [];

  const handlePrint = useReactToPrint({
    contentRef: historyRef,
    documentTitle: exportName,
  });

  const { downloadImage, getImageFile } = usePrintAndCapture({
    ref: historyRef,
    divName: 'kitchenHistory-exportArea',
    imgName: exportName,
    width: 1400,
  });

  const handleGeneratePdf = usePrintAndGeneratePdf({
    ref: historyRef,
    divName: 'kitchenHistory-exportArea',
    pdfName: exportName,
    orientation: 'l',
    width: 1400,
  });

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

  const validateExportAction = () => {
    if (!currentRows.length) {
      SnackbarUtilities.warning('No hay datos para exportar');
      return false;
    }

    return true;
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
    if (!validateExportAction()) return;

    try {
      setIsExportingExcel(true);
      await generateKitchenHistoryExcelReport({
        rows: currentRows,
        summary,
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
    <>
      <div
        className="kitchenHistory"
        style={{
          cursor: isLoading ? 'progress' : 'default',
        }}
      >
        <section className="kitchenHistory-hero">
          <div className="kitchenHistory-topbar">
            <div className="kitchenHistory-heading">
              <span className="kitchenHistory-kicker">Historial</span>
              <h2 className="kitchenHistory-title">Pedidos por usuario</h2>
              <p className="kitchenHistory-description">
                Revisa reincidencias, reserva de comidas y el comportamiento
                histórico de recojo por rango de fechas.
              </p>
            </div>

            <div className="kitchenHistory-actions">
              <Button
                leftIcon={<PiArrowClockwiseBold size={17} />}
                size="xxs"
                text="Actualizar"
                onClick={getHistory}
                borderRadius={10}
                disabled={isLoading}
              />
            </div>
          </div>
          {/* 
          <div className="kitchenHistory-activeFilters">
            <span className="kitchenHistory-activeFilter">
              {`${filters.dateFrom} al ${filters.dateTo}`}
            </span>
            <span className="kitchenHistory-activeFilter">
              {`Comida: ${filters.mealType}`}
            </span>
            <span className="kitchenHistory-activeFilter">
              {`Personal: ${filters.userType}`}
            </span>
            <span className="kitchenHistory-activeFilter">
              {`Retiro: ${
                filters.pickupStatus === 'Todos'
                  ? 'Todos'
                  : pickupStatusHistoryLabelMap[filters.pickupStatus]
              }`}
            </span>
          </div> */}

          <div className="kitchenHistory-filterCard">
            <div className="kitchenHistory-filterGrid">
              <label className="kitchenHistory-filterField kitchenHistory-filterField--range">
                <span className="kitchenHistory-filterLabel">
                  Rango de fechas
                </span>
                <DatePickerCustom
                  selectsRange
                  startDate={filters.dateFrom || undefined}
                  endDate={filters.dateTo || undefined}
                  selected={filters.dateFrom}
                  onChange={dates =>
                    handleDateRangeChange(dates as [Date | null, Date | null])
                  }
                  maxDate={today}
                  placeholderText="Selecciona un rango"
                  showIcon
                  icon={<BsCalendar2Week size={15} color={COLOR_CSS.gray} />}
                />
              </label>

              <label className="kitchenHistory-filterField">
                <span className="kitchenHistory-filterLabel">
                  Tipo de comida
                </span>
                <Select
                  name="mealType"
                  value={filters.mealType}
                  data={HISTORY_MEAL_TYPES}
                  extractValue={value => value}
                  renderTextField={value => value}
                  styleVariant="tertiary"
                  onChange={handleFilterChange}
                />
              </label>

              <label className="kitchenHistory-filterField">
                <span className="kitchenHistory-filterLabel">
                  Tipo de usuario
                </span>
                <Select
                  name="userType"
                  value={filters.userType}
                  data={HISTORY_USER_TYPES}
                  extractValue={value => value}
                  renderTextField={value => value}
                  styleVariant="tertiary"
                  onChange={handleFilterChange}
                />
              </label>

              <label className="kitchenHistory-filterField">
                <span className="kitchenHistory-filterLabel">
                  Estado de retiro
                </span>
                <Select
                  name="pickupStatus"
                  value={filters.pickupStatus}
                  data={HISTORY_PICKUP_FILTERS}
                  extractValue={value => value}
                  renderTextField={value =>
                    value === 'Todos'
                      ? value
                      : pickupStatusHistoryLabelMap[value]
                  }
                  styleVariant="tertiary"
                  onChange={handleFilterChange}
                />
              </label>

              <label className="kitchenHistory-filterField kitchenHistory-filterField--search">
                <span className="kitchenHistory-filterLabel">Usuario</span>
                <Input
                  type="search"
                  value={searchText}
                  onChange={event => setSearchText(event.target.value)}
                  placeholder="Buscar por nombre o DNI"
                  leftIcon={<PiMagnifyingGlassBold size={16} />}
                />
              </label>
            </div>

            <div className="kitchenHistory-filterFooter">
              <span className="kitchenHistory-filterHint">
                El historial evalúa pedidos servidos dentro del rango
                seleccionado.
              </span>
            </div>
            {showOperationalNotice && (
              <div className="kitchenHistory-operationalNotice">
                {`Hay ${operationalNoticeParts.join(
                  ' y '
                )} fuera de esta evaluación.`}
              </div>
            )}
          </div>

          <div className="kitchenHistory-summary">
            <SummaryStat
              label="Pedidos servidos"
              value={summary.totalOrders}
              variant="secondary"
              tone="neutral"
            />
            <SummaryStat
              label="Incumplimientos"
              value={summary.totalIncumplimientos}
              variant="secondary"
              tone="danger"
            />
            <SummaryStat
              label="Usuarios con incumplimientos"
              value={summary.usersWithIncumplimientos}
              variant="secondary"
              tone="warning"
            />
            <article className="kitchenHistory-highlightStat">
              <span className="kitchenHistory-highlightLabel">
                Mayor reincidencia
              </span>
              <strong className="kitchenHistory-highlightValue">
                {summary.topOffender ? summary.topOffender.count : 0}
              </strong>
              <p className="kitchenHistory-highlightDescription">
                {summary.topOffender
                  ? summary.topOffender.fullName
                  : 'Sin incidencias'}
              </p>
            </article>
          </div>
        </section>

        <div
          className={`kitchenHistory-resultsBody ${
            isLoading ? 'kitchenHistory-resultsBody-loading' : ''
          }`}
        >
          <div className="kitchenHistory-tableHeader">
            <div>
              <h3 className="kitchenHistory-tableTitle">Usuarios detectados</h3>
            </div>
            <DivFlex autoWidth className="kitchenHistory-exportActions">
              <Button
                size="xxs"
                variant="outline"
                text="JPG"
                leftIcon={<PiFileJpgFill size={16} />}
                onClick={handleDownloadJpg}
                color="secondary"
                disabled={isExportingImage || !currentRows.length}
              />
              {!!navigator.share && (
                <Button
                  size="xxs"
                  variant="outline"
                  text="Compartir"
                  leftIcon={<PiShareNetworkFill size={16} />}
                  onClick={handleShareToWhatsApp}
                  color="secondary"
                  disabled={isExportingImage || !currentRows.length}
                />
              )}
              <Button
                size="xxs"
                variant="outline"
                text="PDF"
                leftIcon={<PiFilePdfFill size={16} />}
                onClick={() => handleGenerate('pdf')}
                color="secondary"
                disabled={!currentRows.length}
              />
              <Button
                size="xxs"
                variant="outline"
                text="Imprimir"
                leftIcon={<PiPrinterFill size={16} />}
                onClick={() => handleGenerate('print')}
                color="secondary"
                disabled={!currentRows.length}
              />
              <Button
                size="xxs"
                variant="outline"
                text="Excel"
                leftIcon={<PiFileXlsFill size={16} />}
                onClick={handleDownloadExcel}
                color="secondary"
                disabled={isExportingExcel || !currentRows.length}
              />
            </DivFlex>
            <span className="kitchenHistory-tableCount">
              {`${data?.rows.length || 0} resultado(s)`}
            </span>
          </div>

          {isLoading && !data ? (
            <div className="kitchenHistory-feedback">
              <LoaderForComponent width={90} />
            </div>
          ) : data?.rows.length ? (
            <div className="kitchenHistory-exportArea" ref={historyRef}>
              <Table table={table}>
                <TableHead position="sticky" />
                <TableBody<KitchenHistoryRow>
                  rowBackgroundColor={row => {
                    if (row.original.notPickedUpCount > 0) {
                      return 'var(--color-bg-unresolved)';
                    }
                    if (
                      showOperationalCounters &&
                      (row.original.noServiceCount > 0 ||
                        row.original.missedCloseCount > 0 ||
                        row.original.openOrderCount > 0)
                    ) {
                      return 'var(--color-bg-correction)';
                    }
                    if (row.original.reservedCount > 0) {
                      return 'var(--color-bg-correction)';
                    }
                    if (row.original.pickedUpCount > 0) {
                      return 'var(--color-bg-done)';
                    }
                    return 'var(--color-bg-secondary)';
                  }}
                />
              </Table>
            </div>
          ) : (
            <div className="kitchenHistory-feedback">
              <TableNoData text="No hay historial registrado con los filtros actuales." />
            </div>
          )}
        </div>
      </div>

      <HistoryUserModal
        isOpen={isHistoryModalOpen}
        user={selectedUser}
        filters={{
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
          mealType: filters.mealType,
          pickupStatus: filters.pickupStatus,
        }}
        onClose={() => setIsHistoryModalOpen(false)}
      />
    </>
  );
};

export default KitchenHistory;
