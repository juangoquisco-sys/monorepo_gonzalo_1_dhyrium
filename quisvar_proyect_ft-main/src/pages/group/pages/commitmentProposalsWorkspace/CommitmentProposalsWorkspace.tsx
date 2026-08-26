import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Link2, Send, XCircle } from 'lucide-react';
import Button from '@/components/button/Button';
import LoaderForComponent from '@/components/loaderForComponent/LoaderForComponent';
import useRole from '@/hooks/useRole';
import {
  attachCommitmentToMeeting,
  confirmCommitment,
  createCommitmentProposal,
  getCommitments,
  getMeetingUnitDashboard,
  getMeetingUnitProjectFocus,
  getOfficeProjectModerators,
} from '../../services/officeMeetings.service';
import { getMeetingUnitsOverview } from '../../services/meetingUnitProjects.service';
import type { Commitment } from '../../types/officeMeetings.types';
import { OfficeUnitTreeSelect } from '../../components/OfficeUnitTreeSelect';
import './commitmentProposalsWorkspace.css';

const getDueDate = (preset: 'TODAY' | 'TOMORROW' | 'WEEK' | 'FREE') => {
  if (preset === 'FREE') return null;
  const date = new Date();
  if (preset === 'TOMORROW') date.setDate(date.getDate() + 1);
  if (preset === 'WEEK') date.setDate(date.getDate() + 7);
  return date.toISOString();
};

export const CommitmentProposalsWorkspace = () => {
  const queryClient = useQueryClient();
  const { hasAccess: isModuleMod } = useRole('MOD', 'grupos');
  const { hasAccess: isModuleMember } = useRole('MEMBER', 'grupos');
  const { hasAccess: isModuleUser } = useRole('USER', 'grupos');
  const [unitId, setUnitId] = useState('');
  const [projectId, setProjectId] = useState<number | ''>('');
  const [title, setTitle] = useState('');
  const [deadlinePreset, setDeadlinePreset] = useState<
    'TODAY' | 'TOMORROW' | 'WEEK' | 'FREE'
  >('TOMORROW');
  const [meetingByCommitment, setMeetingByCommitment] = useState<
    Record<string, string>
  >({});

  const overviewQuery = useQuery({
    queryKey: ['meeting-units-overview'],
    queryFn: getMeetingUnitsOverview,
  });

  const units = overviewQuery.data?.data ?? [];
  const effectiveUnitId = unitId || units[0]?.id || '';

  const projectsQuery = useQuery({
    queryKey: ['meeting-unit-project-focus', effectiveUnitId],
    queryFn: () => getMeetingUnitProjectFocus(effectiveUnitId),
    enabled: !!effectiveUnitId,
  });

  const dashboardQuery = useQuery({
    queryKey: ['meeting-unit-dashboard', effectiveUnitId],
    queryFn: () => getMeetingUnitDashboard(effectiveUnitId),
    enabled: !!effectiveUnitId,
  });

  const moderatorsQuery = useQuery({
    queryKey: ['office-project-moderators', effectiveUnitId],
    queryFn: () => getOfficeProjectModerators(effectiveUnitId),
    enabled: !!effectiveUnitId,
  });

  const proposalsQuery = useQuery({
    queryKey: ['commitment-proposals', effectiveUnitId],
    queryFn: () =>
      getCommitments({
        unitId: effectiveUnitId,
        confirmationStatus: 'PROPOSED',
      }),
    enabled: !!effectiveUnitId,
  });

  const canManageCurrentUnit =
    isModuleMod || Boolean(moderatorsQuery.data?.canManageCurrentUnit);
  const canCreateProposal =
    canManageCurrentUnit || isModuleMember || isModuleUser;

  const activeProjects = useMemo(
    () =>
      (projectsQuery.data ?? []).filter(
        item => item.status === 'ACTIVE' && item.isCurrent
      ),
    [projectsQuery.data]
  );

  const meetings = dashboardQuery.data?.meetings ?? [];

  const createProposalMutation = useMutation({
    mutationFn: () =>
      createCommitmentProposal({
        unitId: effectiveUnitId,
        projectId: projectId || null,
        title: title.trim(),
        dueDate: getDueDate(deadlinePreset),
        assignees: [{ unitId: effectiveUnitId, role: 'OWNER' }],
      }),
    onSuccess: () => {
      setTitle('');
      setProjectId('');
      queryClient.invalidateQueries({ queryKey: ['commitment-proposals'] });
    },
  });

  const confirmMutation = useMutation({
    mutationFn: (payload: {
      commitmentId: string;
      status: 'CONFIRMED' | 'REJECTED';
    }) => confirmCommitment(payload.commitmentId, payload.status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commitment-proposals'] });
    },
  });

  const attachMutation = useMutation({
    mutationFn: (payload: { commitmentId: string; meetingId: string }) =>
      attachCommitmentToMeeting(payload.commitmentId, payload.meetingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commitment-proposals'] });
    },
  });

  if (overviewQuery.isLoading) return <LoaderForComponent />;

  return (
    <main className="cp-page">
      <header className="cp-header">
        <div>
          <span>Oficinas y Reuniones</span>
          <h1>Propuestas de compromisos</h1>
          <p>
            Compromisos sugeridos antes o despues de la reunion para aprobarlos
            luego.
          </p>
        </div>
      </header>

      <section className="cp-toolbar">
        <OfficeUnitTreeSelect
          units={units}
          value={effectiveUnitId}
          onValueChange={value => {
            setUnitId(value);
            setProjectId('');
          }}
        />
        <select
          value={projectId}
          onChange={event =>
            setProjectId(event.target.value ? Number(event.target.value) : '')
          }
        >
          <option value="">General de la unidad</option>
          {activeProjects.map(focus => (
            <option value={focus.projectId} key={focus.id || focus.projectId}>
              {focus.project.name || focus.project.contract.projectShortName}
            </option>
          ))}
        </select>
      </section>

      {canCreateProposal && (
        <section className="cp-create">
          <label>
            Nuevo compromiso propuesto
            <textarea
              value={title}
              onChange={event => setTitle(event.target.value)}
              placeholder="Describe el compromiso que quieres llevar a reunion..."
            />
          </label>
          <div className="cp-deadline">
            {(['TODAY', 'TOMORROW', 'WEEK', 'FREE'] as const).map(preset => (
              <button
                type="button"
                key={preset}
                className={deadlinePreset === preset ? 'is-active' : ''}
                onClick={() => setDeadlinePreset(preset)}
              >
                {preset === 'TODAY'
                  ? 'Hoy'
                  : preset === 'TOMORROW'
                  ? 'Manana'
                  : preset === 'WEEK'
                  ? '1 semana'
                  : 'Libre'}
              </button>
            ))}
          </div>
          <Button
            text={
              createProposalMutation.isPending
                ? 'Enviando...'
                : 'Enviar propuesta'
            }
            icon="plus"
            color="primary"
            disabled={!title.trim() || createProposalMutation.isPending}
            onClick={() => createProposalMutation.mutate()}
          />
        </section>
      )}

      <section className="cp-list">
        {proposalsQuery.isLoading && <LoaderForComponent />}
        {(proposalsQuery.data ?? []).map((commitment: Commitment) => (
          <article className="cp-card" key={commitment.id}>
            <div className="cp-cardMain">
              <Send size={18} />
              <div>
                <strong>{commitment.title}</strong>
                <span>
                  {commitment.project?.name || 'General'} /{' '}
                  {commitment.dueDate
                    ? new Date(commitment.dueDate).toLocaleDateString('es-PE')
                    : 'Sin fecha limite'}
                </span>
              </div>
            </div>
            {canManageCurrentUnit && (
              <div className="cp-actions">
                <select
                  value={meetingByCommitment[commitment.id] || ''}
                  onChange={event =>
                    setMeetingByCommitment(current => ({
                      ...current,
                      [commitment.id]: event.target.value,
                    }))
                  }
                >
                  <option value="">Vincular reunion</option>
                  {meetings.map((meeting: any) => (
                    <option value={meeting.id} key={meeting.id}>
                      {meeting.title}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={!meetingByCommitment[commitment.id]}
                  onClick={() =>
                    attachMutation.mutate({
                      commitmentId: commitment.id,
                      meetingId: meetingByCommitment[commitment.id],
                    })
                  }
                >
                  <Link2 size={14} />
                  Vincular
                </button>
                <button
                  type="button"
                  onClick={() =>
                    confirmMutation.mutate({
                      commitmentId: commitment.id,
                      status: 'CONFIRMED',
                    })
                  }
                >
                  <CheckCircle2 size={14} />
                  Confirmar
                </button>
                <button
                  type="button"
                  className="is-danger"
                  onClick={() =>
                    confirmMutation.mutate({
                      commitmentId: commitment.id,
                      status: 'REJECTED',
                    })
                  }
                >
                  <XCircle size={14} />
                  Rechazar
                </button>
              </div>
            )}
          </article>
        ))}
        {!proposalsQuery.isLoading && !(proposalsQuery.data ?? []).length && (
          <p className="cp-empty">Sin propuestas pendientes en esta unidad.</p>
        )}
      </section>
    </main>
  );
};
