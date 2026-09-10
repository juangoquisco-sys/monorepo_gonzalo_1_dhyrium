import {
  useContext,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FocusEvent,
} from 'react';
import RolesAndPermissionsRadio from '../rolesAndPermissionsRadio/RolesAndPermissionsRadio';
import type {
  MenuPoint,
  MenuRole,
  MenuRoleForm,
  Option,
  Roles,
} from '@/types/types';
import './roleTableRow.css';
import AppContextMenu from '@/components/appContextMenu/AppContextMenu';
import IconAction from '@/components/iconAction/IconAction';
import { axiosInstance } from '@/services/axiosInstance';
import { handleStoredPermission } from '../../utils/tools';
import { SnackbarUtilities } from '@/utils/SnackbarManager';
import type { SubMenuOptions } from '../../models/types';
import { SocketContext } from '@/context/SocketContex';
import { openDialog } from '@/utils/dialog';
import RoleDeleteConfirmation from './RoleDeleteConfirmation';

interface RoleTableRowProps {
  rol: Roles;
  roles: Roles[];
  onSave: () => void;
}

const RoleTableRow = ({ rol, roles, onSave }: RoleTableRowProps) => {
  const [openEditData, setOpenEditData] = useState<boolean>(false);
  const [subMenuOptions, setSubMenuOptions] = useState<SubMenuOptions | null>(
    null
  );
  const socket = useContext(SocketContext);
  const [role, setRole] = useState<string>(rol.name);
  const [menuPoints, setMenuPoints] = useState<MenuRoleForm[]>(rol.menuPoints);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [editMenuPoints, setEditMenuPoints] = useState<MenuPoint[]>(
    rol.menuPointsDb
  );

  const handeChangeRol = ({ target }: FocusEvent<HTMLInputElement>) =>
    setRole(target.value);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- a server refresh resets the legacy editable draft.
    setEditMenuPoints(rol.menuPointsDb);
    setMenuPoints(rol.menuPoints);
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [rol]);

  const handleEditMenuPoint = (
    { target }: ChangeEvent<HTMLInputElement>,
    menuPoint: MenuRoleForm
  ) => {
    const { value, id } = target;
    const [, menuId] = id.split('-');
    const newMenuOption = handleStoredPermission(
      value as MenuRole,
      menuPoint.storage?.menuId ?? +menuId,
      menuPoint.storage?.subMenuId,
      editMenuPoints
    );
    setEditMenuPoints(newMenuOption);
  };
  const handleEditSubMenuPoint = ({
    target,
  }: ChangeEvent<HTMLInputElement>) => {
    const { value, id } = target;
    const [, menuId, subMenuId] = id.split('-');
    const newMenuPoints = handleStoredPermission(
      value as MenuRole,
      +menuId,
      +subMenuId,
      editMenuPoints
    );
    setEditMenuPoints(newMenuPoints);
  };

  const openSubMenuOptions = (menu: MenuRoleForm | undefined) => {
    if (!menu) return;
    const data: SubMenuOptions = {
      name: menu?.title,
      menuId: menu?.id,
      menu: menu?.menu ?? [],
    };
    setSubMenuOptions(data);
  };

  const handleDeleteRole = async () => {
    try {
      const { data } = await axiosInstance.get(`/role/${rol.id}`);
      const dialogHandle: ReturnType<typeof openDialog> = openDialog({
        title: 'Confirmar eliminación de rol',
        description: 'Los usuarios afectados deben ser reasignados antes de eliminar el rol.',
        width: 'min(100%, 36rem)',
        children: (
          <RoleDeleteConfirmation
            role={data}
            roles={roles.map(({ id, name }) => ({ id, name }))}
            onSave={onSave}
            onClose={() => dialogHandle?.close()}
          />
        ),
      });
      if (!dialogHandle) {
        SnackbarUtilities.warning('No se pudo abrir la confirmación.');
      }
    } catch {
      SnackbarUtilities.error('No se pudo consultar el impacto del rol.');
    }
  };

  const handleEditMenu = () => {
    const body = {
      name: role,
      menuPoints: editMenuPoints,
    };

    if (!role)
      return SnackbarUtilities.warning('No deje el campo de rol vacio.');
    if (editMenuPoints.length === 0)
      return SnackbarUtilities.warning('Seleccion permisos para el rol.');
    axiosInstance.put(`/role/${rol.id}`, body).then(() => {
      socket.emit('client:refresh-user', rol.id);

      SnackbarUtilities.success(`Rol: "${role}" editado correctamente.`);
      setOpenEditData(false);
      setSubMenuOptions(null);
      onSave();
    });
  };

  const handlOpenEditData = () => {
    if (openEditData) {
      setRole(rol.name);
      setMenuPoints([]);
      setSubMenuOptions(null);
      setEditMenuPoints(rol.menuPointsDb);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        setMenuPoints(rol.menuPoints);
      }, 1);
    }
    setOpenEditData(!openEditData);
  };
  const dataDots: Option[] = [
    {
      name: openEditData ? 'Cancelar' : 'Editar',
      type: openEditData ? 'submit' : 'button',
      icon: openEditData ? 'close' : 'pencil',
      function: handlOpenEditData,
    },
    {
      name: openEditData ? 'Guardar' : 'Eliminar',
      type: openEditData ? 'submit' : 'button',
      icon: openEditData ? 'save' : 'trash-red',
      function: openEditData ? handleEditMenu : handleDeleteRole,
    },
  ];

  const countSubMenuAccess = (menu: MenuRoleForm[]) =>
    menu?.filter(men => men.typeRol).length;

  return (
    <AppContextMenu data={dataDots}>
      <div
        className="rolesAndPermissions-table-body"
        style={{
          gridTemplateColumns: `2fr repeat(${rol.menuPoints?.length}, 1fr)`,
        }}
      >
        {!openEditData && <div className="roleTableRow-block" />}
        {openEditData ? (
          <div className="rolesAndPermissions-table-input-contain">
            <input
              className="rolesAndPermissions-table-input"
              placeholder="Escriba el rol"
              onBlur={handeChangeRol}
              defaultValue={role}
            />
          </div>
        ) : (
          <div className="rolesAndPermissions-table-subHeader-text">
            {rol.name}
          </div>
        )}
        {menuPoints.map(menuPoint => (
          <div
            key={menuPoint.id}
            className="rolesAndPermissions-table-body-options"
          >
            {menuPoint.menu ? (
              <>
                <IconAction
                  icon="pencil-line"
                  onClick={() => openSubMenuOptions(menuPoint)}
                />
                <span>
                  {countSubMenuAccess(menuPoint.menu)} Acceso
                  {countSubMenuAccess(menuPoint.menu) > 1 && 's'}
                </span>
              </>
            ) : (
              <>
                {menuPoint.access.map(acc => (
                  <RolesAndPermissionsRadio
                    key={`${rol.id}-${menuPoint.id}-${acc}`}
                    value={acc}
                    text={acc}
                    menuPointId={`${rol.id}-${menuPoint.id}`}
                    checked={acc === menuPoint.typeRol}
                    onChange={event => handleEditMenuPoint(event, menuPoint)}
                  />
                ))}
                <RolesAndPermissionsRadio
                  value={''}
                  text={'NO'}
                  checked={!menuPoint.typeRol}
                  menuPointId={`${rol.id}-${menuPoint.id}`}
                  onChange={event => handleEditMenuPoint(event, menuPoint)}
                />
              </>
            )}
          </div>
        ))}
      </div>
      {subMenuOptions && (
        <>
          <div
            className="rolesAndPermissions-table-subHeader"
            style={{
              gridTemplateColumns: `2fr repeat(${subMenuOptions.menu.length}, 1fr)`,
            }}
          >
            <div className="rolesAndPermissions-table-header-text">-</div>
            {subMenuOptions.menu.map(menuPoint => (
              <div
                key={menuPoint.id}
                className="rolesAndPermissions-table-subHeader-text rolesAndPermissions-separator"
              >
                {menuPoint.title}
              </div>
            ))}
          </div>
          <div
            className="rolesAndPermissions-table-body"
            style={{
              gridTemplateColumns: `2fr repeat(${subMenuOptions.menu.length}, 1fr)`,
            }}
          >
            <div className="rolesAndPermissions-table-subHeader-text">
              {subMenuOptions.name}
            </div>
            {subMenuOptions.menu.map(menuPoint => (
              <div
                key={`${rol.id}-${subMenuOptions.menuId}-${menuPoint.id}`}
                className="rolesAndPermissions-table-body-options"
              >
                {menuPoint.access.map(acc => (
                  <RolesAndPermissionsRadio
                    key={acc}
                    value={acc}
                    text={acc}
                    menuPointId={`${rol.id}-${
                      menuPoint.storage?.menuId ?? subMenuOptions.menuId
                    }-${menuPoint.storage?.subMenuId ?? menuPoint.id}`}
                    checked={acc === menuPoint.typeRol}
                    onChange={handleEditSubMenuPoint}
                  />
                ))}
                <RolesAndPermissionsRadio
                  value={''}
                  text={'NO'}
                  checked={!menuPoint.typeRol}
                  menuPointId={`${rol.id}-${
                    menuPoint.storage?.menuId ?? subMenuOptions.menuId
                  }-${menuPoint.storage?.subMenuId ?? menuPoint.id}`}
                  onChange={handleEditSubMenuPoint}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </AppContextMenu>
  );
};

export default RoleTableRow;
