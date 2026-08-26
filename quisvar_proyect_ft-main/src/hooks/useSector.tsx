import { type ChangeEvent, useCallback, useEffect, useState } from 'react';
import type { SectorType } from '@/types/types';
import { axiosInstance } from '@/services/axiosInstance';
import { useParams } from 'react-router-dom';
import useRole from './useRole';

interface FilterSector {
  year: string;
}

const useSector = () => {
  const [sectors, setSectors] = useState<SectorType[] | null>(null);
  const [filters, setFilters] = useState<FilterSector>({ year: '' });
  const { hasAccess: authUsers } = useRole('MOD');

  const { projectId } = useParams();
  const findTaskPathProject = (
    data: SectorType[] = [],
    projectId: number,
    path: string[] = []
  ) => {
    for (let sector of data) {
      path = [...path, `sector-${sector.id}`];
      for (let specialities of sector.specialities) {
        path = [...path, `specialities-${specialities.id}`];
        for (let typespecialities of specialities?.typeSpecialities ?? []) {
          for (let project of typespecialities.projects) {
            if (project.id === projectId) {
              path = [...path, `typespecialities-${typespecialities.id}`];
              return path;
            }
          }
        }
      }
    }
    return null;
  };

  const handleSetValuesFilter = ({
    target,
  }: ChangeEvent<HTMLSelectElement>) => {
    setSectors(null);
    const { name, value } = target;
    const newData = { ...filters, [name]: value };
    setFilters(newData);
    getSpecialities(newData);
  };
  const getSpecialities = useCallback(async (filters?: FilterSector) => {
    const params = filters
      ? new URLSearchParams({
          currencyYear: filters.year,
        })
      : undefined;

    const { data: sectors } = await axiosInstance.get<SectorType[]>('/sector', {
      params: { ...params, all: authUsers },
      headers: {
        noLoader: true,
      },
    });
    if (projectId) {
      const arrChecked = findTaskPathProject(sectors, +projectId) ?? [];
      localStorage.setItem('arrChecked', JSON.stringify(arrChecked));
    }
    setSectors(sectors);
  }, []);

  useEffect(() => {
    getSpecialities();
  }, []);

  // const filterForUserCoordinator = (sectors: SectorType[], userId: number) => {
  //   return sectors
  //     .map(sector => {
  //       const specialitiesFilter = sector.specialities
  //         .map(spaciality => {
  //           const typeSpecialitiesFilter = spaciality.typeSpecialities
  //             ?.map(typeSpeciality => {
  //               const typeProjectFilter = typeSpeciality.projects.filter(
  //                 project => project.userId === userId
  //               );
  //               return { ...typeSpeciality, projects: typeProjectFilter };
  //             })
  //             .filter(typeSpeciality => typeSpeciality.projects.length);
  //           return { ...spaciality, typeSpecialities: typeSpecialitiesFilter };
  //         })
  //         .filter(spaciality => spaciality.typeSpecialities?.length);
  //       return { ...sector, specialities: specialitiesFilter };
  //     })
  //     .filter(sector => sector.specialities.length);
  // };
  const settingSectors = (sectors: SectorType[]) => {
    setSectors(sectors);
  };
  return { getSpecialities, sectors, settingSectors, handleSetValuesFilter };
};

export default useSector;
