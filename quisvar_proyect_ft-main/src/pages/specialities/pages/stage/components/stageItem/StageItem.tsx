import { useState } from 'react';
import type { Option, StageSubtask } from '@/types/types';
import { NavLink, useNavigate } from 'react-router-dom';
import AppContextMenu from '@/components/appContextMenu/AppContextMenu';
import IconAction from '@/components/iconAction/IconAction';
import Input from '@/components/Input/Input';
import {
  validateCorrectTyping,
  validateWhiteSpace,
} from '@/utils/customValidatesForm';
import { useForm } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import { axiosInstance } from '@/services/axiosInstance';
import './StageItem.css';
import {
  isOpenButtonDelete$,
  isOpenCardDuplicateFrom$,
} from '@/services/sharingSubject';
import useRole from '@/hooks/useRole';
interface StageItemProps {
  stage: StageSubtask;
  i: number;
  getStages: () => void;
}
interface StageName {
  name: string;
}
const StageItem = ({ stage, i, getStages }: StageItemProps) => {
  const [openEdit, setOpenEdit] = useState(false);
  const { hasAccess } = useRole('MOD');

  const navigate = useNavigate();
  const {
    handleSubmit,
    register,
    reset,
    formState: { errors },
  } = useForm<StageName>();

  const handleOpenEdit = () => {
    setOpenEdit(!openEdit);
    reset({});
  };

  const onSubmitData: SubmitHandler<StageName> = async body => {
    axiosInstance.patch(`stages/${stage.id}`, body).then(() => getStages());
    setOpenEdit(false);
    reset({});
  };
  const handleDeleteLevel = () => {
    axiosInstance.delete(`stages/${stage.id}`).then(() => {
      reset({});
      getStages();
      navigate('.');
    });
  };
  // const handleDuplicate = () => {
  //   const body = {
  //     name: stage.name + ' copia',
  //   };
  //   axiosInstance
  //     .post(`/duplicates/stage/${stage.id}`, body)
  //     .then(() => getStages());
  // };
  const handleOpenButtonDelete = () => {
    isOpenButtonDelete$.setSubject = {
      isOpen: true,
      function: handleDeleteLevel,
    };
  };
  const handleOpenCardFrom = () => {
    isOpenCardDuplicateFrom$.setSubject = {
      isOpen: true,
      id: stage.id,
    };
  };
  const options: Option[] = [
    {
      name: 'Editar',
      type: 'button',
      icon: 'pencil',
      function: handleOpenEdit,
    },

    {
      name: 'Eliminar',
      type: 'button',
      icon: 'trash-red',

      function: handleOpenButtonDelete,
    },
    // {
    //   name: 'Duplicar',
    //   type: 'button',
    //   icon: 'document-duplicate',

    //   function: handleDuplicate,
    // },
  ];
  const options2: Option[] = [
    {
      name: 'Duplicar de',
      type: 'button',
      icon: 'document-duplicate',

      function: handleOpenCardFrom,
    },
  ];
  const count = !!stage._count.levels;
  const currentRoute = window.location.href;
  const menuData = count ? options : [...options, ...options2];

  return (
    <div className="stage-header">
      {i !== 0 && <span className="stage-header-separation">|</span>}

      <NavLink to={openEdit ? currentRoute : `etapa/${stage.id}`}>
        {({ isActive }) => (
          <AppContextMenu data={menuData} disabled={!hasAccess}>
            <div
              className="stage-header-div"
              key={stage.id + 1}
              onClick={e => e.stopPropagation()}
            >
              {!openEdit ? (
                <span
                  className={
                    isActive
                      ? ' stage-header-span activeLink'
                      : 'stage-header-span'
                  }
                >
                  {stage.name}
                </span>
              ) : (
                <form
                  onSubmit={handleSubmit(onSubmitData)}
                  className="projectLevel-form"
                >
                  <Input
                    {...register('name', {
                      validate: { validateWhiteSpace, validateCorrectTyping },
                      value: stage.name,
                    })}
                    name="name"
                    className="stageItem-input"
                    errors={errors}
                    autoFocus
                  />
                  <div className="stageItem-icon-area">
                    <button style={{ backgroundColor: 'transparent' }}>
                      <IconAction
                        size={1.5}
                        icon="check-blue"
                        position="none"
                        onClick={handleSubmit(onSubmitData)}
                      />
                    </button>
                    <button style={{ backgroundColor: 'transparent' }}>
                      <IconAction
                        size={1.5}
                        icon="cross-red"
                        position="none"
                        onClick={handleOpenEdit}
                      />
                    </button>
                  </div>
                </form>
              )}
            </div>
          </AppContextMenu>
        )}
      </NavLink>
    </div>
  );
};

export default StageItem;
