import { useEffect, useMemo, useState } from 'react';
import Button from '@/components/button/Button';
import CloseIcon from '@/components/closeIcon/CloseIcon';
import DatePickerCustom from '@/components/datePickerCustom/DatePickerCustom';
import LoaderOnly from '@/components/loaderOnly/LoaderOnly';
import Modal from '@/components/portal/Modal';
import Select from '@/components/select/Select';
import TextArea from '@/components/textArea/TextArea';
import useModalSubscription from '@/hooks/useModalSubscription';
import {
  isOpenBulkMealOrderModal$,
  isOpenAlertConfirm$,
} from '@/services/sharingSubject';
import YesNoRadio from '../../../../components/yesNoRadio/YesNoRadio';
import { AmountOfFood } from '../../interfaces/mealOrder.types';
import type { Meal } from '../../interfaces/mealOrder.types';
import {
  convertTo12HourFormat,
  formatFullDayDateUtc,
} from '@/utils/dayjsSpanish';
import { _date } from '@/utils/formatDate';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import './bulkMealOrderModal.css';
import { BsCalendar2Week } from 'react-icons/bs';
import { COLOR_CSS } from '@/utils/cssData';
import { useQueryClient } from '@tanstack/react-query';
import { FiSave } from 'react-icons/fi';
import { useMealDrafts } from '../../hooks/useMealDrafts';
import { saveBulkMealOrders } from '../../services/mealOrder.service';
import { buildBulkOrderItems } from '../../utils/mealOrderDrafts';

const today = _date(new Date());
const todayDate = new Date(`${today}T00:00:00`);

interface BulkMealOrderModalProps {
  meals: Meal[];
  onSaved?: () => void | Promise<void>;
}

const BulkMealOrderModal = ({ meals, onSaved }: BulkMealOrderModalProps) => {
  const queryClient = useQueryClient();
  const [mealDate, setMealDate] = useState<string>(today);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [[startDate, endDate], setRangeDate] = useState<
    [Date | null, Date | null]
  >([null, null]);
  const {
    mealsWithDrafts,
    resetDrafts,
    clearDrafts,
    updateDraft: handleDraftChange,
  } = useMealDrafts(meals, { mode: 'empty' });

  const { isOpenModal, onCloseModal } = useModalSubscription(
    isOpenBulkMealOrderModal$,
    value => {
      if (value.isOpen && value.date) {
        setMealDate(value.date);
      }
    }
  );

  useEffect(() => {
    if (!isOpenModal) {
      setRangeDate([null, null]);
      clearDrafts();
      setIsSubmitting(false);
      return;
    }

    resetDrafts(meals);
  }, [clearDrafts, isOpenModal, meals, resetDrafts]);

  const selectedMeals = useMemo(
    () => mealsWithDrafts.filter(({ draft }) => draft.status !== null),
    [mealsWithDrafts]
  );
  const selectedMealSummary = useMemo(
    () =>
      selectedMeals
        .map(({ meal }) => `${meal.type} (${convertTo12HourFormat(meal.hour)})`)
        .join(', '),
    [selectedMeals]
  );

  const totalDays = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    start.setHours(12, 0, 0, 0);
    end.setHours(12, 0, 0, 0);
    const diff = end.getTime() - start.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
  }, [startDate, endDate]);

  const handleClose = () => {
    if (isSubmitting) return;
    onCloseModal();
  };

  const executeBulkSubmit = async () => {
    if (!startDate || !endDate || selectedMeals.length === 0) return;

    const dates: string[] = [];
    const currentDate = new Date(startDate);
    const lastDate = new Date(endDate);

    currentDate.setHours(12, 0, 0, 0);
    lastDate.setHours(12, 0, 0, 0);

    while (currentDate <= lastDate) {
      dates.push(_date(new Date(currentDate)));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    try {
      setIsSubmitting(true);

      const data = await saveBulkMealOrders({
        dates,
        orders: buildBulkOrderItems(selectedMeals),
      });

      if (data.skippedClosedCount > 0) {
        const summaryMessage =
          data.processedOrders > 0
            ? `Se aplicaron ${data.processedOrders} pedidos y se omitieron ${data.skippedClosedCount} ya que estan cerrados.`
            : `No se aplicaron pedidos. Se omitieron ${data.skippedClosedCount} cerrados.`;

        SnackbarUtilities.warning(summaryMessage);
      } else {
        SnackbarUtilities.success(
          `Se aplicaron ${data.processedOrders} pedidos en ${data.processedDates} dias`
        );
      }
      await queryClient.invalidateQueries({
        queryKey: ['orderMealByDate', mealDate],
      });
      await onSaved?.();
      onCloseModal();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirm = () => {
    if (!startDate || !endDate || selectedMeals.length === 0 || isSubmitting) {
      return;
    }

    isOpenAlertConfirm$.setSubject = {
      isOpen: true,
      title: 'Confirmar reemplazo de pedidos',
      description:
        'Revisa el envio masivo antes de guardar los cambios del rango seleccionado.',
      summaryItems: [
        {
          label: 'Rango',
          value: `${_date(startDate)} al ${_date(endDate)}`,
        },
        {
          label: 'Dias seleccionados',
          value: `${totalDays}`,
        },
        {
          label: 'Comidas a reemplazar',
          value: `${selectedMeals.length}`,
        },
        {
          label: 'Detalle',
          value: selectedMealSummary,
        },
      ],
      warningText:
        'Las comidas cerradas no se podran editar. Las comidas abiertas del rango seran reemplazadas.',
      confirmText: 'Confirmar y guardar',
      cancelText: 'Cancelar',
      variant: 'warning',
      onConfirm: executeBulkSubmit,
    };
  };

  const isDisabledConfirm =
    !startDate || !endDate || selectedMeals.length === 0 || isSubmitting;

  return (
    <Modal size={58} isOpenProp={isOpenModal}>
      <CloseIcon
        onClick={isSubmitting ? undefined : handleClose}
        size={0.7}
        right={0.75}
        top={0.75}
        zIndex={1}
      />

      <div className="bulkMealOrderModal">
        <div className="bulkMealOrderModal-header">
          <span className="bulkMealOrderModal-kicker">Accion masiva</span>
          <h2 className="bulkMealOrderModal-title">
            Aplicar comidas a varios dias
            {isSubmitting && (
              <LoaderOnly position="absolute" right={2} top={1} />
            )}
          </h2>
          <p className="bulkMealOrderModal-description">
            Selecciona un rango, ajusta cada comida aqui mismo y confirma el
            envio masivo.
          </p>
          <span className="bulkMealOrderModal-baseDate">
            Base: {formatFullDayDateUtc(mealDate)}
          </span>
        </div>

        <div className="bulkMealOrderModal-content">
          <section className="bulkMealOrderModal-calendarSection">
            <div className="bulkMealOrderModal-sectionHeader">
              <h3>Rango de fechas</h3>
            </div>

            <DatePickerCustom
              wrapperClassName="bulkMealOrderModal-datePicker"
              showIcon
              selectsRange
              startDate={startDate || undefined}
              endDate={endDate || undefined}
              onChange={dates =>
                setRangeDate(dates as [Date | null, Date | null])
              }
              minDate={todayDate}
              monthsShown={2}
              calendarStartDay={1}
              isClearable
              disabledKeyboardNavigation
              icon={<BsCalendar2Week size={15} color={COLOR_CSS.gray} />}
              placeholderText="Fecha inicio - Fecha fin"
            />

            <div className="bulkMealOrderModal-rangeSummary">
              <strong>{totalDays || 0}</strong>
              <span>dias a actualizar</span>
            </div>
          </section>

          <section
            className="bulkMealOrderModal-selectionSection"
            style={{ height: '100%' }}
          >
            <div className="bulkMealOrderModal-sectionHeader">
              <h3>Comidas a aplicar</h3>
              <span>{selectedMeals.length} confirmadas</span>
            </div>

            <div className="bulkMealOrderModal-selectionList scroll-slim">
              {mealsWithDrafts.map(({ meal, draft }) => {
                return (
                  <article
                    key={meal.id}
                    className={`bulkMealOrderModal-selectionCard`}
                  >
                    <div className="bulkMealOrderModal-selectionTop">
                      <div className="bulkMealOrderModal-selectionHeading">
                        <strong>{meal.type}</strong>
                        <span>{convertTo12HourFormat(meal.hour)}</span>
                      </div>
                    </div>

                    <div className="bulkMealOrderModal-editor">
                      <YesNoRadio
                        value={draft.status}
                        name={`status-otro-${meal.id}`}
                        idPrefix={`bulk-meal-${meal.id}`}
                        onChange={event => handleDraftChange(meal.id, event)}
                      />

                      <div className="bulkMealOrderModal-field">
                        <label className="bulkMealOrderModal-fieldLabel">
                          Cantidad
                        </label>
                        <Select
                          data={Object.values(AmountOfFood)}
                          extractValue={value => value}
                          renderTextField={value => value}
                          styleVariant="tertiary"
                          onChange={event => handleDraftChange(meal.id, event)}
                          name="amountOfFood"
                          value={draft.amountOfFood}
                          placeholderDisabled
                        />
                      </div>

                      <TextArea
                        label="Comentario"
                        name="comment"
                        value={draft.comment}
                        onChange={event => handleDraftChange(meal.id, event)}
                        placeholder="Ejemplo: sin aji, recoger mas tarde, por favor sin sopa..."
                        style={{ resize: 'vertical' }}
                      />
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>

        <div className="bulkMealOrderModal-footer">
          <Button
            text="Cancelar"
            variant="ghost"
            textColor="gray"
            onClick={handleClose}
            disabled={isSubmitting}
          />
          <Button
            text={'Guardar'}
            leftIcon={<FiSave size={17} />}
            onClick={handleConfirm}
            disabled={isDisabledConfirm}
            color={isDisabledConfirm ? 'gray' : 'primary'}
          />
        </div>
      </div>
    </Modal>
  );
};

export default BulkMealOrderModal;
