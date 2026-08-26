import { useEffect, useMemo, useState } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import {
  Building2,
  ChevronRight,
  ListTree,
  Search,
  UserCheck,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DropDownSidebarSpeciality from '../dropDownSidebarSpeciality/DropDownSidebarSpeciality';
import LoaderForComponent from '@/components/loaderForComponent/LoaderForComponent';
import Select from '@/components/select/Select';
import CardRegisterProject from '../../views/cardRegisterProject/CardRegisterProject';
import './sidebarSpeciality.css';
import { YEAR_DATA } from '../../models/definitionSpeciality';
import useSector from '@/hooks/useSector';
import type { SectorType } from '@/types/types';
import {
  getMeetingUnitProjects,
  getMeetingUnitsOverview,
} from '../../../group/services/meetingUnitProjects.service';
import type {
  MeetingProjectFocus,
  MeetingUnitOverviewItem,
} from '../../../group/types/meetingUnitProjects.types';

type ProjectSidebarView = 'tree' | 'office' | 'mine';

type ProjectWithContract = {
  name?: string | null;
  CUI?: string | null;
  contract?: {
    cui?: string | null;
    projectName?: string | null;
    projectShortName?: string | null;
    municipality?: string | null;
  } | null;
};

const normalize = (value?: string | number | null) =>
  String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const projectText = (project?: ProjectWithContract) =>
  [
    project?.name,
    project?.CUI,
    project?.contract?.cui,
    project?.contract?.projectName,
    project?.contract?.projectShortName,
    project?.contract?.municipality,
  ].join(' ');

const getProjectName = (project?: ProjectWithContract) =>
  project?.contract?.projectShortName ||
  project?.contract?.projectName ||
  project?.name ||
  'Proyecto sin nombre';

const getProjectCode = (project?: ProjectWithContract) =>
  project?.contract?.cui || project?.CUI || 'Sin CUI';

const filterSectors = (sectors: SectorType[], search: string) => {
  const value = normalize(search);
  if (!value) return sectors;

  return sectors
    .map(sector => {
      const sectorMatch = normalize(sector.name).includes(value);
      const specialities = sector.specialities
        .map(speciality => {
          const specialityMatch = normalize(
            `${speciality.name} ${speciality.cod}`
          ).includes(value);
          const typeSpecialities = (speciality.typeSpecialities ?? [])
            .map(typeSpeciality => {
              const typeMatch = normalize(
                `${typeSpeciality.name} ${typeSpeciality.cod}`
              ).includes(value);
              const projects = typeSpeciality.projects.filter(project =>
                normalize(projectText(project)).includes(value)
              );

              if (
                sectorMatch ||
                specialityMatch ||
                typeMatch ||
                projects.length
              ) {
                return {
                  ...typeSpeciality,
                  projects:
                    sectorMatch || specialityMatch || typeMatch
                      ? typeSpeciality.projects
                      : projects,
                };
              }

              return null;
            })
            .filter(Boolean) as NonNullable<
            SectorType['specialities'][number]['typeSpecialities']
          >;

          if (sectorMatch || specialityMatch || typeSpecialities.length) {
            return {
              ...speciality,
              typeSpecialities:
                sectorMatch || specialityMatch
                  ? speciality.typeSpecialities
                  : typeSpecialities,
            };
          }

          return null;
        })
        .filter(Boolean) as SectorType['specialities'];

      if (sectorMatch || specialities.length) {
        return {
          ...sector,
          specialities: sectorMatch ? sector.specialities : specialities,
        };
      }

      return null;
    })
    .filter(Boolean) as SectorType[];
};

const countProjects = (sectors: SectorType[] = []) =>
  sectors.reduce(
    (sectorAcc, sector) =>
      sectorAcc +
      sector.specialities.reduce(
        (specialityAcc, speciality) =>
          specialityAcc +
          (speciality.typeSpecialities ?? []).reduce(
            (typeAcc, typeSpeciality) =>
              typeAcc + typeSpeciality.projects.length,
            0
          ),
        0
      ),
    0
  );

const flattenOfficeProjects = (
  units: MeetingUnitOverviewItem[],
  projectsByUnit: MeetingProjectFocus[][]
) => {
  const uniqueProjects = new Map<
    number,
    MeetingProjectFocus & { unitName: string }
  >();
  projectsByUnit.forEach((projects, index) => {
    const unitName = units[index]?.name ?? 'Oficina';
    projects.forEach(projectFocus => {
      if (!uniqueProjects.has(projectFocus.projectId)) {
        uniqueProjects.set(projectFocus.projectId, {
          ...projectFocus,
          unitName,
        });
      }
    });
  });
  return [...uniqueProjects.values()];
};

const ProjectFocusList = ({
  projects,
  isLoading,
  emptyText,
}: {
  projects: (MeetingProjectFocus & { unitName?: string })[];
  isLoading?: boolean;
  emptyText: string;
}) => {
  const navigate = useNavigate();

  const goToProject = (projectFocus: MeetingProjectFocus) => {
    let urlNavigate = `proyecto/${projectFocus.projectId}`;
    const firstStage = projectFocus.project.stages?.[0];
    if (firstStage) urlNavigate += `/etapa/${firstStage.id}`;
    navigate(urlNavigate);
  };

  if (isLoading) return <LoaderForComponent />;

  if (!projects.length) {
    return <div className="sidebarSpeciality-empty">{emptyText}</div>;
  }

  return (
    <div className="sidebarSpeciality-projectList">
      {projects.map(projectFocus => (
        <button
          type="button"
          className="sidebarSpeciality-projectCard"
          key={`${projectFocus.unitId}-${projectFocus.projectId}`}
          onClick={() => goToProject(projectFocus)}
        >
          <span className="sidebarSpeciality-projectKicker">
            {projectFocus.unitName ||
              projectFocus.project.contract?.municipality ||
              'Oficina'}
          </span>
          <strong>{getProjectName(projectFocus.project)}</strong>
          <small>{getProjectCode(projectFocus.project)}</small>
          <span
            className={`sidebarSpeciality-projectStatus is-${projectFocus.status.toLowerCase()}`}
          >
            {projectFocus.status === 'ACTIVE' ? 'Activo' : projectFocus.status}
          </span>
          <ChevronRight size={16} />
        </button>
      ))}
    </div>
  );
};

const SidebarSpecility = () => {
  const { getSpecialities, sectors, handleSetValuesFilter } = useSector();
  const [search, setSearch] = useState('');
  const [view, setView] = useState<ProjectSidebarView>('tree');
  const [selectedUnitId, setSelectedUnitId] = useState('');

  const overviewQuery = useQuery({
    queryKey: ['specialities-sidebar', 'meeting-units-overview'],
    queryFn: getMeetingUnitsOverview,
    enabled: view !== 'tree',
    staleTime: 1000 * 60,
  });

  const visibleUnits = useMemo(
    () => overviewQuery.data?.data ?? [],
    [overviewQuery.data?.data]
  );

  useEffect(() => {
    if (!selectedUnitId && visibleUnits.length) {
      setSelectedUnitId(visibleUnits[0].id);
    }
  }, [selectedUnitId, visibleUnits]);

  const officeProjectsQuery = useQuery<MeetingProjectFocus[]>({
    queryKey: ['specialities-sidebar', 'office-projects', selectedUnitId],
    queryFn: () => getMeetingUnitProjects(selectedUnitId),
    enabled: view === 'office' && !!selectedUnitId,
    staleTime: 1000 * 30,
  });

  const mineProjectQueries = useQueries({
    queries: visibleUnits.map(unit => ({
      queryKey: ['specialities-sidebar', 'mine-projects', unit.id],
      queryFn: () =>
        getMeetingUnitProjects(unit.id) as Promise<MeetingProjectFocus[]>,
      enabled: view === 'mine',
      staleTime: 1000 * 30,
    })),
  });

  const filteredSectors = useMemo(
    () => filterSectors(sectors ?? [], search),
    [search, sectors]
  );

  const officeProjects = useMemo(
    () =>
      (officeProjectsQuery.data ?? []).filter(projectFocus =>
        normalize(projectText(projectFocus.project)).includes(normalize(search))
      ),
    [officeProjectsQuery.data, search]
  );

  const mineProjects = useMemo(() => {
    const data = mineProjectQueries.map(query => query.data ?? []);
    return flattenOfficeProjects(visibleUnits, data).filter(projectFocus =>
      normalize(
        `${projectFocus.unitName} ${projectText(projectFocus.project)}`
      ).includes(normalize(search))
    );
  }, [mineProjectQueries, visibleUnits, search]);

  const mineProjectsLoading =
    view === 'mine' && mineProjectQueries.some(query => query.isLoading);

  const filteredProjectCount =
    view === 'tree'
      ? countProjects(filteredSectors)
      : view === 'office'
      ? officeProjects.length
      : mineProjects.length;

  return (
    <div className="sidebarSpeciality">
      <div className="sidebarSpeciality-header">
        <div>
          <span className="sidebarSpeciality-eyebrow">Modulo</span>
          <h2 className="sidebarSpeciality-subtitle">Proyectos</h2>
        </div>
        <b>{filteredProjectCount}</b>
      </div>

      <label className="sidebarSpeciality-search">
        <Search size={15} />
        <input
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder="Buscar proyecto, CUI o etapa"
        />
        {search && (
          <button type="button" onClick={() => setSearch('')}>
            <X size={14} />
          </button>
        )}
      </label>

      <div className="sidebarSpeciality-tabs">
        <button
          type="button"
          className={view === 'tree' ? 'is-active' : ''}
          onClick={() => setView('tree')}
          title="Ver estructura por sector"
        >
          <ListTree size={15} />
          Todos
        </button>
        <button
          type="button"
          className={view === 'office' ? 'is-active' : ''}
          onClick={() => setView('office')}
          title="Filtrar por oficina del organigrama"
        >
          <Building2 size={15} />
          Oficina
        </button>
        <button
          type="button"
          className={view === 'mine' ? 'is-active' : ''}
          onClick={() => setView('mine')}
          title="Proyectos visibles para mis oficinas"
        >
          <UserCheck size={15} />
          Mis
        </button>
      </div>

      {view === 'tree' && (
        <Select
          name="year"
          data={YEAR_DATA}
          placeholder="ano"
          width={5}
          onChange={handleSetValuesFilter}
          styleVariant="tertiary"
          extractValue={({ year }) => year}
          renderTextField={({ year }) => year}
        />
      )}

      {view === 'office' && (
        <label className="sidebarSpeciality-officeSelect">
          <Building2 size={15} />
          <select
            value={selectedUnitId}
            onChange={event => setSelectedUnitId(event.target.value)}
          >
            {visibleUnits.map(unit => (
              <option value={unit.id} key={unit.id}>
                {unit.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="sidebarSpeciality-contain">
        {view === 'tree' && sectors ? (
          <>
            <DropDownSidebarSpeciality
              data={{
                id: 0,
                name: '',
                sectors: filteredSectors,
              }}
              onSave={getSpecialities}
              forceOpen={Boolean(search)}
            />
            {!filteredSectors.length && (
              <div className="sidebarSpeciality-empty">
                No se encontraron proyectos con ese filtro.
              </div>
            )}
          </>
        ) : view === 'office' ? (
          <ProjectFocusList
            projects={officeProjects}
            isLoading={overviewQuery.isLoading || officeProjectsQuery.isLoading}
            emptyText="Esta oficina no tiene proyectos vinculados o no coincide con la busqueda."
          />
        ) : view === 'mine' ? (
          <ProjectFocusList
            projects={mineProjects}
            isLoading={overviewQuery.isLoading || mineProjectsLoading}
            emptyText="No hay proyectos vinculados a tus oficinas con ese filtro."
          />
        ) : (
          <LoaderForComponent />
        )}
      </div>
      <CardRegisterProject onSave={getSpecialities} />
    </div>
  );
};

export default SidebarSpecility;
