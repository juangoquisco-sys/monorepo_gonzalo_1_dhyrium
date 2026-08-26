import { useContext } from 'react';
import type { TypeArchiver } from '@/pages/specialities/models/projectDocuments.types';
import {
  handleArchiver,
  handleMergePdfs,
} from '@/pages/specialities/services/projectDocuments.service';
import type { Level } from '@/types/types';
import { ProjectContext } from '../context/ProjectContext';

interface useOptionLevelsProps {
  data: Level;
}
const useOptionLevels = ({ data }: useOptionLevelsProps) => {
  const { service } = useContext(ProjectContext);

  const typeLevel = data.projectName ? 'stage' : 'level';
  const handleArchiverLevel = (type: TypeArchiver) =>
    handleArchiver({
      type,
      id: data.id,
      name: data.name,
      typeLevel,
      service: service.archiver,
      itemLevel: data?.item?.split('.').slice(-1).join('.') || '',
    });

  const archiverOptions = [
    {
      name: 'Comprimir',
      fn: () => handleArchiverLevel('all'),
      icon: 'zip-normal',
    },
    {
      name: 'Comprimir PDF',
      fn: () => handleArchiverLevel('pdf'),
      icon: 'zip-pdf',
    },
    {
      name: 'Comprimir Editables',
      fn: () => handleArchiverLevel('nopdf'),
      icon: 'zip-edit',
    },
    {
      name: 'Unir PDFs',
      fn: () =>
        handleMergePdfs(typeLevel, data.id, data.name, service.mergePdfs),
      icon: 'merge-pdf',
    },
  ];
  return { archiverOptions };
};

export default useOptionLevels;
