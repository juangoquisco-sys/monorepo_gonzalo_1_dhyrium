import { Outlet, useParams, useSearchParams } from 'react-router-dom';
import './TaskForReview.css';
import type { TaskForReviewQUery } from './interface/taskForReview.types';
import HeaderTaskForReview from './components/headerTaskForReview/HeaderTaskForReview';
import SidebarTaskForReview from './components/sidebarTaskForReview/SidebarTaskForReview';
import TableTaskForReview from './components/tableTaskForReview/TableTaskForReview';
import TableTaskForReviewByUser from './components/tableTaskForReview/TableTaskForReviewByUser';
import { useEffect } from 'react';

const TaskForReview = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { taskId } = useParams();

  const handleSetSearchParams = (value: string, key: string) => {
    value ? searchParams.set(key, value) : searchParams.delete(key);
    setSearchParams(searchParams);
  };

  useEffect(() => {
    searchParams.set('status', 'INREVIEW');
    searchParams.set('page', '0');
    searchParams.set('limit', '50');
    setSearchParams(searchParams);
  }, []);

  const query: TaskForReviewQUery = {
    project: searchParams.get('project') ?? '',
    stage: searchParams.get('stage') ?? '',
    status: searchParams.get('status') ?? '',
    initialDate: searchParams.get('initialDate') ?? '',
    untilDate: searchParams.get('untilDate') ?? '',
    userId: searchParams.get('userId') ?? '',
  };

  return (
    <div className="taskForReview">
      <SidebarTaskForReview
        handleSetSearchParams={handleSetSearchParams}
        query={query}
      />
      <div className="taskForReview-main">
        <div
          className={`taskForReview-container ${taskId && 'task-card-route'}`}
        >
          <HeaderTaskForReview
            query={query}
            handleSetSearchParams={handleSetSearchParams}
          />
          {!query.userId ? (
            <TableTaskForReview />
          ) : (
            <TableTaskForReviewByUser />
          )}
        </div>
        <Outlet />
      </div>
    </div>
  );
};

export default TaskForReview;
