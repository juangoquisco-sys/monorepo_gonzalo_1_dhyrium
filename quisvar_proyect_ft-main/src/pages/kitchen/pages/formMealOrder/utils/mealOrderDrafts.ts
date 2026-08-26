import { isBeforeTodayFn } from '@/utils/dayjsSpanish';
import {
  AmountOfFood,
  type BulkMealOrderItem,
  type Meal,
  type MealDraft,
  type MealDraftsByMealId,
  type MealWithDraft,
} from '../interfaces/mealOrder.types';

export type MealDraftMode = 'saved' | 'empty';

export const createEmptyMealDraft = (): MealDraft => ({
  status: null,
  comment: '',
  amountOfFood: AmountOfFood.NORMAL,
});

export const createDraftFromMeal = (meal: Meal): MealDraft => {
  const mealUser = meal.order?.mealOrderOnUsers?.[0];

  return {
    status:
      typeof mealUser?.status === 'boolean'
        ? mealUser.status
          ? 'yes'
          : 'no'
        : null,
    comment: mealUser?.comment || '',
    amountOfFood: mealUser?.amountOfFood || AmountOfFood.NORMAL,
  };
};

export const buildDraftsFromMeals = (
  meals: Meal[],
  mode: MealDraftMode = 'saved'
): MealDraftsByMealId =>
  Object.fromEntries(
    meals.map(meal => [
      meal.id,
      mode === 'empty' ? createEmptyMealDraft() : createDraftFromMeal(meal),
    ])
  );

export const hasDraftChanges = (meal: Meal, draft: MealDraft) => {
  const savedDraft = createDraftFromMeal(meal);

  return (
    draft.status !== savedDraft.status ||
    draft.comment !== savedDraft.comment ||
    draft.amountOfFood !== savedDraft.amountOfFood
  );
};

export const isMealLocked = (meal: Meal, date: string) =>
  meal.order?.isClose || isBeforeTodayFn(date);

export const buildBulkOrderItems = (
  mealsWithDrafts: Pick<MealWithDraft, 'meal' | 'draft'>[]
): BulkMealOrderItem[] =>
  mealsWithDrafts
    .filter(({ draft }) => draft.status !== null)
    .map(({ meal, draft }) => ({
      mealId: meal.id,
      status: draft.status === 'yes',
      comment: draft.comment,
      amountOfFood: draft.amountOfFood,
    }));
