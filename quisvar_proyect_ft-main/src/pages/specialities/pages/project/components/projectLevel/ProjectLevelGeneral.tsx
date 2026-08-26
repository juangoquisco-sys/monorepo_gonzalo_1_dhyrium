import { useContext, useEffect, useState, type ChangeEvent } from 'react';
import type { Level, Option } from '@/types/types';
import './projectLevel.css';
import AppContextMenu from '@/components/appContextMenu/AppContextMenu';
import Input from '@/components/Input/Input';
import DropDownSimple from '@/components/dropDownSimple/DropDownSimple';
import IconAction from '@/components/iconAction/IconAction';
import colors from '@/utils/json/colors.json';
import { useForm } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import {
  validateCorrectTyping,
  validateWhiteSpace,
} from '@/utils/customValidatesForm';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store/store.types';
import { useProjectModeratorUsers } from '@/hooks/useUserLookupOptions';
import { isOpenButtonDelete$, loader$ } from '@/services/sharingSubject';
import type { OptionLevel } from '../../pages/budgets/models/types';
import { OPTION_LEVEL_TEXT } from '../../pages/budgets/models/definitionsBudgets';
import { SocketContext } from '@/context/SocketContex';
import { MoreInfo } from '../moreInfo/MoreInfo';
import { ProjectContext } from '../../context/ProjectContext';
import { ProjectRole } from '../../models/definitiosProject';
import { parseStoredStringArray } from '@/utils/localStorageValues';

interface ProjectLevelGeneralProps {
  data: Level;
}
interface DataForm {
  name: string;
  userId?: number;
}
export const ProjectLevelGeneral = ({ data }: ProjectLevelGeneralProps) => {
  const socket = useContext(SocketContext);
  const { cover, addCoverBody, dayTask, service, hasPermission } =
    useContext(ProjectContext);

  const {
    handleSubmit,
    register,
    reset,
    formState: { errors },
  } = useForm<DataForm>();
  const modAuthProject = useSelector(
    (state: RootState) => state.modAuthProject
  );

  const [coverValue, setCoverValue] = useState(data.cover);
  const [openOptionLevel, setOpenOptionLevel] = useState<OptionLevel>(null);
  const handleCloseEdit = () => setOpenOptionLevel(null);
  const handleOpenEdit = (option: OptionLevel) => {
    if (openOptionLevel) return setOpenOptionLevel(null);
    reset({ name: data.name });
    setOpenOptionLevel(option);
  };
  const { data: modedators = [] } = useProjectModeratorUsers();
  const [idCoordinator, setIdCoordinator] = useState<number | null>(null);

  const onSubmitData: SubmitHandler<DataForm> = async body => {
    switch (openOptionLevel) {
      case 'lowerAdd':
        handleAddLevelToUpperOrDown('lower', body.name);
        break;
      case 'upperAdd':
        handleAddLevelToUpperOrDown('upper', body.name);
        break;
      case 'duplicate':
        handleDuplicate(body.name);
        break;
      case 'edit':
        handleEdit(body);
        break;
    }
    resetValues();
  };
  const handleDeleteLevel = () => {
    loader$.setSubject = true;
    socket.emit(
      service.deleteLevel,
      data.id,
      () => (loader$.setSubject = false)
    );
  };

  const handleOpenButtonDelete = () => {
    isOpenButtonDelete$.setSubject = {
      isOpen: true,
      function: handleDeleteLevel,
    };
  };
  const deleteUser = () => setIdCoordinator(null);
  const resetValues = () => {
    reset({});
    handleOpenEdit(null);
  };
  const handleDuplicate = (name: string) => {
    loader$.setSubject = true;
    socket.emit(service.duplicateLevel, data.id, name, () => {
      loader$.setSubject = false;
    });
  };
  const handleEdit = (body: DataForm) => {
    if (data.userId) body = { ...body, userId: idCoordinator ?? data.userId };
    loader$.setSubject = true;
    socket.emit(
      service.editLevel,
      data.id,
      body,
      () => (loader$.setSubject = false)
    );
  };
  const handleMakeRegularFolder = () => {
    loader$.setSubject = true;
    socket.emit(service.makeRegularLevel, data.id, () => {
      loader$.setSubject = false;
    });
  };

  const handleAddLevelToUpperOrDown = (
    type: 'upper' | 'lower',
    name: string
  ) => {
    const body = {
      name,
    };
    loader$.setSubject = true;
    socket.emit(service.upperOrLowerLevel, data.id, body, type, () => {
      loader$.setSubject = false;
    });
  };

  const handleCheck = ({ target }: ChangeEvent<HTMLInputElement>) => {
    const arrChecked = parseStoredStringArray(
      localStorage.getItem('arrCheckedLevel')
    );
    const { checked } = target;
    if (checked) {
      arrChecked.push(String(data.id));
      localStorage.setItem('arrCheckedLevel', JSON.stringify(arrChecked));
    } else {
      const newArrChecked = arrChecked.filter(el => el !== String(data.id));
      localStorage.setItem('arrCheckedLevel', JSON.stringify(newArrChecked));
    }
  };
  const options: Option[] = [
    {
      name: openOptionLevel ? 'Cancelar' : 'Editar',
      type: openOptionLevel ? 'submit' : 'button',
      icon: openOptionLevel ? 'close' : 'pencil',
      function: () => handleOpenEdit('edit'),
    },

    {
      name: openOptionLevel ? 'Guardar' : 'Eliminar',
      type: openOptionLevel ? 'submit' : 'button',
      icon: openOptionLevel ? 'save' : 'trash-red',

      function: openOptionLevel
        ? handleSubmit(onSubmitData)
        : handleOpenButtonDelete,
    },
    {
      name: 'Duplicar',
      type: 'button',
      icon: 'document-duplicate',

      function: () => handleOpenEdit('duplicate'),
    },
    ...(data.unique
      ? [
          {
            name: 'Convertir en carpeta normal',
            type: 'button' as const,
            icon: 'folder-icon',
            function: handleMakeRegularFolder,
          },
        ]
      : []),
    {
      name: 'Agregar arriba',
      type: 'button',
      icon: 'upper',

      function: () => handleOpenEdit('upperAdd'),
    },
    {
      name: 'Agrega abajo',
      type: 'button',
      icon: 'lower',

      function: () => handleOpenEdit('lowerAdd'),
    },
  ];
  const style = {
    borderLeft: `thick solid ${colors[data.level]}`,
  };

  const arrCheckedLevel = parseStoredStringArray(
    localStorage.getItem('arrCheckedLevel')
  );

  const handleCover = () => {
    setCoverValue(!coverValue);
    addCoverBody({ cover: !coverValue, id: data.id });
  };

  useEffect(() => {
    setCoverValue(data.cover);
  }, [cover.isEdit]);
  const menuData = options.slice(0, openOptionLevel ? 2 : Infinity);

  return (
    <div
      className={`projectLevel-sub-list-item  ${
        data.isInclude && 'dropdownLevel-Include'
      } ${data?.subTasks?.length && !data.isArea && 'dropdownLevel-Subtask'}  ${
        data.isArea && 'dropdownLevel-Area'
      } ${data.isProject && 'dropdownLevel-Project'}`}
      style={style}
    >
      {cover.isEdit && (
        <IconAction
          icon={coverValue ? 'check_circle_select' : 'check_circle'}
          size={1.5}
          left={0}
          position="none"
          onClick={handleCover}
        />
      )}
      <div className="projectLevel-contain">
        <AppContextMenu
          data={menuData}
          disabled={!modAuthProject || !hasPermission(ProjectRole.MODERATOR)}
        >
          <div className={`projectLevel-section `}>
            <img src="/svg/down.svg" className="projectLevel-dropdown-arrow" />
            <input
              type="checkbox"
              className={`projectLevel-dropdown-check ${
                !modAuthProject && 'projectLevel-width-normal'
              }`}
              onChange={handleCheck}
              {...(cover.isEdit
                ? {
                    checked: data.subTasks ? false : cover.isEdit,
                  }
                : {})}
              {...(dayTask.isEdit
                ? {
                    checked: data.total > 0,
                  }
                : {})}
              defaultChecked={arrCheckedLevel.includes(String(data.id))}
            />
            {/* <div className="projectLevel-contain"> */}
            <div className="projectLevel-name-contain">
              {openOptionLevel ? (
                <form
                  onSubmit={handleSubmit(onSubmitData)}
                  className="projectLevel-form"
                >
                  <div className="projectLevel-input-name">
                    <Input
                      {...register('name', {
                        validate: { validateWhiteSpace, validateCorrectTyping },
                      })}
                      name="name"
                      placeholder={`Editar nombre del nivel`}
                      className="projectLevel-input"
                      errors={errors}
                    />
                    <figure
                      className="projectLevel-figure"
                      onClick={handleCloseEdit}
                    >
                      <img src="/svg/icon_close.svg" alt="W3Schools" />
                    </figure>
                  </div>
                  {data.userId && (
                    <DropDownSimple
                      data={modedators}
                      itemKey="id"
                      textField="name"
                      type="search"
                      name="employees"
                      deleteUser={deleteUser}
                      selector
                      defaultInput={
                        data.user?.profile.firstName +
                        '' +
                        data.user?.profile.lastName
                      }
                      className="projectLevel-employee-list"
                      placeholder="Coordinador de Area"
                      valueInput={(_name, index) => setIdCoordinator(+index)}
                    />
                  )}
                </form>
              ) : (
                <div className={`projectLevel-sub-list-name`}>
                  <span className="projectLevel-sub-list-span">
                    {data.item}
                  </span>
                  {data.name}
                  {data.userId && (
                    <h3 className="projectLevel-sub-list-coord">
                      Coordinador: {data.user?.profile.firstName}{' '}
                      {data.user?.profile.lastName}
                    </h3>
                  )}
                </div>
              )}
            </div>
            {/* </div> */}
          </div>
        </AppContextMenu>
      </div>
      {/* {modAuthProject && ( */}
      {hasPermission(ProjectRole.MODERATOR) && (
        <div className="projectLevel-contain-right">
          <MoreInfo {...{ data }} />
        </div>
      )}
      {/* )} */}
      {openOptionLevel && (
        <p className="projectLevel-option-info">
          {OPTION_LEVEL_TEXT[openOptionLevel]}:
        </p>
      )}
    </div>
  );
};
