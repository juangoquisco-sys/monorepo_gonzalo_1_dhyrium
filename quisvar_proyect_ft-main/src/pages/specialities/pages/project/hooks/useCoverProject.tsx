import { useCallback, useState } from 'react';
import type { CoverBody, ServiceProject } from '../interface/ProjectContex';
import { INITIAL_VALUES_EDIT } from '../models/definitiosProject';
import useEmitWithLoader from '@/hooks/useEmitWithLoader';

interface UseCoverProjectProps {
  service: ServiceProject;
}
const useCoverProject = ({ service }: UseCoverProjectProps) => {
  // const socket = useContext(SocketContext);
  const { emitWithLoader } = useEmitWithLoader();
  const [cover, setcover] = useState(INITIAL_VALUES_EDIT);
  const [coversBody, setCoversBody] = useState<CoverBody[]>([]);

  const handleIsEditCover = useCallback(() => {
    setCoversBody([]);
    setcover({ ...cover, isEdit: !cover.isEdit });
  }, [cover]);

  const addCoverBody = useCallback((cover: CoverBody) => {
    setCoversBody(prev => {
      const existCover = prev.find(({ id }) => id === cover.id);
      if (existCover) {
        return prev.map(el => (el.id === cover.id ? cover : el));
      } else {
        return [...prev, cover];
      }
    });
  }, []);

  const handleSaveCover = useCallback(
    async (stageId?: string) => {
      if (!stageId) return;

      if (coversBody.length === 0) return handleIsEditCover();
      await emitWithLoader(service.updateCover, coversBody, stageId);
      handleIsEditCover();
    },
    [coversBody, handleIsEditCover, location.pathname]
  );
  const resetValuesCover = () => {
    setcover(INITIAL_VALUES_EDIT);
    setCoversBody([]);
  };
  return {
    handleSaveCover,
    addCoverBody,
    resetValuesCover,
    handleIsEditCover,
    cover,
  };
};

export default useCoverProject;
