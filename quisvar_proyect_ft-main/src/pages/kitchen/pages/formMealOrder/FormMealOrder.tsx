import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, MouseEvent } from 'react';
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Info,
  LockKeyhole,
  RefreshCw,
  Save,
  X,
} from 'lucide-react';
import { Button as UiButton } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import Select from '@/components/select/Select';
import TextArea from '@/components/textArea/TextArea';
import LoaderForComponent from '@/components/loaderForComponent/LoaderForComponent';
import './formMealOrder.css';
import { _date } from '@/utils/formatDate';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import dayjsSpanish, {
  convertTo12HourFormat,
  formatFullDayDateUtc,
} from '@/utils/dayjsSpanish';
import YesNoRadio from '../../components/yesNoRadio/YesNoRadio';
import { useMealDrafts } from './hooks/useMealDrafts';
import {
  getMyMealOrdersByMonth,
  saveBulkMealOrders,
} from './services/mealOrder.service';
import { buildBulkOrderItems } from './utils/mealOrderDrafts';
import { AmountOfFood } from './interfaces/mealOrder.types';
import type {
  Meal,
  MonthlyDay,
  MonthlyMeal,
  MonthlyMealVisualStatus,
} from './interfaces/mealOrder.types';

const today = _date(new Date());
const weekdays = ['DOM', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB'];

const statusLabels: Record<MonthlyMealVisualStatus, string> = {
  yes: 'Pedido',
  no: 'No desea',
  pending: 'Pendiente',
  closed: 'Cerrado',
};

const getMealLetter = (mealType: string) => {
  const value = mealType.toLowerCase();
  if (value.includes('desay')) return 'D';
  if (value.includes('almuer')) return 'A';
  if (value.includes('cena')) return 'C';
  return mealType.charAt(0).toUpperCase();
};

const getDefaultSelectedDate = (month: string) =>
  month === dayjsSpanish(today).format('YYYY-MM') ? today : `${month}-01`;

const buildCalendarCells = (month: string) => {
  const startOfMonth = dayjsSpanish(`${month}-01`);
  const daysInMonth = startOfMonth.daysInMonth();
  const leadingDays = startOfMonth.day();
  const totalCells = Math.ceil((leadingDays + daysInMonth) / 7) * 7;

  return Array.from({ length: totalCells }, (_, index) => {
    const dayNumber = index - leadingDays + 1;

    if (dayNumber < 1 || dayNumber > daysInMonth) {
      return {
        key: `empty-${index}`,
        date: '',
        dayNumber: '',
        inMonth: false,
      };
    }

    const date = `${month}-${String(dayNumber).padStart(2, '0')}`;

    return {
      key: date,
      date,
      dayNumber: String(dayNumber),
      inMonth: true,
    };
  });
};

const toDailyMeals = (day?: MonthlyDay): Meal[] =>
  (day?.meals ?? []).map(meal => ({
    id: meal.mealId,
    type: meal.type,
    hour: meal.hour,
    order: meal.order || undefined,
  }));

const findMonthlyMeal = (meals: MonthlyMeal[], mealId: number) =>
  meals.find(meal => meal.mealId === mealId);

const isBulkSelectableDate = (date: string) => date >= today;

const uniqueSortedDates = (dates: string[]) =>
  Array.from(new Set(dates)).sort((a, b) => a.localeCompare(b));

const buildSelectableDatesBetween = (startDate: string, endDate: string) => {
  const start = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);
  const currentDate = start <= end ? start : end;
  const lastDate = start <= end ? end : start;
  const dates: string[] = [];

  while (currentDate <= lastDate) {
    const date = _date(new Date(currentDate));
    if (isBulkSelectableDate(date)) {
      dates.push(date);
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates;
};

const FormMealOrder = () => {
  const queryClient = useQueryClient();
  const calendarPanelRef = useRef<HTMLDivElement | null>(null);
  const currentMonth = dayjsSpanish(today).format('YYYY-MM');
  const [calendarMonth, setCalendarMonth] = useState(currentMonth);
  const [selectedDate, setSelectedDate] = useState(today);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBulkSelectionMode, setIsBulkSelectionMode] = useState(false);
  const [bulkBaseMeals, setBulkBaseMeals] = useState<Meal[]>([]);
  const [bulkRangeStartDate, setBulkRangeStartDate] = useState<string | null>(
    null
  );
  const [bulkRangeEndDate, setBulkRangeEndDate] = useState<string | null>(null);
  const [bulkSelectedDates, setBulkSelectedDates] = useState<string[]>([]);
  const [calendarPanelHeight, setCalendarPanelHeight] = useState<number | null>(
    null
  );

  const monthQuery = useQuery({
    queryKey: ['myMealOrdersMonth', calendarMonth],
    queryFn: ({ signal }) => getMyMealOrdersByMonth(calendarMonth, signal),
    placeholderData: keepPreviousData,
  });

  const calendarCells = useMemo(
    () => buildCalendarCells(calendarMonth),
    [calendarMonth]
  );
  const selectedDay = useMemo(
    () => monthQuery.data?.days.find(day => day.date === selectedDate),
    [monthQuery.data?.days, selectedDate]
  );
  const selectedDayMeals = useMemo(
    () => toDailyMeals(selectedDay),
    [selectedDay]
  );
  const selectedMonthLabel = useMemo(
    () => dayjsSpanish(`${calendarMonth}-01`).format('MMMM YYYY'),
    [calendarMonth]
  );
  const bulkSelectedDatesCount = bulkSelectedDates.length;
  const hasBulkSelection = bulkSelectedDatesCount > 0;
  const draftMode = isBulkSelectionMode ? 'empty' : 'saved';
  const draftMeals = isBulkSelectionMode ? bulkBaseMeals : selectedDayMeals;

  const {
    mealsWithDrafts,
    resetDrafts,
    clearDrafts,
    updateDraft: handleDraftChange,
  } = useMealDrafts(draftMeals, {
    mode: draftMode,
    date: isBulkSelectionMode ? '' : selectedDate,
  });

  useEffect(() => {
    if (isBulkSelectionMode || !selectedDay || monthQuery.isPlaceholderData) {
      return;
    }

    resetDrafts(selectedDayMeals);
  }, [
    isBulkSelectionMode,
    monthQuery.isPlaceholderData,
    resetDrafts,
    selectedDay,
    selectedDayMeals,
  ]);

  useEffect(() => {
    const calendarPanel = calendarPanelRef.current;

    if (!calendarPanel) return;

    const updateCalendarHeight = () => {
      setCalendarPanelHeight(calendarPanel.getBoundingClientRect().height);
    };

    updateCalendarHeight();

    const resizeObserver = new ResizeObserver(updateCalendarHeight);
    resizeObserver.observe(calendarPanel);

    return () => resizeObserver.disconnect();
  }, [calendarCells.length, monthQuery.dataUpdatedAt]);

  const changedMeals = useMemo(() => {
    if (isBulkSelectionMode) {
      return mealsWithDrafts.filter(
        ({ draft }) => draft.status !== null && !isSubmitting
      );
    }

    return mealsWithDrafts.filter(({ draft, hasChanges, meal }) => {
      const monthlyMeal = selectedDay
        ? findMonthlyMeal(selectedDay.meals, meal.id)
        : null;

      return (
        hasChanges &&
        draft.status !== null &&
        !isSubmitting &&
        !!monthlyMeal?.editable
      );
    });
  }, [isBulkSelectionMode, isSubmitting, mealsWithDrafts, selectedDay]);
  const changedMealsCount = changedMeals.length;
  const targetSaveDates = isBulkSelectionMode
    ? bulkSelectedDates
    : [selectedDate];
  const isTodaySelected =
    calendarMonth === currentMonth && selectedDate === today;
  const isMonthTransitioning =
    monthQuery.isPlaceholderData && monthQuery.isFetching;

  const moveMonth = (direction: -1 | 1) => {
    const nextMonth = dayjsSpanish(`${calendarMonth}-01`)
      .add(direction, 'month')
      .format('YYYY-MM');

    setCalendarMonth(nextMonth);

    if (!isBulkSelectionMode) {
      clearDrafts();
      setSelectedDate(getDefaultSelectedDate(nextMonth));
    }
  };

  const handleGoToToday = () => {
    if (isTodaySelected) return;

    setCalendarMonth(currentMonth);

    if (!isBulkSelectionMode) {
      clearDrafts();
      setSelectedDate(today);
    }
  };

  const handleSelectDate = (date: string) => {
    clearDrafts();
    setSelectedDate(date);
  };

  const clearBulkSelection = () => {
    clearDrafts();
    setIsBulkSelectionMode(false);
    setBulkBaseMeals([]);
    setBulkRangeStartDate(null);
    setBulkRangeEndDate(null);
    setBulkSelectedDates([]);
  };

  const startBulkSelectionMode = () => {
    clearDrafts();
    setBulkBaseMeals(selectedDayMeals);
    setIsBulkSelectionMode(true);
  };

  const toggleBulkDate = (date: string) => {
    if (!isBulkSelectableDate(date)) {
      SnackbarUtilities.warning('No se pueden seleccionar dias pasados.');
      return;
    }

    const nextDates = bulkSelectedDates.includes(date)
      ? bulkSelectedDates.filter(currentDate => currentDate !== date)
      : uniqueSortedDates([...bulkSelectedDates, date]);

    if (!isBulkSelectionMode) {
      startBulkSelectionMode();
    }

    setBulkSelectedDates(nextDates);

    if (!isBulkSelectionMode && !isBulkSelectableDate(selectedDate)) {
      clearDrafts();
      setCalendarMonth(date.slice(0, 7));
      setSelectedDate(date);
    }
  };

  const selectBulkDateRange = (date: string) => {
    if (!isBulkSelectableDate(date)) {
      SnackbarUtilities.warning('No se pueden seleccionar dias pasados.');
      return;
    }

    if (!isBulkSelectionMode) {
      startBulkSelectionMode();
    }

    if (!bulkRangeStartDate || !bulkRangeEndDate) {
      setBulkSelectedDates([date]);
      setBulkRangeStartDate(date);
      setBulkRangeEndDate(date);
      return;
    }

    if (bulkRangeStartDate !== bulkRangeEndDate && date === bulkRangeEndDate) {
      setBulkSelectedDates([date]);
      setBulkRangeStartDate(date);
      setBulkRangeEndDate(date);
      return;
    }

    const nextStartDate = date < bulkRangeStartDate ? date : bulkRangeStartDate;
    const nextEndDate = date < bulkRangeStartDate ? bulkRangeEndDate : date;
    const rangeDates = buildSelectableDatesBetween(nextStartDate, nextEndDate);

    setBulkSelectedDates(uniqueSortedDates(rangeDates));
    setBulkRangeStartDate(nextStartDate);
    setBulkRangeEndDate(nextEndDate);
  };

  const handleCalendarDateClick = (
    event: MouseEvent<HTMLButtonElement>,
    date: string
  ) => {
    if (event.shiftKey) {
      selectBulkDateRange(date);
      return;
    }

    if (isBulkSelectionMode) {
      toggleBulkDate(date);
      return;
    }

    handleSelectDate(date);
  };

  const refreshMonth = async () => {
    const refreshed = await monthQuery.refetch();

    if (refreshed.data && !isBulkSelectionMode) {
      const nextSelectedDay = refreshed.data.days.find(
        day => day.date === selectedDate
      );
      resetDrafts(toDailyMeals(nextSelectedDay));
    }

    SnackbarUtilities.success('Planificacion actualizada');
  };

  const invalidateMonthlyData = async () => {
    await queryClient.invalidateQueries({
      queryKey: ['myMealOrdersMonth'],
    });
  };

  const handleSaveChanges = async () => {
    if (
      changedMealsCount === 0 ||
      (isBulkSelectionMode && !hasBulkSelection) ||
      isSubmitting
    ) {
      return;
    }

    try {
      setIsSubmitting(true);
      const data = await saveBulkMealOrders({
        dates: targetSaveDates,
        orders: buildBulkOrderItems(changedMeals),
      });

      if (data.skippedClosedCount > 0) {
        SnackbarUtilities.warning(
          isBulkSelectionMode
            ? `Se aplicaron ${data.processedOrders} cambios en ${data.processedDates} dias y se omitieron ${data.skippedClosedCount} cerrados.`
            : `Se guardaron ${data.processedOrders} cambios y se omitieron ${data.skippedClosedCount} cerrados.`
        );
      } else {
        SnackbarUtilities.success(
          isBulkSelectionMode
            ? `Se aplicaron ${data.processedOrders} cambios en ${data.processedDates} dias`
            : `Se guardaron ${data.processedOrders} cambios`
        );
      }

      await invalidateMonthlyData();
      if (isBulkSelectionMode) {
        clearBulkSelection();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDisabledSave =
    changedMealsCount === 0 ||
    (isBulkSelectionMode && !hasBulkSelection) ||
    isSubmitting ||
    monthQuery.isFetching ||
    monthQuery.isLoading;
  const summary = monthQuery.data?.summary;
  const detailPanelStyle = calendarPanelHeight
    ? ({
        '--formMealOrder-calendar-height': `${calendarPanelHeight}px`,
      } as CSSProperties)
    : undefined;

  return (
    <div
      className="formMealOrder"
      style={{
        cursor:
          monthQuery.isFetching || monthQuery.isLoading
            ? 'progress'
            : 'default',
      }}
    >
      <section className="formMealOrder-toolbar">
        <div className="formMealOrder-heading">
          <span className="formMealOrder-kicker">Planificacion mensual</span>
          <h2 className="formMealOrder-title">Resumen de pedidos</h2>
        </div>

        <div className="formMealOrder-actions">
          <UiButton
            type="button"
            variant="outline"
            onClick={refreshMonth}
            disabled={monthQuery.isFetching}
          >
            <RefreshCw />
            Actualizar
          </UiButton>
        </div>
      </section>

      <section className="formMealOrder-summary">
        <Card className="formMealOrder-summaryCard">
          <CardHeader>
            <CardTitle>Pedido</CardTitle>
          </CardHeader>
          <CardContent>{summary?.confirmed ?? 0}</CardContent>
        </Card>
        <Card className="formMealOrder-summaryCard">
          <CardHeader>
            <CardTitle>No desea</CardTitle>
          </CardHeader>
          <CardContent>{summary?.declined ?? 0}</CardContent>
        </Card>
        <Card className="formMealOrder-summaryCard">
          <CardHeader>
            <CardTitle>Pendiente</CardTitle>
          </CardHeader>
          <CardContent>{summary?.pending ?? 0}</CardContent>
        </Card>
        <Card className="formMealOrder-summaryCard">
          <CardHeader>
            <CardTitle>Cerrado</CardTitle>
          </CardHeader>
          <CardContent>{summary?.closed ?? 0}</CardContent>
        </Card>
      </section>

      <section className="formMealOrder-planner">
        <Card ref={calendarPanelRef} className="formMealOrder-calendarPanel">
          <CardHeader className="formMealOrder-calendarHeader">
            <div className="formMealOrder-monthTitle">
              <CalendarDays />
              <span>{selectedMonthLabel}</span>
            </div>
            <div className="formMealOrder-calendarActions">
              <div className="formMealOrder-bulkInline">
                <span className="formMealOrder-bulkLabel">
                  Aplicar a varios dias
                </span>
                <span className="formMealOrder-bulkModeText">
                  {isBulkSelectionMode
                    ? 'Shift + click modifica rango; click agrega/quita'
                    : 'Shift + click inicia rango'}
                </span>
                <Badge variant={hasBulkSelection ? 'success' : 'outline'}>
                  {bulkSelectedDatesCount} dias
                </Badge>
                {isBulkSelectionMode && hasBulkSelection && (
                  <UiButton
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="formMealOrder-bulkClearButton"
                    onClick={clearBulkSelection}
                  >
                    <X />
                    Limpiar
                  </UiButton>
                )}
              </div>
              <div className="formMealOrder-monthNav">
                <UiButton
                  type="button"
                  size="icon-sm"
                  variant="outline"
                  onClick={() => moveMonth(-1)}
                  aria-label="Mes anterior"
                  disabled={monthQuery.isFetching || monthQuery.isLoading}
                >
                  <ChevronLeft />
                </UiButton>
                <UiButton
                  type="button"
                  size="sm"
                  variant="outline"
                  className="formMealOrder-todayNavButton"
                  onClick={handleGoToToday}
                  disabled={
                    isTodaySelected ||
                    monthQuery.isFetching ||
                    monthQuery.isLoading
                  }
                >
                  Hoy
                </UiButton>
                <UiButton
                  type="button"
                  size="icon-sm"
                  variant="outline"
                  onClick={() => moveMonth(1)}
                  aria-label="Mes siguiente"
                  disabled={monthQuery.isFetching || monthQuery.isLoading}
                >
                  <ChevronRight />
                </UiButton>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {monthQuery.isLoading ? (
              <div className="formMealOrder-feedback">
                <LoaderForComponent width={90} variant="transparent" />
              </div>
            ) : (
              <>
                <div className="formMealOrder-weekdays">
                  {weekdays.map(weekday => (
                    <span key={weekday}>{weekday}</span>
                  ))}
                </div>
                <div className="formMealOrder-calendarGridWrapper">
                  <div
                    className={`formMealOrder-calendarGrid ${
                      isMonthTransitioning
                        ? 'formMealOrder-calendarGrid--loading'
                        : ''
                    }`}
                  >
                    {calendarCells.map(cell => {
                      const day = isMonthTransitioning
                        ? undefined
                        : monthQuery.data?.days.find(
                            item => item.date === cell.date
                          );
                      const isBulkSelected = bulkSelectedDates.includes(
                        cell.date
                      );
                      const isSelected =
                        !isBulkSelectionMode && selectedDate === cell.date;
                      const isBulkSelectable =
                        isBulkSelectionMode &&
                        cell.inMonth &&
                        isBulkSelectableDate(cell.date);

                      return (
                        <button
                          key={cell.key}
                          type="button"
                          className={`formMealOrder-dayCell ${
                            !cell.inMonth ? 'formMealOrder-dayCell--empty' : ''
                          } ${
                            isSelected ? 'formMealOrder-dayCell--selected' : ''
                          } ${
                            day?.isToday ? 'formMealOrder-dayCell--today' : ''
                          } ${
                            day?.isPast ? 'formMealOrder-dayCell--past' : ''
                          } ${
                            isBulkSelected
                              ? 'formMealOrder-dayCell--bulkSelected'
                              : ''
                          } ${
                            isBulkSelectable
                              ? 'formMealOrder-dayCell--bulkSelectable'
                              : ''
                          }`}
                          onClick={event =>
                            cell.inMonth &&
                            handleCalendarDateClick(event, cell.date)
                          }
                          disabled={!cell.inMonth || isMonthTransitioning}
                          aria-pressed={isSelected || isBulkSelected}
                        >
                          <span className="formMealOrder-dayNumber">
                            {cell.dayNumber}
                            {day?.isToday && (
                              <Badge className="formMealOrder-todayBadge">
                                Hoy
                              </Badge>
                            )}
                          </span>
                          <span className="formMealOrder-dayMeals">
                            {isMonthTransitioning && cell.inMonth
                              ? ['D', 'A', 'C'].map(mealLetter => (
                                  <span
                                    key={`${cell.date}-${mealLetter}`}
                                    className="formMealOrder-mealChipSkeleton"
                                  />
                                ))
                              : day?.meals.map(meal => {
                                  const isMealClosed = !!meal.order?.isClose;

                                  return (
                                    <span
                                      key={`${day.date}-${meal.mealId}`}
                                      className={`formMealOrder-mealChip formMealOrder-mealChip--${
                                        meal.visualStatus
                                      } ${
                                        isMealClosed
                                          ? 'formMealOrder-mealChip--locked'
                                          : ''
                                      }`}
                                      title={`${meal.type}: ${
                                        statusLabels[meal.visualStatus]
                                      }${
                                        isMealClosed ? ' - Comida cerrada' : ''
                                      }`}
                                    >
                                      {getMealLetter(meal.type)}
                                      {isMealClosed && (
                                        <LockKeyhole
                                          className="formMealOrder-mealChipLock"
                                          aria-hidden="true"
                                        />
                                      )}
                                    </span>
                                  );
                                })}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <Separator className="formMealOrder-calendarSeparator" />
                <div className="formMealOrder-legend">
                  <span>
                    <strong>D</strong> Desayuno
                  </span>
                  <span>
                    <strong>A</strong> Almuerzo
                  </span>
                  <span>
                    <strong>C</strong> Cena
                  </span>
                  <span className="formMealOrder-legendState formMealOrder-legendState--yes">
                    Pedido
                  </span>
                  <span className="formMealOrder-legendState formMealOrder-legendState--no">
                    No desea
                  </span>
                  <span className="formMealOrder-legendState formMealOrder-legendState--pending">
                    Pendiente
                  </span>
                  <span className="formMealOrder-legendState formMealOrder-legendState--closed">
                    Cerrado
                  </span>
                  <span className="formMealOrder-legendLock">
                    <LockKeyhole aria-hidden="true" />
                    Comida cerrada
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="formMealOrder-detailPanel" style={detailPanelStyle}>
          <CardHeader className="formMealOrder-detailHeader">
            <div>
              <span className="formMealOrder-detailKicker">
                {isBulkSelectionMode
                  ? 'Configurar varios dias'
                  : 'Menu del dia'}
              </span>
              <CardTitle>
                {isBulkSelectionMode
                  ? `${bulkSelectedDatesCount} dias seleccionados`
                  : formatFullDayDateUtc(selectedDate)}
              </CardTitle>
            </div>
            <UiButton
              type="button"
              onClick={handleSaveChanges}
              disabled={isDisabledSave}
            >
              <Save />
              {isSubmitting
                ? 'Guardando...'
                : isBulkSelectionMode && !hasBulkSelection
                ? 'Selecciona dias'
                : changedMealsCount > 0
                ? isBulkSelectionMode
                  ? `Aplicar a ${bulkSelectedDatesCount} dias`
                  : `Guardar cambios (${changedMealsCount})`
                : 'Sin cambios'}
            </UiButton>
          </CardHeader>
          <CardContent className="formMealOrder-detailContent">
            {monthQuery.isLoading || isMonthTransitioning ? (
              <div className="formMealOrder-feedback">
                <LoaderForComponent width={90} variant="transparent" />
              </div>
            ) : mealsWithDrafts.length > 0 ? (
              mealsWithDrafts.map(({ meal, draft, hasChanges }) => {
                const monthlyMeal = selectedDay
                  ? findMonthlyMeal(selectedDay.meals, meal.id)
                  : null;
                const isEditable = isBulkSelectionMode
                  ? !isSubmitting
                  : !!monthlyMeal?.editable && !isSubmitting;
                const visualStatus = isBulkSelectionMode
                  ? 'pending'
                  : monthlyMeal?.visualStatus || 'pending';

                return (
                  <article
                    key={`${selectedDate}-${meal.id}`}
                    className={`formMealOrder-detailMeal ${
                      !isBulkSelectionMode && !monthlyMeal?.editable
                        ? 'formMealOrder-detailMeal--readonly'
                        : ''
                    }`}
                  >
                    <div className="formMealOrder-detailMealTop">
                      <div className="formMealOrder-detailMealTitle">
                        <Badge
                          variant={
                            visualStatus === 'yes'
                              ? 'success'
                              : visualStatus === 'no'
                              ? 'danger'
                              : visualStatus === 'pending'
                              ? 'warning'
                              : 'outline'
                          }
                        >
                          {meal.type}
                        </Badge>
                        <strong>{convertTo12HourFormat(meal.hour)}</strong>
                      </div>
                      <Badge variant="outline">
                        {isBulkSelectionMode
                          ? 'Por aplicar'
                          : statusLabels[visualStatus]}
                      </Badge>
                    </div>

                    <YesNoRadio
                      value={draft.status}
                      name={`status-${meal.id}`}
                      idPrefix={`pedido-${meal.id}`}
                      onChange={event => handleDraftChange(meal.id, event)}
                      disabled={!isEditable}
                    />

                    <div className="formMealOrder-detailField">
                      <label>Porcion</label>
                      <Select
                        data={Object.values(AmountOfFood)}
                        extractValue={value => value}
                        renderTextField={value => value}
                        styleVariant="tertiary"
                        onChange={event => handleDraftChange(meal.id, event)}
                        disabled={!isEditable}
                        name="amountOfFood"
                        value={draft.amountOfFood}
                        placeholderDisabled
                      />
                    </div>

                    <TextArea
                      label="Comentario"
                      value={draft.comment}
                      name="comment"
                      placeholder="Ejemplo: sin aji, recoger mas tarde..."
                      disabled={!isEditable}
                      onChange={event => handleDraftChange(meal.id, event)}
                      style={{ resize: 'vertical' }}
                    />

                    <div className="formMealOrder-detailHint">
                      <Info />
                      <span>
                        {isBulkSelectionMode
                          ? draft.status === null
                            ? 'Elige una respuesta para incluir esta comida.'
                            : 'Comida lista para aplicar al rango.'
                          : !monthlyMeal?.editable
                          ? 'Solo visual: este dia o comida ya no admite cambios.'
                          : !hasChanges
                          ? 'Sin cambios pendientes.'
                          : draft.status === null
                          ? 'Elige una respuesta para guardar esta comida.'
                          : 'Cambio listo para guardar.'}
                      </span>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="formMealOrder-feedback">
                No hay comidas configuradas para este dia.
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

export default FormMealOrder;
