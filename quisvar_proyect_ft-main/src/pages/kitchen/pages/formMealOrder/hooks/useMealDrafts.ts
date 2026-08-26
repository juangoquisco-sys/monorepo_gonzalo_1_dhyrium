import { type ChangeEvent, useCallback, useMemo, useState } from 'react';
import type {
  Meal,
  MealDraft,
  MealDraftsByMealId,
  MealWithDraft,
} from '../interfaces/mealOrder.types';
import {
  buildDraftsFromMeals,
  createEmptyMealDraft,
  createDraftFromMeal,
  type MealDraftMode,
  hasDraftChanges,
  isMealLocked,
} from '../utils/mealOrderDrafts';

interface UseMealDraftsOptions {
  mode: MealDraftMode;
  date?: string;
}

export const useMealDrafts = (
  meals: Meal[],
  { mode, date = '' }: UseMealDraftsOptions
) => {
  const [mealDrafts, setMealDrafts] = useState<MealDraftsByMealId>({});

  const resetDrafts = useCallback(
    (nextMeals: Meal[] = meals) => {
      setMealDrafts(buildDraftsFromMeals(nextMeals, mode));
    },
    [meals, mode]
  );

  const clearDrafts = useCallback(() => {
    setMealDrafts({});
  }, []);

  const createInitialDraft = useCallback(
    (meal: Meal) =>
      mode === 'empty' ? createEmptyMealDraft() : createDraftFromMeal(meal),
    [mode]
  );

  const updateDraft = useCallback(
    (
      mealId: number,
      event:
        | ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
        | ChangeEvent<HTMLSelectElement>
    ) => {
      const { value, name } = event.target;
      const key = name.split('-')[0] as keyof MealDraft;
      const meal = meals.find(item => item.id === mealId);

      if (!meal) return;

      setMealDrafts(prev => ({
        ...prev,
        [mealId]: {
          ...(prev[mealId] || createInitialDraft(meal)),
          [key]: value,
        } as MealDraft,
      }));
    },
    [createInitialDraft, meals]
  );

  const mealsWithDrafts = useMemo<MealWithDraft[]>(
    () =>
      meals.map(meal => {
        const draft = mealDrafts[meal.id] || createInitialDraft(meal);

        return {
          meal,
          draft,
          hasChanges: hasDraftChanges(meal, draft),
          isLocked: date ? !!isMealLocked(meal, date) : false,
        };
      }),
    [createInitialDraft, date, mealDrafts, meals]
  );

  return {
    mealDrafts,
    mealsWithDrafts,
    resetDrafts,
    clearDrafts,
    updateDraft,
  };
};
