import {
  createColumnHelper,
  getFilteredRowModel,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  DeliveryStatus,
  MealPickupStatus,
} from '../../../formMealOrder/interfaces/mealOrder.types';
import type { UserMeal } from '../../../formMealOrder/interfaces/mealOrder.types';
import './tableListMealOrder.css';
import { getFullNameRevert } from '@/utils/tools';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import DivFlex from '@/components/divFlex/DivFlex';
import Select from '@/components/select/Select';
import Table from '@/components/table/Table';
import TableBody from '@/components/table/TableBody';
import TableHead from '@/components/table/TableHead';
import TableNoData from '@/components/table/TableNoData';
import { axiosInstance } from '@/services/axiosInstance';
import {
  convertTo12HourFormat,
  formatDateTimeVisibleUtc,
  formatFullDayDateUtc,
} from '@/utils/dayjsSpanish';
import { useContext, useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ListMealOrderContext } from '../../ListMealOrderContext';
import { FiCalendar, FiCheck, FiX } from 'react-icons/fi';
import { PiLockKeyFill, PiLockKeyOpenFill } from 'react-icons/pi';
import { COLOR_CSS } from '@/utils/cssData';
import { getLunchMenuModeration } from '../../../../lunch-menu/lunchMenu.service';

const deliveryStatusLabelMap: Record<DeliveryStatus, string> = {
  [DeliveryStatus.PICKED_UP]: 'Recogió',
  [DeliveryStatus.NOT_PICKED_UP]: 'No recogió',
  [DeliveryStatus.RESERVED]: 'Reservado',
  [DeliveryStatus.PENDING_PICKUP]: 'Pendiente retiro',
  [DeliveryStatus.NO_SERVICE]: 'No servido',
  [DeliveryStatus.MISSED_CLOSE]: 'Sin cierre',
  [DeliveryStatus.OPEN]: 'Abierto',
  [DeliveryStatus.NOT_APPLICABLE]: 'No aplica',
};

const getDeliveryStatusChipClass = (deliveryStatus: DeliveryStatus) => {
  if (deliveryStatus === DeliveryStatus.PICKED_UP) {
    return 'tableListMealOrder-chip--yes';
  }
  if (deliveryStatus === DeliveryStatus.NOT_PICKED_UP) {
    return 'tableListMealOrder-chip--no';
  }
  if (deliveryStatus === DeliveryStatus.RESERVED) {
    return 'tableListMealOrder-chip--reserved';
  }
  if (deliveryStatus === DeliveryStatus.NO_SERVICE) {
    return 'tableListMealOrder-chip--noService';
  }
  if (deliveryStatus === DeliveryStatus.MISSED_CLOSE) {
    return 'tableListMealOrder-chip--missedClose';
  }
  if (deliveryStatus === DeliveryStatus.OPEN) {
    return 'tableListMealOrder-chip--open';
  }
  if (deliveryStatus === DeliveryStatus.NOT_APPLICABLE) {
    return 'tableListMealOrder-chip--na';
  }
  return 'tableListMealOrder-chip--pending';
};

const pickupStatusActionMap: Array<{
  status: MealPickupStatus;
  label: string;
  icon: typeof FiCheck;
  className: string;
}> = [
  {
    status: MealPickupStatus.PICKED_UP,
    label: 'Recogió',
    icon: FiCheck,
    className: 'tableListMealOrder-segmentAction--yes',
  },
  {
    status: MealPickupStatus.RESERVED,
    label: 'Reservado',
    icon: FiCalendar,
    className: 'tableListMealOrder-segmentAction--reserved',
  },
  {
    status: MealPickupStatus.NOT_PICKED_UP,
    label: 'No recogió',
    icon: FiX,
    className: 'tableListMealOrder-segmentAction--no',
  },
];

const getLicenseJustificationTitle = (user: UserMeal) => {
  const license = user.licenseJustification;
  if (!license) return '';

  const type = license.type || 'Permiso';
  const reason = license.reason || 'Sin motivo registrado';
  return `${type}: ${reason}. Desde ${formatDateTimeVisibleUtc(
    license.startDate
  )} hasta ${formatDateTimeVisibleUtc(license.untilDate)}`;
};

const ACTION_COLUMN_STICKY_OFFSET = '8.25rem';

const TableListMealOrderChip = ({
  children,
  className = '',
  title,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
}) => (
  <span className={`tableListMealOrder-chip ${className}`} title={title}>
    <span className="tableListMealOrder-chipText">{children}</span>
  </span>
);

const getMobileDeliveryClass = (user: UserMeal) => {
  if (user.mealStatus === false) {
    return 'tableListMealOrder-mobileItem--na';
  }
  if (user.deliveryStatus === DeliveryStatus.PICKED_UP) {
    return 'tableListMealOrder-mobileItem--yes';
  }
  if (user.deliveryStatus === DeliveryStatus.NOT_PICKED_UP) {
    return 'tableListMealOrder-mobileItem--no';
  }
  if (user.deliveryStatus === DeliveryStatus.RESERVED) {
    return 'tableListMealOrder-mobileItem--reserved';
  }
  if (user.deliveryStatus || typeof user.mealStatus !== 'boolean') {
    return 'tableListMealOrder-mobileItem--attention';
  }
  if (user.mealStatus) {
    return 'tableListMealOrder-mobileItem--yes';
  }
  return 'tableListMealOrder-mobileItem--attention';
};

const getMealStatusChipData = (mealStatus: UserMeal['mealStatus']) => {
  if (mealStatus === true) {
    return {
      label: 'Pidió',
      className: 'tableListMealOrder-chip--yes',
    };
  }
  if (mealStatus === false) {
    return {
      label: 'No pidió',
      className: 'tableListMealOrder-chip--no',
    };
  }
  return {
    label: 'Sin respuesta',
    className: 'tableListMealOrder-chip--pending',
  };
};

const TableListMealOrder = () => {
  const {
    date,
    mealOrderSelected: meal,
    divRef,
    onGetMeal,
    onToggleMealClose,
    isBeforeToday,
    filters,
    searchText,
    isTogglingMealClose,
  } = useContext(ListMealOrderContext);
  const [pickupSavingUserId, setPickupSavingUserId] = useState<number | null>(
    null
  );
  const [expandedLunchUserId, setExpandedLunchUserId] = useState<number | null>(
    null
  );
  const showActionColumn = !!meal?.order?.isClose && !isBeforeToday;
  const isLunch = meal?.type.toLowerCase() === 'almuerzo';
  const lunchMenuQuery = useQuery({
    queryKey: ['lunch-menu-moderation', date],
    queryFn: ({ signal }) => getLunchMenuModeration(date, signal),
    enabled: isLunch,
    retry: false,
  });
  const lunchSelectionByUserId = useMemo(
    () => new Map((lunchMenuQuery.data?.users ?? []).map(user => [user.userId, user.selection])),
    [lunchMenuQuery.data]
  );
  const lunchSecondNameByUserId = useMemo(
    () =>
      new Map(
        (lunchMenuQuery.data?.users ?? []).map(user => {
          const secondId = user.selection?.lunchMenuSecondId;
          const second = lunchMenuQuery.data?.seconds?.find(item => item.id === secondId);
          return [user.userId, second?.name ?? 'Sin elección'];
        })
      ),
    [lunchMenuQuery.data]
  );

  const columnHelper = createColumnHelper<UserMeal>();

  const handleStatusMeal = async (value: string, userId: number) => {
    if (!meal) return;

    await axiosInstance.post(`/kitchen/order-meal/user/${userId}`, {
      mealOrderId: meal.order?.id,
      status: value === 'Si',
      mealId: meal.id,
      orderDate: date,
    });
    SnackbarUtilities.success('Respuesta actualizada');
    onGetMeal();
  };

  const handlePickupStatus = async (
    pickupStatus: MealPickupStatus,
    userId: number
  ) => {
    if (!meal) return;

    try {
      setPickupSavingUserId(userId);
      await axiosInstance.post(`/kitchen/order-meal/pickup/user/${userId}`, {
        mealOrderId: meal.order?.id,
        pickupStatus,
      });
      SnackbarUtilities.success('Entrega actualizada');
      onGetMeal();
    } finally {
      setPickupSavingUserId(null);
    }
  };

  const renderPickupActions = (user: UserMeal, variant: 'table' | 'mobile') => {
    const pickupStatus = user.pickupStatus || null;
    const isSavingPickup = pickupSavingUserId === user.id;

    if (!user.mealStatus) {
      return (
        <DivFlex flexDirection="column" alignItems="center">
          <TableListMealOrderChip className="tableListMealOrder-chip--na">
            ---
          </TableListMealOrderChip>
        </DivFlex>
      );
    }

    return (
      <div className="tableListMealOrder-pickupCell">
        <div
          className={`tableListMealOrder-segmented ${
            variant === 'mobile' ? 'tableListMealOrder-segmented--mobile' : ''
          } ${isSavingPickup ? 'tableListMealOrder-segmented--loading' : ''}`}
        >
          {pickupStatusActionMap.map(action => {
            const Icon = action.icon;
            const isActive = pickupStatus === action.status;
            const isBlockedByLicense =
              action.status === MealPickupStatus.NOT_PICKED_UP &&
              !!user.licenseJustification;

            return (
              <button
                key={action.status}
                type="button"
                title={
                  isBlockedByLicense
                    ? getLicenseJustificationTitle(user)
                    : action.label
                }
                aria-label={action.label}
                disabled={isSavingPickup || isBlockedByLicense}
                className={`tableListMealOrder-segmentAction ${
                  action.className
                } ${
                  variant === 'mobile'
                    ? 'tableListMealOrder-segmentAction--mobile'
                    : ''
                } ${
                  isBlockedByLicense
                    ? 'tableListMealOrder-segmentAction--blocked'
                    : ''
                } ${
                  isActive ? 'tableListMealOrder-segmentAction--active' : ''
                }`}
                onClick={() => handlePickupStatus(action.status, user.id)}
              >
                <Icon size={14} />
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const columns = [
    columnHelper.display({
      header: 'N°',
      cell: ({ row }) => (
        <div style={{ textAlign: 'center' }}>{row.index + 1}</div>
      ),
    }),
    columnHelper.accessor(user => getFullNameRevert(user), {
      id: 'fullName',
      header: 'NOMBRE',

      cell: ({ getValue }) => <span title={getValue()}>{getValue()}</span>,
    }),
    columnHelper.display({
      id: 'lunchMenu',
      header: 'MENÚ',
      cell: ({ row: { original } }) => {
        if (!isLunch || original.mealStatus !== true) return '---';
        const selection = lunchSelectionByUserId.get(original.id);
        if (!selection) return <TableListMealOrderChip className="tableListMealOrder-chip--pending">Pendiente de menú</TableListMealOrderChip>;
        const second = lunchMenuQuery.data?.seconds?.find(item => item.id === selection.lunchMenuSecondId);
        return second?.name || '---';
      },
    }),
    columnHelper.display({
      id: 'accompaniments',
      header: 'ACOMPAÑAMIENTOS',
      cell: ({ row: { original } }) => {
        if (!isLunch || original.mealStatus !== true) return '---';
        const selection = lunchSelectionByUserId.get(original.id);
        if (!selection) return 'Pendiente';
        return [
          lunchMenuQuery.data?.soupAvailable ? (selection.wantsSoup ? 'Sopa: Sí' : 'Sopa: No') : null,
          lunchMenuQuery.data?.dessertAvailable ? (selection.wantsDessert ? 'Postre: Sí' : 'Postre: No') : null,
          lunchMenuQuery.data?.refreshmentAvailable ? (selection.wantsRefreshment ? 'Refresco: Sí' : 'Refresco: No') : null,
        ].filter(Boolean).join(' · ');
      },
    }),
    columnHelper.accessor('mealStatus', {
      header: () => (
        <DivFlex width={8}>
          <span>PEDIDO</span>
        </DivFlex>
      ),

      cell: ({ getValue, row: { original } }) => (
        <div>
          {!meal?.order?.isClose && !isBeforeToday ? (
            <Select
              value={
                typeof getValue() === 'boolean'
                  ? getValue()
                    ? 'Si'
                    : 'No'
                  : ''
              }
              placeholderDisabled
              name="status"
              data={['Si', 'No']}
              extractValue={value => value}
              renderTextField={value => value}
              placeholder="Sin respuesta"
              styleVariant="tertiary"
              onChange={({ target }) =>
                handleStatusMeal(target.value, original.id)
              }
            />
          ) : (
            <TableListMealOrderChip
              className={
                typeof getValue() === 'boolean'
                  ? getValue()
                    ? 'tableListMealOrder-chip--yes'
                    : 'tableListMealOrder-chip--no'
                  : 'tableListMealOrder-chip--pending'
              }
            >
              {typeof getValue() === 'boolean'
                ? getValue()
                  ? 'Si'
                  : 'No'
                : 'Sin respuesta'}
            </TableListMealOrderChip>
          )}
        </div>
      ),
    }),
    columnHelper.accessor('pickupStatus', {
      header: () => (
        <div className="tableListMealOrder-headerLabel">
          <span>Estado de entrega</span>
        </div>
      ),

      meta: {
        sticky: 'right',
        stickyOffset: showActionColumn ? ACTION_COLUMN_STICKY_OFFSET : 0,
      },
      cell: ({ row: { original } }) => {
        const deliveryStatus =
          original.deliveryStatus || DeliveryStatus.NOT_APPLICABLE;
        if (!original.mealStatus) {
          return (
            <DivFlex flexDirection="column" alignItems="center">
              <TableListMealOrderChip className="tableListMealOrder-chip--na">
                No aplica
              </TableListMealOrderChip>
            </DivFlex>
          );
        }
        return (
          <div className="tableListMealOrder-pickupCell">
            <TableListMealOrderChip
              title={getLicenseJustificationTitle(original)}
              className={getDeliveryStatusChipClass(deliveryStatus)}
            >
              {deliveryStatusLabelMap[deliveryStatus]}
            </TableListMealOrderChip>
            {original.licenseJustification && (
              <span
                className="tableListMealOrder-licenseBadge"
                title={getLicenseJustificationTitle(original)}
              >
                <span className="tableListMealOrder-chipText">Con permiso</span>
              </span>
            )}
          </div>
        );
      },
    }),
    columnHelper.display({
      id: 'action',
      header: () => (
        <div className="tableListMealOrder-headerLabel">
          <span>ACCION</span>
        </div>
      ),

      meta: {
        sticky: 'right',
        stickyOffset: 0,
      },
      cell: ({ row: { original } }) => {
        return renderPickupActions(original, 'table');
      },
    }),
  ];

  const filteredData = useMemo(() => {
    const searchValue = searchText.trim().toLowerCase();

    const users = (meal?.order?.users ?? [])
      .filter(user => {
        if (filters.orderStatus === 'Todos') {
          return true;
        }
        if (filters.orderStatus === 'Sin respuesta') {
          return typeof user.mealStatus !== 'boolean';
        }
        return user.mealStatus === (filters.orderStatus === 'Si');
      })
      .filter(user => {
        if (filters.pickupStatus === 'Todos') {
          return true;
        }
        if (filters.pickupStatus === 'No aplica') {
          return user.mealStatus !== true;
        }
        if (filters.pickupStatus === 'Pendiente retiro') {
          return user.deliveryStatus === DeliveryStatus.PENDING_PICKUP;
        }
        if (filters.pickupStatus === 'No servido') {
          return user.deliveryStatus === DeliveryStatus.NO_SERVICE;
        }
        if (filters.pickupStatus === 'Sin cierre') {
          return user.deliveryStatus === DeliveryStatus.MISSED_CLOSE;
        }
        if (filters.pickupStatus === 'Abierto') {
          return user.deliveryStatus === DeliveryStatus.OPEN;
        }

        const selectedPickupStatus = pickupStatusActionMap.find(
          action => action.label === filters.pickupStatus
        )?.status;

        return user.pickupStatus === selectedPickupStatus;
      })
      .filter(user => {
        if (!searchValue) return true;

        const fullName = getFullNameRevert(user).toLowerCase();
        const phone = user.profile.phone?.toLowerCase() || '';
        return fullName.includes(searchValue) || phone.includes(searchValue);
      });

    if (isLunch && filters.lunchMenuOrder === 'Segundo (A-Z)') {
      return users.sort((first, second) => {
        const firstSecond = lunchSecondNameByUserId.get(first.id) ?? 'Sin elección';
        const secondSecond = lunchSecondNameByUserId.get(second.id) ?? 'Sin elección';
        const bySecond = firstSecond.localeCompare(secondSecond, 'es');
        return bySecond || getFullNameRevert(first).localeCompare(getFullNameRevert(second), 'es');
      });
    }

    return users;
  }, [meal, filters.orderStatus, filters.pickupStatus, filters.lunchMenuOrder, searchText, isLunch, lunchSecondNameByUserId]);

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      columnVisibility: {
        action: showActionColumn,
      },
    },
  });

  if (!meal) {
    return <></>;
  }

  return (
    <div className="tableListMealOrder" ref={divRef}>
      <div className="tableListMealOrder-topbar">
        <h2 className="tableListMealOrder-title">{`${
          meal.type
        } ${convertTo12HourFormat(
          meal.hour || '00:00'
        )} - ${formatFullDayDateUtc(date)}`}</h2>

        {!isBeforeToday && (
          <button
            type="button"
            title={meal.order?.isClose ? 'Reabrir pedido' : 'Cerrar pedido'}
            aria-label={
              meal.order?.isClose ? 'Reabrir pedido' : 'Cerrar pedido'
            }
            disabled={isTogglingMealClose}
            // className={`tableListMealOrder-lockBtn ${
            //   meal.order?.isClose
            //     ? 'tableListMealOrder-lockBtn--closed'
            //     : 'tableListMealOrder-lockBtn--open'
            // }`}
            onClick={onToggleMealClose}
          >
            {meal.order?.isClose ? (
              <PiLockKeyFill size={21} color={COLOR_CSS.danger} />
            ) : (
              <PiLockKeyOpenFill size={21} color={COLOR_CSS.success} />
            )}
          </button>
        )}
      </div>
      {filteredData.length > 0 ? (
        <>
          <div className="tableListMealOrder-desktopOnly">
            <Table table={table}>
              <TableHead />
              <TableBody<UserMeal>
                rowBackgroundColor={row => {
                  if (
                    row.original.deliveryStatus === DeliveryStatus.PICKED_UP
                  ) {
                    return 'var(--color-bg-done)';
                  }
                  if (
                    row.original.deliveryStatus === DeliveryStatus.NOT_PICKED_UP
                  ) {
                    return 'var(--color-bg-unresolved)';
                  }
                  if (row.original.deliveryStatus === DeliveryStatus.RESERVED) {
                    return 'var(--color-bg-correction)';
                  }
                  if (
                    row.original.deliveryStatus === DeliveryStatus.NO_SERVICE ||
                    row.original.deliveryStatus ===
                      DeliveryStatus.MISSED_CLOSE ||
                    row.original.deliveryStatus === DeliveryStatus.OPEN
                  ) {
                    return 'var(--color-bg-correction)';
                  }
                  if (typeof row.original.mealStatus !== 'boolean') {
                    return 'var(--color-bg-correction)';
                  }
                  return row.original.mealStatus
                    ? 'var(--color-primarylight)'
                    : 'var(--color-bg-unresolved)';
                }}
              />
            </Table>
          </div>

          <div className="tableListMealOrder-mobileOnly">
            <div className="tableListMealOrder-mobileList">
              {filteredData.map((user, index) => {
                const deliveryStatus =
                  user.deliveryStatus || DeliveryStatus.NOT_APPLICABLE;
                const mealStatusChip = getMealStatusChipData(user.mealStatus);
                const lunchSelection = lunchSelectionByUserId.get(user.id);
                const selectedSecond = lunchMenuQuery.data?.seconds?.find(
                  second => second.id === lunchSelection?.lunchMenuSecondId
                );
                const canExpandLunchMenu = isLunch && user.mealStatus === true;
                const isLunchMenuExpanded = expandedLunchUserId === user.id;

                return (
                  <article
                    className={`tableListMealOrder-mobileItem ${getMobileDeliveryClass(
                      user
                    )}`}
                    key={user.id}
                  >
                    <div className="tableListMealOrder-mobileHeader">
                      <span className="tableListMealOrder-mobileNumber">
                        {index + 1}
                      </span>
                      <div className="tableListMealOrder-mobileNameBlock">
                        <button
                          type="button"
                          className="tableListMealOrder-mobileName"
                          disabled={!canExpandLunchMenu}
                          aria-expanded={
                            canExpandLunchMenu ? isLunchMenuExpanded : undefined
                          }
                          onClick={() =>
                            canExpandLunchMenu &&
                            setExpandedLunchUserId(current =>
                              current === user.id ? null : user.id
                            )
                          }
                        >
                          {getFullNameRevert(user)}
                        </button>
                        {canExpandLunchMenu && (
                          <button
                            type="button"
                            className="tableListMealOrder-mobileMenuToggle"
                            aria-expanded={isLunchMenuExpanded}
                            onClick={() =>
                              setExpandedLunchUserId(current =>
                                current === user.id ? null : user.id
                              )
                            }
                          >
                            {isLunchMenuExpanded ? 'Ocultar pedido' : 'Ver pedido'}
                          </button>
                        )}
                      </div>
                    </div>

                    {canExpandLunchMenu && isLunchMenuExpanded && (
                      <div className="tableListMealOrder-mobileLunchDetails">
                        {lunchSelection ? (
                          <>
                            <div>
                              <span>Segundo</span>
                              <strong>{selectedSecond?.name || 'No disponible'}</strong>
                            </div>
                            <div>
                              <span>Acompañamientos</span>
                              <strong>
                                {[lunchMenuQuery.data?.soupAvailable ? `${lunchMenuQuery.data.soupName || 'Sopa'}: ${lunchSelection.wantsSoup ? 'Sí' : 'No'}` : null, lunchMenuQuery.data?.dessertAvailable ? `${lunchMenuQuery.data.dessertName || 'Postre'}: ${lunchSelection.wantsDessert ? 'Sí' : 'No'}` : null, lunchMenuQuery.data?.refreshmentAvailable ? `${lunchMenuQuery.data.refreshmentName || 'Refresco'}: ${lunchSelection.wantsRefreshment ? 'Sí' : 'No'}` : null].filter(Boolean).join(' · ')}
                              </strong>
                            </div>
                          </>
                        ) : (
                          <p>Menú pendiente de selección.</p>
                        )}
                      </div>
                    )}

                    <div className="tableListMealOrder-mobileFooter">
                      <div className="tableListMealOrder-mobileMeta">
                        <TableListMealOrderChip
                          className={mealStatusChip.className}
                        >
                          {mealStatusChip.label}
                        </TableListMealOrderChip>
                        <TableListMealOrderChip
                          title={getLicenseJustificationTitle(user)}
                          className={
                            !user.mealStatus
                              ? 'tableListMealOrder-chip--na'
                              : getDeliveryStatusChipClass(deliveryStatus)
                          }
                        >
                          {!user.mealStatus
                            ? 'No aplica'
                            : deliveryStatusLabelMap[deliveryStatus]}
                        </TableListMealOrderChip>
                        {user.licenseJustification && (
                          <span
                            className="tableListMealOrder-licenseBadge"
                            title={getLicenseJustificationTitle(user)}
                          >
                            <span className="tableListMealOrder-chipText">
                              Con permiso
                            </span>
                          </span>
                        )}
                      </div>

                      {showActionColumn && (
                        <div className="tableListMealOrder-mobileActions">
                          {renderPickupActions(user, 'mobile')}
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        <TableNoData text="No hay resultados con los filtros actuales." />
      )}
    </div>
  );
};

export default TableListMealOrder;
