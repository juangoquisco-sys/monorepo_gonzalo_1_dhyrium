import type { ChangeEvent } from 'react';
import DivFlex from '@/components/divFlex/DivFlex';
import Select from '@/components/select/Select';
import TextArea from '@/components/textArea/TextArea';
import { convertTo12HourFormat, isBeforeTodayFn } from '@/utils/dayjsSpanish';
import YesNoRadio from '../../../../components/yesNoRadio/YesNoRadio';
import { AmountOfFood } from '../../interfaces/mealOrder.types';
import type { Meal, MealDraft } from '../../interfaces/mealOrder.types';
import './cardMealOrder.css';

interface CardMealOrderProps {
  meal: Meal;
  date: string;
  draft: MealDraft;
  hasChanges: boolean;
  isSaving?: boolean;
  onDraftChange: (
    mealId: number,
    event:
      | ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
      | ChangeEvent<HTMLSelectElement>
  ) => void;
}

const getMealVariant = (mealType: string) => {
  const value = mealType.toLowerCase();
  if (value.includes('desay')) return 'breakfast';
  if (value.includes('almuer')) return 'lunch';
  if (value.includes('cena')) return 'dinner';
  return 'default';
};

const CardMealOrder = ({
  meal,
  date,
  draft,
  hasChanges,
  isSaving = false,
  onDraftChange,
}: CardMealOrderProps) => {
  const isClosed = meal.order?.isClose || isBeforeTodayFn(date);
  const isDisabled = isClosed || isSaving;
  const mealVariant = getMealVariant(meal.type);

  const statusLabel = isClosed
    ? 'Cerrado'
    : draft.status === 'yes'
    ? 'Pedido confirmado'
    : draft.status === 'no'
    ? 'Marcado como no'
    : 'Pendiente';
  const statusClass = isClosed
    ? 'closed'
    : draft.status === 'yes'
    ? 'yes'
    : draft.status === 'no'
    ? 'no'
    : 'pending';

  const handleChange = (
    event:
      | ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
      | ChangeEvent<HTMLSelectElement>
  ) => {
    onDraftChange(meal.id, event);
  };

  return (
    <div
      className={`cardMealOrder cardMealOrder--${mealVariant} ${
        isClosed ? 'cardMealOrder--disabled' : ''
      }`}
    >
      <div className="cardMealOrder-header">
        <div className="cardMealOrder-heading">
          <div className="cardMealOrder-badges-container">
            <div className="cardMealOrder-badges">
              <span
                className={`cardMealOrder-badge cardMealOrder-badge--${mealVariant}`}
              >
                {meal.type}
              </span>
              <span
                className={`cardMealOrder-badge-status cardMealOrder-badge-status--${statusClass}`}
              >
                {statusLabel}
              </span>
            </div>
          </div>
          <h3 className="cardMealOrder-title">
            {convertTo12HourFormat(meal.hour)}
          </h3>
          <p className="cardMealOrder-subtitle">
            {isClosed
              ? 'Este pedido ya no admite cambios.'
              : 'Elige una respuesta y guarda cuando termines.'}
          </p>
        </div>
      </div>

      <div className="cardMealOrder-content">
        <YesNoRadio
          value={draft.status}
          name={`status-${meal.id}`}
          idPrefix={`pedido-${meal.id}`}
          onChange={handleChange}
          disabled={isDisabled}
        />

        <DivFlex justifyContent="flex-start">
          <label className="cardMealOrder-label">Cantidad:</label>
          <div>
            <Select
              data={Object.values(AmountOfFood)}
              extractValue={el => el}
              renderTextField={el => el}
              styleVariant="tertiary"
              onChange={handleChange}
              disabled={isDisabled}
              name="amountOfFood"
              value={draft.amountOfFood}
              placeholderDisabled
            />
          </div>
        </DivFlex>

        <TextArea
          label="Comentarios:"
          value={draft.comment}
          name="comment"
          placeholder="Ejemplo: sin ají, recoger más tarde, por favor sin sopa..."
          disabled={isDisabled}
          onChange={handleChange}
          style={{ resize: 'vertical' }}
        />

        <div className="cardMealOrder-footer">
          <span className="cardMealOrder-footerText">
            {isClosed
              ? 'Pedido bloqueado por cierre o por fecha pasada.'
              : !hasChanges
              ? 'No hay cambios para guardar.'
              : draft.status === null
              ? 'Elige una respuesta para incluir esta comida al guardar.'
              : 'Tus cambios se guardaran con el boton principal.'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default CardMealOrder;
