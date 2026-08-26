import { useContext } from 'react';
import { useParams } from 'react-router-dom';
import IconActionExtend from '@/components/iconAction/IconActionExtend';
import { ProjectContext } from '../../context/ProjectContext';

const CoverEdit = () => {
  const { stageId } = useParams();
  const { cover, handleIsEditCover, handleSaveCover } =
    useContext(ProjectContext);
  return (
    <IconActionExtend
      iconPrimary={cover.isEdit ? 'icon_save' : 'separator'}
      fontWeightPrimary={cover.isEdit ? '600' : '500'}
      onClickPrimary={
        cover.isEdit ? () => handleSaveCover(stageId) : handleIsEditCover
      }
      onClickSecondary={handleIsEditCover}
      textPrimary={cover.isEdit ? 'Guardar' : 'Caratulas/Separadores'}
      viewIconSecondary={cover.isEdit}
    />
  );
};

export default CoverEdit;
