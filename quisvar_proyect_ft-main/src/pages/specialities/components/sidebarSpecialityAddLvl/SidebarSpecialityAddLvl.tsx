import { useForm } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import './sidebarSpecialityAddLvl.css';
import { useEffect, useState, type MouseEvent } from 'react';
import AppContextMenu from '@/components/appContextMenu/AppContextMenu';
import Input from '@/components/Input/Input';
import Button from '@/components/button/Button';
import { axiosInstance } from '@/services/axiosInstance';
import {
  validateCorrectTyping,
  validateWhiteSpace,
} from '@/utils/customValidatesForm';
import { isOpenCardRegisteProject$ } from '@/services/sharingSubject';
import colors from '@/utils/json/colorSidebar.json';
import type { Option } from '@/types/types';

type DataForm = { name: string; cod: string };
interface SidebarSpecialityAddLvlProps {
  idValue: number;
  onSave?: () => void;
  keyNameId: 'sectorId' | 'specialitiesId' | 'typespecialityId' | 'noId';
  nameLevel?: string;
}

const urlPost = {
  sectorId: '/specialities',
  specialitiesId: '/typespecialities',
  typespecialityId: '',
  noId: '/sector',
};
const SidebarSpecialityAddLvl = ({
  onSave,
  keyNameId,
  idValue,
  nameLevel = 'Añadir Nivel',
}: SidebarSpecialityAddLvlProps) => {
  const [addLevel, setAddLevel] = useState<boolean>(false);

  useEffect(() => {
    const handleClick = () => setAddLevel(false);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);
  const {
    handleSubmit,
    register,
    reset,
    formState: { errors },
  } = useForm<DataForm>();

  const onSubmitData: SubmitHandler<DataForm> = async data => {
    const url = urlPost[keyNameId];
    const newData = { ...data, [keyNameId]: idValue };
    await axiosInstance.post(url, newData);
    setAddLevel(false);
    onSave?.();
    reset();
  };
  const optionsData: Option[] = [
    {
      name: 'Cancelar',
      type: 'button',
      icon: 'close',
      function: () => setAddLevel(!addLevel),
    },
    {
      name: 'Guardar',
      type: 'submit',
      icon: 'save',
      function: handleSubmit(onSubmitData),
    },
  ];
  const handleAddlevel = (e: MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (keyNameId === 'typespecialityId') {
      isOpenCardRegisteProject$.setSubject = {
        isOpen: true,
        typeSpecialityId: idValue,
        isDuplicate: false,
      };
      return;
    }
    setAddLevel(!addLevel);
  };
  const type =
    keyNameId === 'sectorId'
      ? 'specialities'
      : keyNameId === 'specialitiesId'
      ? 'typespecialities'
      : keyNameId === 'typespecialityId'
      ? 'projects'
      : 'sector';

  const style = {
    borderLeft: `thick solid ${colors[type]}`,
  };
  return (
    <form
      onSubmit={handleSubmit(onSubmitData)}
      className="sidebarSpecialityAddLvl"
      style={style}
    >
      {addLevel ? (
        <>
          <AppContextMenu
            data={optionsData}
            className="sidebarSpecialityAddLvl-inputs"
          >
            <div onClick={e => e.stopPropagation()}>
              <Input
                label="Nombres:"
                {...register('name', {
                  validate: { validateWhiteSpace, validateCorrectTyping },
                })}
                name="name"
                className="sidebarSpecialityAddLvl-input"
                errors={errors}
              />
              {keyNameId === 'sectorId' && (
                <Input
                  label="Nombre Corto:"
                  {...register('cod', {
                    validate: { validateWhiteSpace, validateCorrectTyping },
                  })}
                  name="cod"
                  className="sidebarSpecialityAddLvl-input"
                  errors={errors}
                />
              )}
            </div>
          </AppContextMenu>
        </>
      ) : (
        <div
          className="sidebarSpecialityAddLvl-add-content"
          onClick={handleAddlevel}
        >
          <span className="sidebarSpecialityAddLvl-add-span">{nameLevel}</span>
          <Button
            type="button"
            icon={'plus'}
            iconSize={0.5}
            variant="ghost"
            whileHover={{ rotate: 90 }}
            whileTap={{ scale: 1.1 }}
          />
        </div>
      )}
      <input type="submit" className="sidebarSpecialityAddLvl-display-none" />
    </form>
  );
};

export default SidebarSpecialityAddLvl;
