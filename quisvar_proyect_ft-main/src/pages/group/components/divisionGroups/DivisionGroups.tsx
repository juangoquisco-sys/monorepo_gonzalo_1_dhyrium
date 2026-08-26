import { useCallback, useEffect, useState, type FocusEvent } from 'react';
import './divisionGroups.css';
import type { Division } from '../../types/types.request';
import type { GroupSeletRes } from '../../types/types.response';
import { axiosInstance } from '@/services/axiosInstance';
import DivisionAddInput from '../divisionAddInput/DivisionAddInput';
import AppContextMenu from '@/components/appContextMenu/AppContextMenu';
import LoaderForComponent from '@/components/loaderForComponent/LoaderForComponent';
import Select from '@/components/select/Select';
import GroupListBar from '../groupListBar/GroupListBar';
import { useForm } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import { validateWhiteSpace } from '@/utils/customValidatesForm';
import { FaChevronRight, FaChevronDown } from 'react-icons/fa';
import type { Option } from '@/types/types';
import { BsFillFilterSquareFill } from 'react-icons/bs';
import { useNavigate } from 'react-router-dom';
interface FormProps {
  id: string;
}
const DivisionGroups = () => {
  const [loader, setLoader] = useState<boolean>(false);
  const [openAddGroup, setOpenAddGroup] = useState<boolean>(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [data, setData] = useState<Division[]>();
  const [selection, setSelection] = useState<GroupSeletRes[]>();
  const [viewGroupId, setViewGroupId] = useState<number | null>(null);
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    // setValue,
    reset,
    // watch,
    // control,
    formState: { errors },
  } = useForm<FormProps>();
  const getDivision = useCallback(() => {
    setLoader(true);
    axiosInstance
      .get<Division[]>('/division', {
        headers: {
          noLoader: true,
        },
      })
      .then(res => {
        setData(res.data);
        setLoader(false);
      });
  }, []);
  const dataSelect = useCallback(() => {
    axiosInstance
      .get<GroupSeletRes[]>('/groups/select', {
        headers: {
          noLoader: true,
        },
      })
      .then(res => {
        setSelection(res.data);
      });
  }, []);

  useEffect(() => {
    getDivision();
    dataSelect();
  }, []);
  const onSubmitData: SubmitHandler<FormProps> = ({ id }) => {
    axiosInstance.patch(`/division/relation/${viewGroupId}/${id}`).then(() => {
      setOpenAddGroup(false);
      reset({});
      getDivision();
    });
  };
  const handleHideForm = () => {
    setOpenAddGroup(false);
    reset({});
  };

  const deleteDivision = (id: number) => {
    axiosInstance.delete(`/division/${id}`).then(() => {
      getDivision();
    });
  };
  const changDivisionName = (
    e: FocusEvent<HTMLInputElement | HTMLTextAreaElement>,
    id: number
  ) => {
    const { value } = e.target;
    axiosInstance
      .patch(
        `/division/${id}`,
        { name: value },
        {
          headers: {
            noLoader: true,
          },
        }
      )
      .then(() => {
        getDivision();
      });
    setEditId(null);
  };
  if (loader) {
    return <LoaderForComponent />;
  }
  return (
    <div className="dg-main">
      {data &&
        data.map(division => {
          const dataDots: Option[] = [
            {
              name: 'Editar',
              type: 'button',
              icon: 'pencil',
              function: () => setEditId(division.id),
            },
            {
              name: 'Eliminar',
              type: 'button',
              icon: 'trash-red',
              function: () => deleteDivision(division.id),
            },
          ];
          return (
            <div className="dg-division" key={division.id}>
              <AppContextMenu data={dataDots} key={division.id}>
                <span
                  className="dg-name"
                  onClick={() =>
                    setViewGroupId(
                      division.id === viewGroupId ? null : division.id
                    )
                  }
                >
                  {division.id === viewGroupId ? (
                    <FaChevronDown size={12} />
                  ) : (
                    <FaChevronRight size={12} />
                  )}
                  {editId === division.id ? (
                    <input
                      type="text"
                      defaultValue={division.name}
                      onBlur={e => {
                        if (e.target.value === division.name) {
                          setEditId(null);
                          return;
                        }
                        changDivisionName(e, division.id);
                      }}
                    />
                  ) : (
                    <div className="dg-icon-leader">
                      <h1 className="dg-text">{division.name}</h1>
                      <button
                        className="dg-button-leader"
                        onClick={e => {
                          e.stopPropagation();
                          navigate(`/grupos/oficina/${division.id}`);
                        }}
                      >
                        <BsFillFilterSquareFill />
                      </button>
                    </div>
                  )}
                </span>
              </AppContextMenu>
              {division.groups && viewGroupId === division.id && (
                <div className="dg-list-area">
                  {division.groups.map(group => (
                    <GroupListBar
                      group={group}
                      key={group.id}
                      onSave={getDivision}
                      divisionId={division.id}
                    />
                  ))}
                  {!openAddGroup ? (
                    <div
                      onClick={() => setOpenAddGroup(true)}
                      className="dg-add-group-area"
                    >
                      <img
                        src="/svg/plus.svg"
                        alt=""
                        style={{ width: '12px' }}
                      />
                      <h3>Añadir grupo</h3>
                    </div>
                  ) : (
                    <form
                      onSubmit={handleSubmit(onSubmitData)}
                      className="gr-select"
                    >
                      <Select
                        {...register('id', {
                          validate: { validateWhiteSpace },
                        })}
                        name="id"
                        data={selection}
                        extractValue={({ id }) => id}
                        renderTextField={({ name }) => name}
                        errors={errors}
                        className="projectAddLevel-select"
                      />
                      <figure
                        className="projectAddLevel-figure"
                        onClick={handleSubmit(onSubmitData)}
                      >
                        <img src="/svg/icon_save.svg" alt="W3Schools" />
                      </figure>
                      <figure
                        className="projectAddLevel-figure"
                        onClick={handleHideForm}
                      >
                        <img src="/svg/icon_close.svg" alt="W3Schools" />
                      </figure>
                    </form>
                  )}
                </div>
              )}
            </div>
          );
        })}
      <DivisionAddInput onSave={getDivision} route="division" />
    </div>
  );
};

export default DivisionGroups;
