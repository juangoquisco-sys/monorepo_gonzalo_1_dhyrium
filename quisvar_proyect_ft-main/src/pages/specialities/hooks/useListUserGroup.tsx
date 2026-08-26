import { useTaskAssignmentContext } from './useTaskAssignmentContext';

const useListUserGroup = (taskId: number | null) => {
  const assignmentContextQuery = useTaskAssignmentContext(taskId, 'TECHNICAL');

  return {
    useListUserGroupQuery: {
      ...assignmentContextQuery,
      data: assignmentContextQuery.data?.members ?? [],
    },
  };
};

export default useListUserGroup;
