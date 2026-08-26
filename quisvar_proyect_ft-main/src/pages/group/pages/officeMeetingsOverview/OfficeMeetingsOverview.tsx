import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Search,
} from 'lucide-react';
import Input from '@/components/Input/Input';
import LoaderForComponent from '@/components/loaderForComponent/LoaderForComponent';
import useRole from '@/hooks/useRole';
import { getMeetingUnitsOverview } from '../../services/meetingUnitProjects.service';
import type { MeetingUnitOverviewItem } from '../../types/meetingUnitProjects.types';
import './officeMeetingsOverview.css';

const healthLabel: Record<string, string> = {
  HEALTHY: 'Saludable',
  WATCH: 'Atencion',
  CRITICAL: 'Critico',
};

const unitTypeLabel: Record<string, string> = {
  GERENCIA: 'Gerencias',
  OFICINA: 'Oficinas',
  GRUPO: 'Grupos',
  ESPECIALIDAD: 'Especialidades',
  COMITE_TEMPORAL: 'Comites',
};

const OfficeMeetingsOverview = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const { hasAccess: isModuleMod } = useRole('MOD', 'grupos');
  const { hasAccess: isModuleMember } = useRole('MEMBER', 'grupos');
  const { hasAccess: isModuleUser } = useRole('USER', 'grupos');
  const { hasAccess: isModuleViewer } = useRole('VIEWER', 'grupos');

  const overviewQuery = useQuery({
    queryKey: ['office-meetings', 'overview'],
    queryFn: getMeetingUnitsOverview,
  });

  const filteredUnits = useMemo(() => {
    const units = overviewQuery.data?.data ?? [];
    const unitsByType =
      typeFilter === 'ALL'
        ? units
        : units.filter(unit => unit.type === typeFilter);
    if (!search.trim()) return unitsByType;
    const lowerSearch = search.toLowerCase();
    return unitsByType.filter(unit =>
      unit.name.toLowerCase().includes(lowerSearch)
    );
  }, [overviewQuery.data, search, typeFilter]);

  const typeOptions = useMemo(() => {
    const units = overviewQuery.data?.data ?? [];
    const counts = units.reduce<Record<string, number>>((acc, unit) => {
      acc[unit.type] = (acc[unit.type] || 0) + 1;
      return acc;
    }, {});
    return [
      { value: 'ALL', label: 'Todas', count: units.length },
      ...Object.entries(counts)
        .sort(([first], [second]) => first.localeCompare(second))
        .map(([type, count]) => ({
          value: type,
          label: unitTypeLabel[type] || type,
          count,
        })),
    ];
  }, [overviewQuery.data]);

  const renderHealthIcon = (unit: MeetingUnitOverviewItem) => {
    if (unit.metrics.health === 'CRITICAL')
      return <AlertCircle className="omo-healthIcon is-critical" size={18} />;
    if (unit.metrics.health === 'WATCH')
      return <CalendarDays className="omo-healthIcon is-watch" size={18} />;
    return <CheckCircle2 className="omo-healthIcon is-healthy" size={18} />;
  };

  if (overviewQuery.isLoading) return <LoaderForComponent />;

  return (
    <main className="omo-page">
      <header className="omo-header">
        <div>
          <p className="omo-eyebrow">Modulo</p>
          <h1>Oficinas y Reuniones</h1>
          <span>
            Vista global de unidades, proyectos activos, reuniones y
            compromisos.
          </span>
        </div>
        <div className="omo-permissions">
          {isModuleMod && <b>MOD</b>}
          {isModuleMember && <b>MEMBER</b>}
          {isModuleUser && <b>USER</b>}
          {isModuleViewer && <b>VIEWER</b>}
        </div>
      </header>

      <section className="omo-metrics">
        <article>
          <Building2 size={20} />
          <span>Unidades</span>
          <strong>{overviewQuery.data?.totals.units ?? 0}</strong>
        </article>
        <article>
          <ClipboardList size={20} />
          <span>Proyectos activos</span>
          <strong>{overviewQuery.data?.totals.activeProjects ?? 0}</strong>
        </article>
        <article>
          <AlertCircle size={20} />
          <span>Compromisos abiertos</span>
          <strong>{overviewQuery.data?.totals.openCommitments ?? 0}</strong>
        </article>
        <article>
          <CalendarDays size={20} />
          <span>Reuniones proximas</span>
          <strong>{overviewQuery.data?.totals.upcomingMeetings ?? 0}</strong>
        </article>
      </section>

      <section className="omo-listHeader">
        <div>
          <h2>Unidades del organigrama</h2>
          <p>Incluye gerencias, oficinas, grupos y otras unidades activas.</p>
        </div>
        <label className="omo-search">
          <Search size={16} />
          <Input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Buscar unidad"
          />
        </label>
      </section>

      <section
        className="omo-typeFilters"
        aria-label="Filtrar por tipo de unidad"
      >
        {typeOptions.map(option => (
          <button
            key={option.value}
            type="button"
            className={typeFilter === option.value ? 'is-active' : ''}
            onClick={() => setTypeFilter(option.value)}
          >
            {option.label}
            <b>{option.count}</b>
          </button>
        ))}
      </section>

      <section className="omo-grid">
        {filteredUnits.map(unit => (
          <button
            key={unit.id}
            className="omo-card"
            type="button"
            onClick={() => navigate(`oficinas/${unit.id}`)}
          >
            <div className="omo-cardTitle">
              <div>
                <strong>{unit.name}</strong>
                <span>{unit.type}</span>
              </div>
              <div
                className={`omo-health is-${unit.metrics.health.toLowerCase()}`}
              >
                {renderHealthIcon(unit)}
                {healthLabel[unit.metrics.health]}
              </div>
            </div>
            <div className="omo-cardMetrics">
              <span>
                <b>{unit.metrics.activeProjects}</b> proyectos
              </span>
              <span>
                <b>{unit.metrics.openCommitments}</b> compromisos
              </span>
              <span>
                <b>{unit.metrics.overdueCommitments}</b> vencidos
              </span>
            </div>
            <div className="omo-nextMeeting">
              {unit.metrics.nextMeeting
                ? `Proxima: ${unit.metrics.nextMeeting.title}`
                : 'Sin reuniones programadas'}
            </div>
          </button>
        ))}
      </section>
    </main>
  );
};

export default OfficeMeetingsOverview;
