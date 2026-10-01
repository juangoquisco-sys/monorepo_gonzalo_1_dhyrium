import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store/store.types';
import { AppButton } from '@/components/app-ui/app-button';
import { AppInput } from '@/components/app-ui/app-input';
import { AppPageShell } from '@/components/app-ui/app-page-shell';
import { AppSelect } from '@/components/app-ui/app-select';
import {
  AppTable,
  AppTableBody,
  AppTableCell,
  AppTableHead,
  AppTableHeader,
  AppTableRow,
} from '@/components/app-ui/app-table';
import { Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { hasPermission } from '@/utils/permissionAccess';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import { productivityRankingsService } from './productivityRankings.service';
import type {
  NonTaskActivity,
  RankingConfig,
  RankingEntry,
  RankingOfficeEntry,
  RankingPeriod,
} from './types';

const formatUser = (entry: RankingEntry) =>
  entry.user?.profile
    ? `${entry.user.profile.firstName} ${entry.user.profile.lastName}`.trim()
    : `Usuario #${entry.userId}`;

const formatDate = (value: string | null) =>
  value
    ? new Date(value).toLocaleDateString('es-PE', { timeZone: 'UTC' })
    : '—';

const formatPeriodLabel = (period: RankingPeriod) => {
  const label = new Date(period.periodStart).toLocaleDateString('es-PE', {
    timeZone: 'UTC',
    month: 'long',
    year: 'numeric',
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
};

const csvToNumbers = (value: string): number[] =>
  value
    .split(',')
    .map(part => part.trim())
    .filter(Boolean)
    .map(Number)
    .filter(n => Number.isFinite(n));

const csvToStrings = (value: string): string[] =>
  value
    .split(',')
    .map(part => part.trim())
    .filter(Boolean);

const ProductivityRankings = () => {
  const { role } = useSelector((state: RootState) => state.userSession);

  const isModerator = useMemo(
    () =>
      hasPermission(role?.menuPoints, {
        menu: 'control-asistencia',
        subMenu: 'rankings-productividad',
        roles: ['MOD'],
      }),
    [role]
  );

  const [activeTab, setActiveTab] = useState<'mine' | 'admin'>('mine');

  // --- Mi ranking -----------------------------------------------------
  const [myPeriod, setMyPeriod] = useState<RankingPeriod | null>(null);
  const [myEntry, setMyEntry] = useState<RankingEntry | null>(null);
  const [topEntries, setTopEntries] = useState<RankingEntry[]>([]);
  const [officeTop, setOfficeTop] = useState<RankingOfficeEntry[]>([]);
  const [myActivities, setMyActivities] = useState<NonTaskActivity[]>([]);
  const [loadingMine, setLoadingMine] = useState(true);
  const [availablePeriods, setAvailablePeriods] = useState<RankingPeriod[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);

  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  const [activityType, setActivityType] = useState('');
  const [activityDescription, setActivityDescription] = useState('');
  const [activityDays, setActivityDays] = useState('');
  const [activityDate, setActivityDate] = useState('');
  const [submittingActivity, setSubmittingActivity] = useState(false);

  // --- Detalle de puntaje (dialogo, reutilizado desde "Mi ranking" y "Administracion") ---
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailEntry, setDetailEntry] = useState<RankingEntry | null>(null);
  const [detailUserLabel, setDetailUserLabel] = useState('');

  const openDetail = async (userId: number, userLabel: string, periodId?: string) => {
    setDetailDialogOpen(true);
    setDetailLoading(true);
    setDetailEntry(null);
    setDetailUserLabel(userLabel);
    try {
      const result = await productivityRankingsService.getEntry(userId, periodId);
      setDetailEntry(result.entry);
    } catch {
      SnackbarUtilities.error('No se pudo cargar el detalle de este usuario.');
      setDetailDialogOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const loadMine = useCallback(async (periodId?: string) => {
    setLoadingMine(true);
    try {
      const [me, top, offices, activities, periodsList] = await Promise.all([
        productivityRankingsService.getMe(periodId),
        productivityRankingsService.getTop(periodId),
        productivityRankingsService.getOfficeTop(periodId),
        productivityRankingsService.listMyNonTaskActivities(),
        productivityRankingsService.listPeriods(),
      ]);
      setMyPeriod(me.period);
      setMyEntry(me.entry);
      setAvailablePeriods(periodsList.filter(p => p.status === 'CLOSED'));
      if (!periodId) setSelectedPeriodId(me.period?.id ?? null);
      setTopEntries(top.entries);
      setOfficeTop(offices.entries);
      setMyActivities(activities);
    } catch {
      SnackbarUtilities.error('No se pudo cargar el ranking de productividad.');
    } finally {
      setLoadingMine(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial remote data load owns this screen state.
    void loadMine();
  }, [loadMine]);

  const changePeriod = (periodId: string) => {
    setSelectedPeriodId(periodId);
    void loadMine(periodId);
  };

  const submitActivity = async () => {
    const proposedDays = Number(activityDays);
    if (!activityType.trim() || !activityDate || !Number.isFinite(proposedDays) || proposedDays <= 0) {
      SnackbarUtilities.warning('Completa tipo, fecha y dias propuestos (mayor a 0).');
      return;
    }
    setSubmittingActivity(true);
    try {
      await productivityRankingsService.createNonTaskActivity({
        type: activityType.trim(),
        description: activityDescription.trim() || undefined,
        proposedDays,
        periodDate: new Date(activityDate).toISOString(),
      });
      SnackbarUtilities.success('Actividad registrada, queda pendiente de revision.');
      setActivityType('');
      setActivityDescription('');
      setActivityDays('');
      setActivityDate('');
      setActivityDialogOpen(false);
      await loadMine();
    } catch {
      SnackbarUtilities.error('No se pudo registrar la actividad.');
    } finally {
      setSubmittingActivity(false);
    }
  };

  // --- Administracion ---------------------------------------------------
  const [config, setConfig] = useState<RankingConfig | null>(null);
  const [periods, setPeriods] = useState<RankingPeriod[]>([]);
  const [pendingActivities, setPendingActivities] = useState<NonTaskActivity[]>([]);
  const [loadingAdmin, setLoadingAdmin] = useState(false);

  const [topNInput, setTopNInput] = useState('5');
  const [minDaysInput, setMinDaysInput] = useState('0');
  const [excludedRolesInput, setExcludedRolesInput] = useState('');
  const [excludedUsersInput, setExcludedUsersInput] = useState('');
  const [eligibleUnitsInput, setEligibleUnitsInput] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);

  const [newPeriodStart, setNewPeriodStart] = useState('');
  const [newPeriodEnd, setNewPeriodEnd] = useState('');
  const [creatingPeriod, setCreatingPeriod] = useState(false);
  const [closingPeriodId, setClosingPeriodId] = useState<string | null>(null);
  const [reviewingActivityId, setReviewingActivityId] = useState<string | null>(null);
  const [approvedDaysDrafts, setApprovedDaysDrafts] = useState<Record<string, string>>(
    {}
  );
  const [allEntries, setAllEntries] = useState<RankingEntry[]>([]);
  const [allEntriesPeriodId, setAllEntriesPeriodId] = useState<string | null>(null);
  const [loadingAllEntries, setLoadingAllEntries] = useState(false);

  const loadAllEntries = useCallback(async (periodId?: string) => {
    setLoadingAllEntries(true);
    try {
      const result = await productivityRankingsService.listAllEntries(periodId);
      setAllEntries(result.entries);
      setAllEntriesPeriodId(result.period?.id ?? null);
    } catch {
      SnackbarUtilities.error('No se pudo cargar el detalle de todo el personal.');
    } finally {
      setLoadingAllEntries(false);
    }
  }, []);

  const loadAdmin = useCallback(async () => {
    setLoadingAdmin(true);
    try {
      const [cfg, periodsList, pending] = await Promise.all([
        productivityRankingsService.getConfig(),
        productivityRankingsService.listPeriods(),
        productivityRankingsService.listPendingNonTaskActivities(),
      ]);
      setConfig(cfg);
      setTopNInput(String(cfg.topN));
      setMinDaysInput(String(cfg.minWeightDaysToQualify));
      setExcludedRolesInput(cfg.excludedRoleIds.join(', '));
      setExcludedUsersInput(cfg.excludedUserIds.join(', '));
      setEligibleUnitsInput(cfg.rankingEligibleUnitIds.join(', '));
      setPeriods(periodsList);
      setPendingActivities(pending);
      setApprovedDaysDrafts(current => {
        const next = { ...current };
        pending.forEach(activity => {
          if (!(activity.id in next)) {
            next[activity.id] = String(activity.proposedDays);
          }
        });
        return next;
      });
    } catch {
      SnackbarUtilities.error('No se pudo cargar la administracion de rankings.');
    } finally {
      setLoadingAdmin(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'admin' && isModerator) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- tab-scoped remote data load, refreshed on every visit so pending reviews stay current.
      void loadAdmin();
      void loadAllEntries();
    }
  }, [activeTab, isModerator, loadAdmin, loadAllEntries]);

  const saveConfig = async () => {
    setSavingConfig(true);
    try {
      const updated = await productivityRankingsService.updateConfig({
        topN: Number(topNInput) || undefined,
        minWeightDaysToQualify: Number(minDaysInput),
        excludedRoleIds: csvToNumbers(excludedRolesInput),
        excludedUserIds: csvToNumbers(excludedUsersInput),
        rankingEligibleUnitIds: csvToStrings(eligibleUnitsInput),
      });
      setConfig(updated);
      SnackbarUtilities.success('Configuracion guardada.');
    } catch {
      SnackbarUtilities.error('No se pudo guardar la configuracion.');
    } finally {
      setSavingConfig(false);
    }
  };

  const createPeriod = async () => {
    if (!newPeriodStart || !newPeriodEnd) {
      SnackbarUtilities.warning('Indica el inicio y el fin del periodo.');
      return;
    }
    setCreatingPeriod(true);
    try {
      await productivityRankingsService.createPeriod(
        new Date(newPeriodStart).toISOString(),
        new Date(newPeriodEnd).toISOString()
      );
      SnackbarUtilities.success('Periodo creado.');
      setNewPeriodStart('');
      setNewPeriodEnd('');
      await loadAdmin();
    } catch {
      SnackbarUtilities.error(
        'No se pudo crear el periodo (verifica que no se superponga con otro).'
      );
    } finally {
      setCreatingPeriod(false);
    }
  };

  const closePeriod = async (periodId: string) => {
    setClosingPeriodId(periodId);
    try {
      await productivityRankingsService.closePeriod(periodId);
      SnackbarUtilities.success('Periodo cerrado. El ranking ya es inmutable.');
      await loadAdmin();
      await loadMine();
    } catch {
      SnackbarUtilities.error('No se pudo cerrar el periodo.');
    } finally {
      setClosingPeriodId(null);
    }
  };

  const reviewActivity = async (
    activityId: string,
    status: 'APPROVED' | 'REJECTED',
    approvedDaysDraft?: string
  ) => {
    let approvedDays: number | undefined;
    if (status === 'APPROVED') {
      const parsed = Number(approvedDaysDraft);
      if (!approvedDaysDraft || !Number.isFinite(parsed) || parsed <= 0) {
        SnackbarUtilities.warning('Ingresa un numero de dias valido para aprobar.');
        return;
      }
      approvedDays = parsed;
    }
    setReviewingActivityId(activityId);
    try {
      await productivityRankingsService.reviewNonTaskActivity(activityId, {
        status,
        approvedDays,
      });
      SnackbarUtilities.success(
        status === 'APPROVED' ? 'Actividad aprobada.' : 'Actividad rechazada.'
      );
      await loadAdmin();
    } catch {
      SnackbarUtilities.error('No se pudo revisar la actividad.');
    } finally {
      setReviewingActivityId(null);
    }
  };

  return (
    <AppPageShell className="flex h-full min-h-[32rem] flex-col overflow-hidden bg-background">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border bg-background px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-primary">PRODUCTIVIDAD</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">
            Ranking de productividad
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Puntaje mensual segun peso en dias de tus tareas aprobadas y el
            porcentaje aprobado tras revision.
          </p>
        </div>
        <Tabs value={activeTab} onValueChange={value => setActiveTab(value as 'mine' | 'admin')}>
          <TabsList>
            <TabsTrigger value="mine">Mi ranking</TabsTrigger>
            {isModerator && <TabsTrigger value="admin">Administracion</TabsTrigger>}
          </TabsList>
        </Tabs>
      </header>

      <div className="flex-1 overflow-auto p-4 sm:p-6">
        <Tabs value={activeTab} onValueChange={value => setActiveTab(value as 'mine' | 'admin')}>
          <TabsContent value="mine" className="flex flex-col gap-4">
            {loadingMine ? (
              <div className="grid place-items-center p-6 text-sm text-muted-foreground">
                Cargando…
              </div>
            ) : !myPeriod ? (
              <Card>
                <CardContent className="p-6 text-sm text-muted-foreground">
                  Todavia no hay un periodo de ranking cerrado.
                </CardContent>
              </Card>
            ) : (
              <>
                {availablePeriods.length > 1 && (
                  <div className="flex justify-end">
                    <AppSelect
                      containerClassName="w-56"
                      data={availablePeriods}
                      extractValue={p => p.id}
                      renderTextField={formatPeriodLabel}
                      value={selectedPeriodId ?? ''}
                      onChange={event => changePeriod(event.target.value)}
                    />
                  </div>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>
                        Mi posicion — {formatDate(myPeriod.periodStart)} a{' '}
                        {formatDate(myPeriod.periodEnd)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {!myEntry ? (
                        <p className="text-sm text-muted-foreground">
                          No tienes puntaje registrado en este periodo.
                        </p>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold">
                              {myEntry.qualified ? `#${myEntry.position}` : '—'}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              puntaje {myEntry.score.toFixed(2)}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {myEntry.totalWeightDays.toFixed(2)} dias de peso ·{' '}
                            {myEntry.avgApprovalPct.toFixed(1)}% aprobado promedio
                          </p>
                          {!myEntry.qualified && (
                            <Badge variant="secondary">No alcanza el piso minimo</Badge>
                          )}
                          {!!myEntry.lines?.length && (
                            <AppTable>
                              <AppTableHeader>
                                <AppTableRow>
                                  <AppTableHead>Origen</AppTableHead>
                                  <AppTableHead>Dias</AppTableHead>
                                  <AppTableHead>%Aprob.</AppTableHead>
                                  <AppTableHead>Aporte</AppTableHead>
                                </AppTableRow>
                              </AppTableHeader>
                              <AppTableBody>
                                {myEntry.lines.map(line => (
                                  <AppTableRow key={line.id}>
                                    <AppTableCell>{line.sourceLabel}</AppTableCell>
                                    <AppTableCell>{line.weightDays}</AppTableCell>
                                    <AppTableCell>{line.approvalPct}%</AppTableCell>
                                    <AppTableCell>{line.contribution.toFixed(2)}</AppTableCell>
                                  </AppTableRow>
                                ))}
                              </AppTableBody>
                            </AppTable>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Top oficinas</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {!officeTop.length ? (
                        <p className="text-sm text-muted-foreground">
                          No hay ranking por oficina configurado.
                        </p>
                      ) : (
                        <AppTable>
                          <AppTableHeader>
                            <AppTableRow>
                              <AppTableHead>#</AppTableHead>
                              <AppTableHead>Oficina</AppTableHead>
                              <AppTableHead>Puntaje/miembro</AppTableHead>
                            </AppTableRow>
                          </AppTableHeader>
                          <AppTableBody>
                            {officeTop.map(office => (
                              <AppTableRow key={office.id}>
                                <AppTableCell>{office.position}</AppTableCell>
                                <AppTableCell>{office.unitId}</AppTableCell>
                                <AppTableCell>{office.scorePerMember.toFixed(2)}</AppTableCell>
                              </AppTableRow>
                            ))}
                          </AppTableBody>
                        </AppTable>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Top 5</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <AppTable>
                      <AppTableHeader>
                        <AppTableRow>
                          <AppTableHead>#</AppTableHead>
                          <AppTableHead>Usuario</AppTableHead>
                          <AppTableHead>Puntaje</AppTableHead>
                          <AppTableHead />
                        </AppTableRow>
                      </AppTableHeader>
                      <AppTableBody>
                        {topEntries.map(entry => (
                          <AppTableRow key={entry.id}>
                            <AppTableCell>{entry.position}</AppTableCell>
                            <AppTableCell>{formatUser(entry)}</AppTableCell>
                            <AppTableCell>{entry.score.toFixed(2)}</AppTableCell>
                            <AppTableCell>
                              <AppButton
                                variant="outline"
                                onClick={() =>
                                  void openDetail(
                                    entry.userId,
                                    formatUser(entry),
                                    selectedPeriodId ?? undefined
                                  )
                                }
                              >
                                Ver detalle
                              </AppButton>
                            </AppTableCell>
                          </AppTableRow>
                        ))}
                      </AppTableBody>
                    </AppTable>
                  </CardContent>
                </Card>
              </>
            )}

            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle>Actividades administrativas</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Viajes, levantamiento de campo u otras actividades obligatorias
                    sin peso en dias asignado a una tarea.
                  </p>
                </div>
                <AppButton
                  variant="outline"
                  className="shrink-0 gap-1.5"
                  onClick={() => setActivityDialogOpen(true)}
                >
                  <Plus aria-hidden="true" className="size-4" />
                  Registrar actividad
                </AppButton>
              </CardHeader>
              {!!myActivities.length && (
                <CardContent>
                  <AppTable>
                    <AppTableHeader>
                      <AppTableRow>
                        <AppTableHead>Tipo</AppTableHead>
                        <AppTableHead>Fecha</AppTableHead>
                        <AppTableHead>Dias propuestos</AppTableHead>
                        <AppTableHead>Dias aprobados</AppTableHead>
                        <AppTableHead>Estado</AppTableHead>
                      </AppTableRow>
                    </AppTableHeader>
                    <AppTableBody>
                      {myActivities.map(activity => (
                        <AppTableRow key={activity.id}>
                          <AppTableCell>{activity.type}</AppTableCell>
                          <AppTableCell>{formatDate(activity.periodDate)}</AppTableCell>
                          <AppTableCell>{activity.proposedDays}</AppTableCell>
                          <AppTableCell>{activity.approvedDays ?? '—'}</AppTableCell>
                          <AppTableCell>
                            <Badge
                              variant={
                                activity.status === 'APPROVED'
                                  ? 'default'
                                  : activity.status === 'REJECTED'
                                    ? 'danger'
                                    : 'secondary'
                              }
                            >
                              {activity.status}
                            </Badge>
                          </AppTableCell>
                        </AppTableRow>
                      ))}
                    </AppTableBody>
                  </AppTable>
                </CardContent>
              )}
            </Card>

            <Dialog open={activityDialogOpen} onOpenChange={setActivityDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Registrar actividad administrativa</DialogTitle>
                  <DialogDescription>
                    Un revisor debe aprobar la actividad y confirmar los dias antes
                    de que sumen al ranking.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-3">
                  <AppInput
                    label="Tipo de actividad"
                    placeholder="Levantamiento de campo"
                    value={activityType}
                    onChange={event => setActivityType(event.target.value)}
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <AppInput
                      label="Fecha"
                      type="date"
                      value={activityDate}
                      onChange={event => setActivityDate(event.target.value)}
                    />
                    <AppInput
                      label="Dias propuestos"
                      type="number"
                      min="0"
                      step="0.5"
                      value={activityDays}
                      onChange={event => setActivityDays(event.target.value)}
                    />
                  </div>
                  <Textarea
                    placeholder="Descripcion (opcional)"
                    value={activityDescription}
                    onChange={event => setActivityDescription(event.target.value)}
                  />
                </div>
                <DialogFooter>
                  <AppButton
                    variant="outline"
                    onClick={() => setActivityDialogOpen(false)}
                    disabled={submittingActivity}
                  >
                    Cancelar
                  </AppButton>
                  <AppButton
                    onClick={() => void submitActivity()}
                    disabled={submittingActivity}
                  >
                    {submittingActivity ? 'Enviando…' : 'Registrar actividad'}
                  </AppButton>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {isModerator && (
            <TabsContent value="admin" className="flex flex-col gap-4">
              {loadingAdmin || !config ? (
                <div className="grid place-items-center p-6 text-sm text-muted-foreground">
                  Cargando…
                </div>
              ) : (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle>Configuracion</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <AppInput
                          label="Top N"
                          type="number"
                          min="1"
                          value={topNInput}
                          onChange={event => setTopNInput(event.target.value)}
                        />
                        <AppInput
                          label="Piso minimo de dias para calificar"
                          type="number"
                          min="0"
                          step="0.5"
                          value={minDaysInput}
                          onChange={event => setMinDaysInput(event.target.value)}
                        />
                      </div>
                      <AppInput
                        label="IDs de roles excluidos (separados por coma)"
                        value={excludedRolesInput}
                        onChange={event => setExcludedRolesInput(event.target.value)}
                      />
                      <AppInput
                        label="IDs de usuarios excluidos (separados por coma)"
                        value={excludedUsersInput}
                        onChange={event => setExcludedUsersInput(event.target.value)}
                      />
                      <AppInput
                        label="IDs de oficinas elegibles para ranking por oficina (separados por coma)"
                        value={eligibleUnitsInput}
                        onChange={event => setEligibleUnitsInput(event.target.value)}
                        helperText="Copia los UUID de las oficinas desde Centro de usuarios > Organigrama."
                      />
                      <div>
                        <AppButton onClick={() => void saveConfig()} disabled={savingConfig}>
                          {savingConfig ? 'Guardando…' : 'Guardar configuracion'}
                        </AppButton>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Periodos</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3">
                      <div className="grid gap-3 sm:grid-cols-3 sm:items-end">
                        <AppInput
                          label="Inicio"
                          type="date"
                          value={newPeriodStart}
                          onChange={event => setNewPeriodStart(event.target.value)}
                        />
                        <AppInput
                          label="Fin"
                          type="date"
                          value={newPeriodEnd}
                          onChange={event => setNewPeriodEnd(event.target.value)}
                        />
                        <AppButton onClick={() => void createPeriod()} disabled={creatingPeriod}>
                          {creatingPeriod ? 'Creando…' : 'Crear periodo'}
                        </AppButton>
                      </div>
                      <AppTable>
                        <AppTableHeader>
                          <AppTableRow>
                            <AppTableHead>Rango</AppTableHead>
                            <AppTableHead>Estado</AppTableHead>
                            <AppTableHead>Cerrado</AppTableHead>
                            <AppTableHead />
                          </AppTableRow>
                        </AppTableHeader>
                        <AppTableBody>
                          {periods.map(period => (
                            <AppTableRow key={period.id}>
                              <AppTableCell>
                                {formatDate(period.periodStart)} — {formatDate(period.periodEnd)}
                              </AppTableCell>
                              <AppTableCell>
                                <Badge
                                  variant={period.status === 'CLOSED' ? 'secondary' : 'default'}
                                >
                                  {period.status}
                                </Badge>
                              </AppTableCell>
                              <AppTableCell>{formatDate(period.closedAt)}</AppTableCell>
                              <AppTableCell>
                                {period.status === 'OPEN' && (
                                  <AppButton
                                    variant="outline"
                                    onClick={() => void closePeriod(period.id)}
                                    disabled={closingPeriodId === period.id}
                                  >
                                    {closingPeriodId === period.id
                                      ? 'Cerrando…'
                                      : 'Cerrar periodo'}
                                  </AppButton>
                                )}
                              </AppTableCell>
                            </AppTableRow>
                          ))}
                        </AppTableBody>
                      </AppTable>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-4">
                      <CardTitle>Personal — detalle por persona</CardTitle>
                      {periods.filter(p => p.status === 'CLOSED').length > 1 && (
                        <AppSelect
                          containerClassName="w-56"
                          data={periods.filter(p => p.status === 'CLOSED')}
                          extractValue={p => p.id}
                          renderTextField={formatPeriodLabel}
                          value={allEntriesPeriodId ?? ''}
                          onChange={event => void loadAllEntries(event.target.value)}
                        />
                      )}
                    </CardHeader>
                    <CardContent>
                      {loadingAllEntries ? (
                        <p className="text-sm text-muted-foreground">Cargando…</p>
                      ) : !allEntries.length ? (
                        <p className="text-sm text-muted-foreground">
                          No hay datos de personal para este periodo.
                        </p>
                      ) : (
                        <AppTable>
                          <AppTableHeader>
                            <AppTableRow>
                              <AppTableHead>#</AppTableHead>
                              <AppTableHead>Usuario</AppTableHead>
                              <AppTableHead>Puntaje</AppTableHead>
                              <AppTableHead>Dias de peso</AppTableHead>
                              <AppTableHead>%Aprob. promedio</AppTableHead>
                              <AppTableHead>Estado</AppTableHead>
                              <AppTableHead />
                            </AppTableRow>
                          </AppTableHeader>
                          <AppTableBody>
                            {allEntries.map(entry => (
                              <AppTableRow key={entry.id}>
                                <AppTableCell>{entry.qualified ? entry.position : '—'}</AppTableCell>
                                <AppTableCell>{formatUser(entry)}</AppTableCell>
                                <AppTableCell>{entry.score.toFixed(2)}</AppTableCell>
                                <AppTableCell>{entry.totalWeightDays.toFixed(2)}</AppTableCell>
                                <AppTableCell>{entry.avgApprovalPct.toFixed(1)}%</AppTableCell>
                                <AppTableCell>
                                  {!entry.qualified && (
                                    <Badge variant="secondary">No califica</Badge>
                                  )}
                                </AppTableCell>
                                <AppTableCell>
                                  <AppButton
                                    variant="outline"
                                    onClick={() =>
                                      void openDetail(
                                        entry.userId,
                                        formatUser(entry),
                                        allEntriesPeriodId ?? undefined
                                      )
                                    }
                                  >
                                    Ver detalle
                                  </AppButton>
                                </AppTableCell>
                              </AppTableRow>
                            ))}
                          </AppTableBody>
                        </AppTable>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Actividades pendientes de revision</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {!pendingActivities.length ? (
                        <p className="text-sm text-muted-foreground">
                          No hay actividades pendientes.
                        </p>
                      ) : (
                        <AppTable>
                          <AppTableHeader>
                            <AppTableRow>
                              <AppTableHead>Usuario</AppTableHead>
                              <AppTableHead>Tipo</AppTableHead>
                              <AppTableHead>Fecha</AppTableHead>
                              <AppTableHead>Dias propuestos</AppTableHead>
                              <AppTableHead>Dias a aprobar</AppTableHead>
                              <AppTableHead />
                            </AppTableRow>
                          </AppTableHeader>
                          <AppTableBody>
                            {pendingActivities.map(activity => (
                              <AppTableRow key={activity.id}>
                                <AppTableCell>
                                  {activity.user?.profile
                                    ? `${activity.user.profile.firstName} ${activity.user.profile.lastName}`.trim()
                                    : `Usuario #${activity.userId}`}
                                </AppTableCell>
                                <AppTableCell>{activity.type}</AppTableCell>
                                <AppTableCell>{formatDate(activity.periodDate)}</AppTableCell>
                                <AppTableCell>{activity.proposedDays}</AppTableCell>
                                <AppTableCell>
                                  <AppInput
                                    type="number"
                                    min="0"
                                    step="0.5"
                                    className="w-24"
                                    value={approvedDaysDrafts[activity.id] ?? ''}
                                    onChange={event =>
                                      setApprovedDaysDrafts(current => ({
                                        ...current,
                                        [activity.id]: event.target.value,
                                      }))
                                    }
                                  />
                                </AppTableCell>
                                <AppTableCell className="flex gap-2">
                                  <AppButton
                                    variant="outline"
                                    disabled={reviewingActivityId === activity.id}
                                    onClick={() =>
                                      void reviewActivity(
                                        activity.id,
                                        'APPROVED',
                                        approvedDaysDrafts[activity.id]
                                      )
                                    }
                                  >
                                    Aprobar
                                  </AppButton>
                                  <AppButton
                                    variant="danger"
                                    disabled={reviewingActivityId === activity.id}
                                    onClick={() => void reviewActivity(activity.id, 'REJECTED')}
                                  >
                                    Rechazar
                                  </AppButton>
                                </AppTableCell>
                              </AppTableRow>
                            ))}
                          </AppTableBody>
                        </AppTable>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>
          )}
        </Tabs>

        <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detalle de puntaje — {detailUserLabel}</DialogTitle>
              <DialogDescription>
                Tareas y actividades que componen el puntaje de este periodo.
              </DialogDescription>
            </DialogHeader>
            {detailLoading ? (
              <p className="text-sm text-muted-foreground">Cargando…</p>
            ) : !detailEntry ? (
              <p className="text-sm text-muted-foreground">
                No hay puntaje registrado para este usuario en el periodo.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-muted-foreground">
                  {detailEntry.totalWeightDays.toFixed(2)} dias de peso ·{' '}
                  {detailEntry.avgApprovalPct.toFixed(1)}% aprobado promedio ·{' '}
                  {detailEntry.qualified ? `posicion #${detailEntry.position}` : 'no califica'}
                </p>
                <AppTable>
                  <AppTableHeader>
                    <AppTableRow>
                      <AppTableHead>Origen</AppTableHead>
                      <AppTableHead>Dias</AppTableHead>
                      <AppTableHead>%Aprob.</AppTableHead>
                      <AppTableHead>Aporte</AppTableHead>
                    </AppTableRow>
                  </AppTableHeader>
                  <AppTableBody>
                    {(detailEntry.lines ?? []).map(line => (
                      <AppTableRow key={line.id}>
                        <AppTableCell>{line.sourceLabel}</AppTableCell>
                        <AppTableCell>{line.weightDays}</AppTableCell>
                        <AppTableCell>{line.approvalPct}%</AppTableCell>
                        <AppTableCell>{line.contribution.toFixed(2)}</AppTableCell>
                      </AppTableRow>
                    ))}
                  </AppTableBody>
                </AppTable>
                <div className="flex justify-end gap-2 border-t border-border pt-2 text-sm font-semibold">
                  <span>Puntaje total</span>
                  <span>{detailEntry.score.toFixed(2)}</span>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppPageShell>
  );
};

export default ProductivityRankings;
