import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  CheckCircle2,
  FolderPlus,
  Link2Off,
  Search,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import Input from '@/components/Input/Input';
import LoaderForComponent from '@/components/loaderForComponent/LoaderForComponent';
import useRole from '@/hooks/useRole';
import {
  getMeetingUnitProjectFocus,
  getOfficeProjectModerators,
  getOfficeProjectCandidates,
  linkMeetingUnitProjectFocus,
  unlinkMeetingUnitProjectFocus,
  updateOfficeProjectModerator,
  updateMeetingUnitProjectFocus,
} from '../../services/officeMeetings.service';
import { getMeetingUnitsOverview } from '../../services/meetingUnitProjects.service';
import type { OfficeProjectCandidate } from '../../types/officeMeetings.types';
import type { MeetingProjectFocus } from '../../types/meetingUnitProjects.types';
import { OfficeUnitTreeSelect } from '../../components/OfficeUnitTreeSelect';
import './officeProjectsAdmin.css';

const getProjectLabel = (project?: OfficeProjectCandidate) =>
  project?.contract?.projectShortName ||
  project?.contract?.projectName ||
  project?.name ||
  'Proyecto sin nombre';

const OfficeProjectsAdmin = () => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [search, setSearch] = useState('');
  const { hasAccess: isModuleMod } = useRole('MOD', 'grupos');

  const overviewQuery = useQuery({
    queryKey: ['office-meetings', 'overview'],
    queryFn: getMeetingUnitsOverview,
  });

  const visibleUnits = overviewQuery.data?.data ?? [];

  useEffect(() => {
    const unitFromUrl = searchParams.get('unitId');
    if (
      unitFromUrl &&
      visibleUnits.some(unit => unit.id === unitFromUrl) &&
      selectedUnitId !== unitFromUrl
    ) {
      setSelectedUnitId(unitFromUrl);
      return;
    }
    if (!selectedUnitId && visibleUnits.length) {
      const fallbackUnitId = visibleUnits[0].id;
      setSelectedUnitId(fallbackUnitId);
      setSearchParams({ unitId: fallbackUnitId }, { replace: true });
    }
  }, [searchParams, selectedUnitId, setSearchParams, visibleUnits]);

  const selectedUnit = useMemo(
    () => visibleUnits.find(unit => unit.id === selectedUnitId),
    [selectedUnitId, visibleUnits]
  );

  const focusQuery = useQuery<MeetingProjectFocus[]>({
    queryKey: ['office-project-focus', selectedUnitId],
    queryFn: () => getMeetingUnitProjectFocus(selectedUnitId),
    enabled: !!selectedUnitId,
  });

  const candidatesQuery = useQuery({
    queryKey: ['office-project-candidates', search],
    queryFn: () => getOfficeProjectCandidates(search),
    enabled: !!selectedUnitId,
  });

  const moderatorsQuery = useQuery({
    queryKey: ['office-project-moderators', selectedUnitId],
    queryFn: () => getOfficeProjectModerators(selectedUnitId),
    enabled: !!selectedUnitId,
  });

  const invalidateFocus = () => {
    queryClient.invalidateQueries({ queryKey: ['office-project-focus'] });
    queryClient.invalidateQueries({ queryKey: ['office-meetings'] });
    queryClient.invalidateQueries({ queryKey: ['office-project-moderators'] });
  };

  const canManageSelectedUnit =
    isModuleMod || Boolean(moderatorsQuery.data?.canManageCurrentUnit);

  const linkMutation = useMutation({
    mutationFn: (projectId: number) =>
      linkMeetingUnitProjectFocus(selectedUnitId, {
        projectId,
        status: 'ACTIVE',
        isCurrent: true,
      }),
    onSuccess: invalidateFocus,
  });

  const updateMutation = useMutation({
    mutationFn: (focus: MeetingProjectFocus) =>
      updateMeetingUnitProjectFocus(selectedUnitId, focus.id!, {
        status: focus.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
        isCurrent: focus.status !== 'ACTIVE',
      }),
    onSuccess: invalidateFocus,
  });

  const unlinkMutation = useMutation({
    mutationFn: (focusId: string) =>
      unlinkMeetingUnitProjectFocus(selectedUnitId, focusId),
    onSuccess: invalidateFocus,
  });

  const moderatorMutation = useMutation({
    mutationFn: ({
      membershipId,
      canManageUnitProjects,
    }: {
      membershipId: string;
      canManageUnitProjects: boolean;
    }) =>
      updateOfficeProjectModerator(
        selectedUnitId,
        membershipId,
        canManageUnitProjects
      ),
    onSuccess: invalidateFocus,
  });

  const linkedProjectIds = new Set(
    (focusQuery.data ?? []).map(focus => focus.projectId)
  );

  if (overviewQuery.isLoading) return <LoaderForComponent />;

  return (
    <main className="opa-page">
      <header className="opa-header">
        <div>
          <p>Oficinas y Reuniones</p>
          <h1>Proyectos por oficina</h1>
          <span>
            Administra que proyectos se muestran como contexto de trabajo para
            cada oficina.
          </span>
        </div>
        <label>
          <Building2 size={16} />
          <OfficeUnitTreeSelect
            units={visibleUnits}
            value={selectedUnitId}
            onValueChange={value => {
              setSelectedUnitId(value);
              setSearchParams({ unitId: value });
            }}
            triggerClassName="flex min-w-64 items-center justify-between bg-white px-2 py-1 text-left text-sm font-semibold text-slate-800"
          />
        </label>
      </header>

      {!visibleUnits.length && (
        <section className="opa-emptyState">
          No tienes oficinas disponibles para este modulo.
        </section>
      )}

      {!!visibleUnits.length && (
        <section className="opa-layout">
          <article className="opa-panel">
            <div className="opa-panelHeader">
              <div>
                <h2>{selectedUnit?.name}</h2>
                <span>Proyectos enlazados a esta oficina</span>
              </div>
              <b>{focusQuery.data?.length ?? 0}</b>
            </div>

            {focusQuery.isLoading && <LoaderForComponent />}

            <div className="opa-focusList">
              {(focusQuery.data ?? []).map(focus => (
                <div
                  className="opa-focusCard"
                  key={focus.id ?? focus.projectId}
                >
                  <div className="opa-focusMain">
                    <strong>{focus.project.name}</strong>
                    <span>
                      {focus.project.contract.cui} /{' '}
                      {getProjectLabel(focus.project)}
                    </span>
                    <div className="opa-stageList">
                      {focus.project.stages.slice(0, 5).map(stage => (
                        <small key={stage.id}>
                          {stage.name}
                          {stage.status ? ' culminado' : ' en avance'}
                        </small>
                      ))}
                    </div>
                  </div>
                  <div className="opa-focusActions">
                    <span
                      className={`opa-status is-${focus.status.toLowerCase()}`}
                    >
                      {focus.status === 'ACTIVE' ? (
                        <CheckCircle2 size={15} />
                      ) : (
                        <XCircle size={15} />
                      )}
                      {focus.status}
                    </span>
                    {canManageSelectedUnit && focus.id && (
                      <>
                        <button
                          type="button"
                          onClick={() => updateMutation.mutate(focus)}
                          disabled={
                            updateMutation.isPending || unlinkMutation.isPending
                          }
                        >
                          {focus.status === 'ACTIVE'
                            ? 'Marcar inactivo'
                            : 'Marcar activo'}
                        </button>
                        <button
                          type="button"
                          className="opa-unlinkButton"
                          onClick={() => unlinkMutation.mutate(focus.id!)}
                          disabled={
                            updateMutation.isPending || unlinkMutation.isPending
                          }
                        >
                          <Link2Off size={15} />
                          Desenlazar
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {!focusQuery.isLoading && !focusQuery.data?.length && (
              <p className="opa-emptyState">
                Aun no hay proyectos enlazados para esta oficina.
              </p>
            )}
          </article>

          {canManageSelectedUnit && (
            <aside className="opa-panel opa-searchPanel">
              <div className="opa-panelHeader">
                <div>
                  <h2>Enlazar proyecto</h2>
                  <span>Busca por CUI, nombre corto, proyecto o etapa.</span>
                </div>
                <FolderPlus size={19} />
              </div>

              <label className="opa-search">
                <Search size={15} />
                <Input
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  placeholder="Buscar proyecto o etapa"
                />
              </label>

              <div className="opa-candidateList">
                {(candidatesQuery.data ?? []).map(project => {
                  const linked = linkedProjectIds.has(project.id);
                  const linkedToOtherUnit =
                    Boolean(project.linkedUnitFocus) &&
                    project.linkedUnitFocus?.unitId !== selectedUnitId;
                  const linkedUnitName = project.linkedUnitFocus?.unit.name;
                  return (
                    <div
                      className={`opa-candidate ${
                        linkedToOtherUnit ? 'is-linked-elsewhere' : ''
                      }`}
                      key={project.id}
                    >
                      <div>
                        <strong>{project.name}</strong>
                        <span>
                          {project.contract.cui} / {getProjectLabel(project)}
                        </span>
                        {linkedToOtherUnit && (
                          <p className="opa-linkedOffice">
                            Ya esta enlazado a {linkedUnitName}
                          </p>
                        )}
                        <div className="opa-stageList">
                          {project.stages.map(stage => (
                            <small key={stage.id}>{stage.name}</small>
                          ))}
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={
                          linked || linkedToOtherUnit || linkMutation.isPending
                        }
                        onClick={() => linkMutation.mutate(project.id)}
                      >
                        {linked
                          ? 'Enlazado'
                          : linkedToOtherUnit
                          ? 'En otra oficina'
                          : 'Enlazar'}
                      </button>
                    </div>
                  );
                })}
              </div>

              {isModuleMod && (
                <div className="opa-moderators">
                  <div className="opa-moderatorsHeader">
                    <ShieldCheck size={16} />
                    <div>
                      <h3>MOD de oficina</h3>
                      <span>
                        Permite administrar proyectos y miembros solo en esta
                        oficina.
                      </span>
                    </div>
                  </div>
                  <div className="opa-moderatorList">
                    {(moderatorsQuery.data?.memberships ?? []).map(
                      membership => {
                        const profile = membership.user.profile;
                        const name = `${profile?.firstName ?? ''} ${
                          profile?.lastName ?? ''
                        }`.trim();
                        return (
                          <label className="opa-moderator" key={membership.id}>
                            <span>
                              <strong>{name || membership.user.email}</strong>
                              <small>{membership.role}</small>
                            </span>
                            <input
                              type="checkbox"
                              checked={membership.canManageUnitProjects}
                              disabled={moderatorMutation.isPending}
                              onChange={event =>
                                moderatorMutation.mutate({
                                  membershipId: membership.id,
                                  canManageUnitProjects: event.target.checked,
                                })
                              }
                            />
                          </label>
                        );
                      }
                    )}
                  </div>
                  {!moderatorsQuery.data?.memberships?.length && (
                    <p className="opa-emptyState is-compact">
                      Esta oficina no tiene miembros activos.
                    </p>
                  )}
                </div>
              )}
            </aside>
          )}
        </section>
      )}
    </main>
  );
};

export default OfficeProjectsAdmin;
