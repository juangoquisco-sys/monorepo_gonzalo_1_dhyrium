import type { ChangeEvent } from 'react';
import IconAction from '@/components/iconAction/IconAction';
import Select from '@/components/select/Select';
import type { TaskForReviewQUery } from '../../interface/taskForReview.types';
import { STATUS } from '../../../../constants/status.constants';
import useProjectForFilter from '../../../../hooks/useProjectForFilter';
import './headerTaskForReview.css';
interface HeaderTaskForReviewProps {
  query: TaskForReviewQUery;
  handleSetSearchParams: (value: string, key: string) => void;
}

const HeaderTaskForReview = ({
  handleSetSearchParams,
  query,
}: HeaderTaskForReviewProps) => {
  const { projectForFilterQuery } = useProjectForFilter();
  const handleFilter = ({ target }: ChangeEvent<HTMLSelectElement>) => {
    const { value, name } = target;
    handleSetSearchParams(value, name);
  };

  const getStage = (id: number) => {
    const project = projectForFilterQuery.data?.find(
      project => project.id === id
    );
    if (!project) return [];
    return project.stages;
  };

  return (
    <div className="headerTaskForReview">
      <div></div>
      <div className="headerTaskForReview-general-filter">
        <IconAction icon="filter" text="Filtrar" />
        <Select
          value={query.project}
          data={projectForFilterQuery.data}
          placeholder="Proyecto"
          onChange={handleFilter}
          name="project"
          extractValue={({ id }) => id}
          renderTextField={({ name }) => name}
          styleVariant="tertiary"
        />
        <Select
          value={query.stage}
          data={getStage(+query.project)}
          placeholder="Etapa"
          onChange={handleFilter}
          name="stage"
          extractValue={({ id }) => id}
          renderTextField={({ name }) => name}
          styleVariant="tertiary"
        />
        <Select
          value={query.status}
          data={STATUS}
          placeholder="Estado"
          onChange={handleFilter}
          name="status"
          extractValue={({ id }) => id}
          renderTextField={({ name }) => name}
          styleVariant="tertiary"
        />
      </div>
    </div>
  );
};

export default HeaderTaskForReview;
