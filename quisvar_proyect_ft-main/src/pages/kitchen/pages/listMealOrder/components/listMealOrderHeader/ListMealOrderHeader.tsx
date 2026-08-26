import {
  PiArrowClockwiseBold,
  PiFileJpgFill,
  PiFilePdfFill,
  PiMagnifyingGlassBold,
  PiPrinterFill,
  PiShareNetworkFill,
} from 'react-icons/pi';
import ArrowText from '@/components/arrowText/ArrowTex';
import Button from '@/components/button/Button';
import DivFlex from '@/components/divFlex/DivFlex';
import Input from '@/components/Input/Input';
import Select from '@/components/select/Select';
import './listMealOrderHeader.css';
import { useContext, useMemo, useState } from 'react';
import KitchenDateStrip from '../../../../components/kitchenDateStrip/KitchenDateStrip';
import SummaryStat from '../../../../components/summaryStat/SummaryStat';
import { ListMealOrderContext } from '../../ListMealOrderContext';
import { DeliveryStatus } from '../../../formMealOrder/interfaces/mealOrder.types';
import {
  convertTo12HourFormat,
  formatFullDayDateUtc,
} from '@/utils/dayjsSpanish';
import { useReactToPrint } from 'react-to-print';
import usePrintAndCapture from '@/hooks/usePrintAndCapture';
import usePrintAndGeneratePdf from '@/hooks/usePrintAndGeneratePdf';
import { downloadBlob } from '@/utils/tools';
import { SnackbarUtilities } from '@/utils/SnackbarManager';

const ListMealOrderHeader = () => {
  const {
    date,
    mealsOrder,
    mealOrderSelected,
    handleDate,
    divRef,
    onGetMeal,
    handleSelectMeal,
    isBeforeToday,
    filters,
    onChangeFilter,
    searchText,
    handleSearchChange,
    isLoading,
  } = useContext(ListMealOrderContext);
  const [isExportingImage, setIsExportingImage] = useState(false);

  const mealUsers = mealOrderSelected?.order?.users ?? [];
  const exportName = mealOrderSelected
    ? `${mealOrderSelected.type} ${convertTo12HourFormat(
        mealOrderSelected.hour || '00:00'
      )} - ${formatFullDayDateUtc(date)}`
    : `Pedidos del dia - ${formatFullDayDateUtc(date)}`;
  const whatsappMessage = `Comparto el consolidado de ${exportName}.`;

  const mealSummary = useMemo(() => {
    const positive = mealUsers.filter(user => user.mealStatus === true).length;
    const negative = mealUsers.filter(user => user.mealStatus === false).length;
    const pending = mealUsers.filter(
      user => typeof user.mealStatus !== 'boolean'
    ).length;
    const pickedUp = mealUsers.filter(
      user => user.deliveryStatus === DeliveryStatus.PICKED_UP
    ).length;
    const notPickedUp = mealUsers.filter(
      user => user.deliveryStatus === DeliveryStatus.NOT_PICKED_UP
    ).length;
    const reserved = mealUsers.filter(
      user => user.deliveryStatus === DeliveryStatus.RESERVED
    ).length;
    const pickupPending = mealUsers.filter(
      user => user.deliveryStatus === DeliveryStatus.PENDING_PICKUP
    ).length;
    const noService = mealUsers.filter(
      user => user.deliveryStatus === DeliveryStatus.NO_SERVICE
    ).length;
    const missedClose = mealUsers.filter(
      user => user.deliveryStatus === DeliveryStatus.MISSED_CLOSE
    ).length;

    return {
      meals: mealsOrder?.length ?? 0,
      totalUsers: mealUsers.length,
      positive,
      negative,
      pending,
      pickedUp,
      notPickedUp,
      reserved,
      pickupPending,
      noService,
      missedClose,
      closed: mealsOrder?.filter(meal => meal.order?.isClose).length ?? 0,
    };
  }, [mealUsers, mealsOrder]);

  const primarySummaryStats = [
    {
      label: 'Pendientes',
      value: mealSummary.pending,
      tone: 'warning' as const,
    },
    {
      label: 'Por entregar',
      value: mealSummary.pickupPending,
      tone: 'info' as const,
    },
    {
      label: 'Si',
      value: mealSummary.positive,
      tone: 'success' as const,
    },
    {
      label: 'Sin cierre',
      value: mealSummary.missedClose,
      tone: 'warning' as const,
    },
  ];

  const secondarySummaryStats = [
    {
      label: 'Recogió',
      value: mealSummary.pickedUp,
      tone: 'success' as const,
    },
    {
      label: 'Reservados',
      value: mealSummary.reserved,
      tone: 'neutral' as const,
    },
    {
      label: 'No servido',
      value: mealSummary.noService,
      tone: 'neutral' as const,
    },
    {
      label: 'No recogió',
      value: mealSummary.notPickedUp,
      tone: 'danger' as const,
    },
    {
      label: 'No',
      value: mealSummary.negative,
      tone: 'neutral' as const,
    },
    {
      label: 'Comidas',
      value: mealSummary.meals,
      tone: 'neutral' as const,
    },
    {
      label: 'Cerradas',
      value: mealSummary.closed,
      tone: 'neutral' as const,
    },
    {
      label: 'Personas',
      value: mealSummary.totalUsers,
      tone: 'neutral' as const,
    },
  ];

  const handlePrint = useReactToPrint({
    contentRef: divRef,
    documentTitle: exportName,
  });

  const { downloadImage, getImageFile } = usePrintAndCapture({
    ref: divRef,
    divName: 'tableListMealOrder',
    imgName: exportName,
    width: 1200,
  });

  const handleGeneratePdf = usePrintAndGeneratePdf({
    ref: divRef,
    divName: 'tableListMealOrder',
    pdfName: exportName,
  });

  const validateExportAction = () => {
    if (!mealOrderSelected) return;
    if (!mealOrderSelected.order?.isClose) {
      SnackbarUtilities.warning('Primero cierre el pedido');
      return;
    }
    return mealOrderSelected;
  };

  const openWhatsAppFallback = () => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(
      whatsappMessage
    )}`;
    const openedWindow = window.open(whatsappUrl, '_blank');

    if (!openedWindow) {
      throw new Error('No se pudo abrir WhatsApp');
    }
  };

  const canShareFiles = (file: File) => {
    if (typeof navigator === 'undefined' || !navigator.share) {
      return false;
    }

    if (typeof navigator.canShare !== 'function') {
      return false;
    }

    try {
      return navigator.canShare({ files: [file] });
    } catch {
      return false;
    }
  };

  const isShareCancelled = (error: unknown) =>
    error instanceof Error && error.name === 'AbortError';

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
      if (isShareCancelled(error)) {
        return;
      }

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

  return (
    <div className="listMealOrder-header">
      <div className="listMealOrder-selectorHeader">
        <span className="listMealOrder-selectorLabel">Comidas del dia</span>
        <span className="listMealOrder-selectorDate">
          {formatFullDayDateUtc(date)}
        </span>
      </div>
      <div className="listMealOrder-dateControl">
        <KitchenDateStrip value={date} onChange={handleDate} />
      </div>
      <div className="listMealOrder-selectorBlock">
        <DivFlex autoWidth overflow="auto" justifyContent="normal">
          {mealsOrder?.map(meal => (
            <ArrowText
              key={date + meal.id}
              text={`${meal.type} ${convertTo12HourFormat(meal.hour)}`}
              isPressed={mealOrderSelected?.id === meal.id}
              onClick={() => handleSelectMeal(meal)}
              isDisabled={meal.order?.isClose || isBeforeToday}
            />
          ))}
        </DivFlex>
      </div>
      <div className="listMealOrder-hero">
        <div className="listMealOrder-headline">
          <h2 className="listMealOrder-titleMain">
            {mealOrderSelected
              ? `${mealOrderSelected.type} ${convertTo12HourFormat(
                  mealOrderSelected.hour || '00:00'
                )}`
              : 'Pedidos del dia'}
          </h2>
          <p className="listMealOrder-description">
            Revisa respuestas, completa pendientes y exporta el consolidado
            cuando el pedido esté cerrado.
          </p>
        </div>

        <div className="listMealOrder-toolbar">
          <Input
            type="search"
            value={searchText}
            onChange={handleSearchChange}
            width={15}
            placeholder="Buscar por nombre o celular"
            leftIcon={<PiMagnifyingGlassBold size={16} />}
          />

          <Select
            value={filters.orderStatus}
            data={['Todos', 'Si', 'No', 'Sin respuesta']}
            placeholder="Pedido"
            onChange={onChangeFilter}
            name="orderStatus"
            extractValue={value => value}
            renderTextField={value => value}
            styleVariant="tertiary"
            width={11}
          />

          <Select
            value={filters.pickupStatus}
            data={[
              'Todos',
              'Recogió',
              'No recogió',
              'Reservado',
              'Pendiente retiro',
              'No servido',
              'Sin cierre',
              'Abierto',
              'No aplica',
            ]}
            placeholder="Entrega"
            onChange={onChangeFilter}
            name="pickupStatus"
            extractValue={value => value}
            renderTextField={value => value}
            styleVariant="tertiary"
            width={12}
          />

          <Button
            leftIcon={<PiArrowClockwiseBold size={17} />}
            size="xxs"
            text="Actualizar"
            onClick={onGetMeal}
            borderRadius={10}
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="listMealOrder-summaryBlock">
        <div className="listMealOrder-summary listMealOrder-summary--primary">
          {primarySummaryStats.map(stat => (
            <SummaryStat
              key={stat.label}
              label={stat.label}
              value={stat.value}
              tone={stat.tone}
              variant="primary"
            />
          ))}
        </div>
        <div className="listMealOrder-summaryChips">
          {secondarySummaryStats.map(stat => (
            <article
              key={stat.label}
              className={`listMealOrder-summaryChip listMealOrder-summaryChip--${stat.tone}`}
            >
              <span className="listMealOrder-summaryChip-label">
                {stat.label}
              </span>
              <strong className="listMealOrder-summaryChip-value">
                {stat.value}
              </strong>
            </article>
          ))}
        </div>
      </div>
      <DivFlex autoWidth className="listMealOrder-actions">
        {mealOrderSelected && (
          <DivFlex autoWidth gap={0.8} className="listMealOrder-exportActions">
            <Button
              size="xxs"
              variant="outline"
              text="JPG"
              leftIcon={<PiFileJpgFill size={16} />}
              onClick={handleDownloadJpg}
              color="secondary"
              disabled={isExportingImage}
            />
            {!!navigator.share && (
              <Button
                size="xxs"
                variant="outline"
                text="Compartir"
                leftIcon={<PiShareNetworkFill size={16} />}
                onClick={handleShareToWhatsApp}
                color="secondary"
                disabled={isExportingImage}
              />
            )}
            <Button
              size="xxs"
              variant="outline"
              text="PDF"
              leftIcon={<PiFilePdfFill size={16} />}
              onClick={() => handleGenerate('pdf')}
              color="secondary"
            />
            <Button
              size="xxs"
              variant="outline"
              text="Imprimir"
              leftIcon={<PiPrinterFill size={16} />}
              onClick={() => handleGenerate('print')}
              color="secondary"
            />
          </DivFlex>
        )}
      </DivFlex>
    </div>
  );
};

export default ListMealOrderHeader;
