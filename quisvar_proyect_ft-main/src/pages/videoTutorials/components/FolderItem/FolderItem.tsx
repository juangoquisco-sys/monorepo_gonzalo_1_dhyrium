import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LuChevronDown,
  LuChevronRight,
  LuFolder,
  LuFolderOpen,
  LuFolderPlus,
} from 'react-icons/lu';
import AppContextMenu from '@/components/appContextMenu/AppContextMenu';
import type { Option } from '@/types/types';
import { axiosInstance } from '@/services/axiosInstance';
import { isOpenAlertConfirm$ } from '@/services/sharingSubject';
import { countFolderVideos } from '../../utils/countFolderVideos';
import FolderAddInput from '../FolderAddInput/FolderAddInput';
import './folderItem.css';
import type { Folder } from '../../types/type.res';

interface FolderProps {
  onSave: () => void;
  folder: Folder;
  canManage: boolean;
  level?: number;
}

const FolderItem = ({ folder, canManage, level = 0, onSave }: FolderProps) => {
  const [showInput, setShowInput] = useState(false);
  const [showItems, setShowItems] = useState(false);
  const [edit, setEdit] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const paddingLeft = level * 12;
  const hasChildren = folder.children.length > 0;
  const directVideos = folder._count?.videos || 0;
  const totalVideos = countFolderVideos(folder);
  const hasVideos = totalVideos > 0;
  const canDelete = !hasChildren && !hasVideos;
  // La regla de subcategorias depende solo de videos directos:
  // permite crear ramas hermanas aunque una subcarpeta descendiente ya tenga videos.
  const canAddSubcategory = directVideos === 0;

  const deleteFolder = async () => {
    setIsDeleting(true);
    try {
      await axiosInstance.delete(`folderVideos/${folder.id}`, {
        headers: { noLoader: true },
      });
      onSave();
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmDelete = () => {
    isOpenAlertConfirm$.setSubject = {
      isOpen: true,
      variant: 'danger',
      title: 'Eliminar carpeta',
      description:
        'Esta accion quitara la carpeta de la biblioteca de tutoriales.',
      summaryItems: [{ label: 'Carpeta', value: folder.name }],
      warningText: 'Esta accion no se puede deshacer.',
      confirmText: 'Eliminar carpeta',
      cancelText: 'Cancelar',
      onConfirm: deleteFolder,
    };
  };

  const menuData: Option[] = [
    {
      name: 'Editar',
      type: 'button',
      icon: 'pencil',
      function: () => setEdit(true),
    },
    ...(canDelete
      ? [
          {
            name: 'Eliminar',
            type: 'button',
            icon: 'trash-red',
            function: confirmDelete,
          } as Option,
        ]
      : []),
  ];

  const renderLabelContent = (isActive = false) => (
    <>
      {hasChildren ? (
        showItems ? (
          <LuChevronDown
            className="fi-icon fi-icon--chevron"
            aria-hidden="true"
          />
        ) : (
          <LuChevronRight
            className="fi-icon fi-icon--chevron"
            aria-hidden="true"
          />
        )
      ) : (
        <span className="fi-branch" aria-hidden="true" />
      )}
      {isActive || showItems ? (
        <LuFolderOpen className="fi-icon" aria-hidden="true" />
      ) : (
        <LuFolder className="fi-icon" aria-hidden="true" />
      )}
      {edit ? (
        <FolderAddInput
          onSave={onSave}
          setBtnActive={() => setEdit(false)}
          id={folder.id}
          nameEdit={folder.name}
        />
      ) : (
        <>
          <span className="fi-name">{folder.name}</span>
          <span className="fi-count" aria-label={`${totalVideos} videos`}>
            {totalVideos}
          </span>
        </>
      )}
    </>
  );

  return (
    <div style={{ paddingLeft: `${paddingLeft}px` }} className="fi-main">
      <div className="fi-container">
        <AppContextMenu
          data={canManage ? menuData : []}
          disabled={!canManage || isDeleting}
          key={folder.id}
        >
          {hasChildren ? (
            <button
              type="button"
              className="fi-row fi-row--button"
              onClick={() => !edit && setShowItems(prev => !prev)}
              aria-expanded={showItems}
              aria-label={`${showItems ? 'Contraer' : 'Expandir'} ${
                folder.name
              }`}
            >
              {renderLabelContent()}
            </button>
          ) : (
            <NavLink
              to={`list/${folder.id}/${folder.name}`}
              className={({ isActive }) =>
                `fi-row fi-row--link ${isActive ? 'fi-row--active' : ''}`
              }
            >
              {({ isActive }) => renderLabelContent(isActive)}
            </NavLink>
          )}
        </AppContextMenu>

        {showItems &&
          folder.children.map(child => (
            <FolderItem
              key={child.id}
              folder={child}
              canManage={canManage}
              level={level + 1}
              onSave={onSave}
            />
          ))}
      </div>

      {showItems &&
        canManage &&
        canAddSubcategory &&
        (!showInput ? (
          <button
            type="button"
            style={{ marginLeft: `${paddingLeft + 12}px` }}
            className="fi-add-subcategory"
            onClick={() => setShowInput(true)}
          >
            <LuFolderPlus aria-hidden="true" />
            Agregar subcategoria
          </button>
        ) : (
          <FolderAddInput
            onSave={onSave}
            setBtnActive={() => setShowInput(!showInput)}
            id={folder.id}
          />
        ))}
    </div>
  );
};

export default FolderItem;
