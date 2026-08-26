import { useEffect, useState } from 'react';
import Button from '@/components/button/Button';
import './rolesAndPermissions.css';
import { axiosInstance } from '@/services/axiosInstance';
import type { Menu, Roles } from '@/types/types';
import AddNewRol from './components/addNewRol/AddNewRol';
import RoleTableRow from './components/roleTableRow/RoleTableRow';

const RolesAndPermissions = () => {
  const [menuPoints, setMenuPoints] = useState<Menu[] | null>();

  const [roles, Roles] = useState<Roles[] | null>(null);

  const [isAddNewRole, setIsAddNewRole] = useState(false);

  const handleAddNewRole = () => setIsAddNewRole(!isAddNewRole);

  useEffect(() => {
    (async () => {
      await getMenuPoints();
      await getRoles();
    })();
  }, []);

  const getMenuPoints = async () => {
    const res = await axiosInstance.get<Menu[]>('/role/menuPoints');
    setMenuPoints(res.data);
  };
  const getRoles = async () => {
    const { data } = await axiosInstance.get<Roles[]>('/role/menusGeneral');
    Roles(data);
  };

  return (
    <div className="rolesAndPermissions">
      <div className="rolesAndPermissions-header">
        <Button
          text={`${!isAddNewRole ? 'Agregar nuevo rol' : 'Cancelar'}`}
          className="margin-none"
          icon={`${!isAddNewRole ? 'close-white' : 'minus'}`}
          imageStyle="rolesAndPermissions-icon-style"
          onClick={handleAddNewRole}
        />
      </div>
      {menuPoints && (
        <div className="rolesAndPermissions-table-contain">
          <div
            className="rolesAndPermissions-table-header"
            style={{
              gridTemplateColumns: `2fr ${menuPoints?.length}fr`,
            }}
          >
            <div className="rolesAndPermissions-table-header-text">ROL</div>
            <div className="rolesAndPermissions-table-header-text rolesAndPermissions-separator">
              PERMISOS DE ACCESOS
            </div>
          </div>
          <div
            className="rolesAndPermissions-table-subHeader"
            style={{
              gridTemplateColumns: `2fr repeat(${menuPoints?.length}, 1fr)`,
            }}
          >
            <div className="rolesAndPermissions-table-header-text">-</div>
            {menuPoints.map(menuPoint => (
              <div
                key={menuPoint.id}
                className="rolesAndPermissions-table-subHeader-text rolesAndPermissions-separator"
              >
                {menuPoint.title}
              </div>
            ))}
          </div>

          <div className="rolesAndPermissions-body-contain">
            {roles?.map(rol => (
              <RoleTableRow key={rol.id} rol={rol} onSave={getRoles} />
            ))}
          </div>
          {isAddNewRole && (
            <AddNewRol
              menuPoints={menuPoints}
              onSave={getRoles}
              handleAddNewRole={handleAddNewRole}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default RolesAndPermissions;
