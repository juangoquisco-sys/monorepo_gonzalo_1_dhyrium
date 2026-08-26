import type { Group, Option } from '@/types/types';
import './groupListBar.css';
import { NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import AppContextMenu from '@/components/appContextMenu/AppContextMenu';
import GroupBtnAdd from '../groupBtnAdd/GroupBtnAdd';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { axiosInstance } from '@/services/axiosInstance';

interface GroupListBarProps {
  group: Group;
  onSave?: () => void;
  editOrder?: boolean;
  divisionId?: number;
}
const GroupListBar = ({
  group,
  onSave,
  editOrder,
  divisionId,
}: GroupListBarProps) => {
  const [edit, setEdit] = useState<boolean>(false);
  const navigation = useNavigate();

  const dataDots: Option[] = [
    {
      name: 'Editar',
      type: 'button',
      icon: 'pencil',
      function: () => setEdit(true),
    },
  ];
  const dataDotsDelete: Option[] = [
    {
      name: 'Editar',
      type: 'button',
      icon: 'pencil',
      function: () => setEdit(true),
    },
    {
      name: 'Eliminar',
      type: 'button',
      icon: 'trash-red',
      function: () => handleDeleteGroup(),
    },
  ];
  const dataDotsDivision: Option[] = [
    {
      name: 'Editar',
      type: 'button',
      icon: 'pencil',
      function: () => setEdit(true),
    },
    {
      name: 'Quitar',
      type: 'button',
      icon: 'trash-red',
      function: () => handleDeleteRelation(),
    },
  ];

  const handleDeleteRelation = () => {
    axiosInstance
      .delete(`/division/relation/${divisionId}/${group.id}`)
      .then(() => onSave?.());
  };
  const handleDeleteGroup = () => {
    axiosInstance.delete(`/groups/${group.id}`).then(() => {
      onSave?.();
      navigation('/grupos');
    });
  };

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: group.id,
    data: {
      type: 'Group',
      group,
    },
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  if (isDragging) {
    return <div ref={setNodeRef} style={style} className="gl-dragging"></div>;
  }
  const menuData = divisionId
    ? dataDotsDivision
    : group.groups.length > 0
    ? dataDots
    : dataDotsDelete;

  return (
    <AppContextMenu data={menuData} disabled={editOrder} key={group.id}>
      {!edit ? (
        <NavLink
          to={`${
            editOrder ? '' : `contenido/${group.id}/GRUPO-${group.gNumber}`
          }`}
          className={({ isActive }) =>
            `gl-sidebar-data  ${isActive && 'contract-selected'} `
          }
          ref={setNodeRef}
          style={style}
          {...attributes}
          {...listeners}
        >
          <figure className="gl-sidebar-figure">
            <img
              src="/svg/dashicons_groups.svg"
              alt="W3Schools"
              style={{ width: 18 }}
            />
          </figure>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <h4 className="gl-sidebar-name">GRUPO {group.gNumber}</h4>
            <h5 className="gl-sidebar-cui">{group.name}</h5>
          </div>
        </NavLink>
      ) : (
        <GroupBtnAdd
          setBtnActive={() => setEdit(!edit)}
          onSave={() => onSave?.()}
          groupName={group.name}
          id={group.id}
        />
      )}
    </AppContextMenu>
  );
};

export default GroupListBar;
